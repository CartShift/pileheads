'use strict';
/* Browser-free physical-motion regression, including batched multiplayer moves.
   Uses a deliberately small fake DOM; rendered-device QA remains separate. */
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const fx=read('dist/pilehead/immersive.js');
const engine=require('../dist/pilehead/engine.js');
const api=read('api/pilehead.js');
let checks=0;
function check(label,fn){fn();checks++;console.log('PASS '+label)}
check('engine emits public move position and number of burned cards',()=>{
 const g=engine.create({players:2,seed:17});
 engine.start(g);
 const move=engine.options(g,0).find(x=>x.type==='play');
 assert.ok(move);
 const ev=engine.move(g,0,move);
 assert.equal(ev.move,g.moves);
 assert.ok(['hand','up','down'].includes(ev.source));
 assert.equal(typeof ev.burnedCount,'number');
 assert.match(api,/events:g\.events\.slice\(-24\)\.map\(\(\{type,seat,source,/);
 assert.doesNotMatch(api,/events:g\.events\.slice\(-24\)\.map\(\(\{[^}]*\bhand\b/);
});
function stage(reduced=false){
 const movements=[],timers=[];
 class ElementMock{
  constructor(name,x=0,y=0,w=200,h=100){
   this.name=name;this.rect={left:x,top:y,width:w,height:h};
   this.className='';this.dataset={};this.style={setProperty(){}};
   this.offsetWidth=w;this.clientWidth=w;this.scrollWidth=w;this.scrollLeft=0;
   this.isConnected=true;
   this.classList={contains(){return false},toggle(){},add(){},remove(){}};
  }
  getBoundingClientRect(){return this.rect}
  querySelector(){return null}
  querySelectorAll(){return []}
  closest(selector){return selector==='.hand-area'?handArea:null}
  setAttribute(){}
  appendChild(element){movements.push({kind:'append',where:this.name,clazz:element.className});return element}
  remove(){this.isConnected=false}
  animate(frames,options){movements.push({kind:'animate',where:this.name,clazz:this.className,frames,options});return{onfinish:null,oncancel:null}}
 }
 const table=new ElementMock('table',0,0,390,680);
 const handArea=new ElementMock('hand-area',0,470,390,180);
 const hand=new ElementMock('hand',100,520,180,90);
 const opponents=new ElementMock('opponents',50,20,290,115);
 const opponent=new ElementMock('opponent',100,25,190,75);
 const up=new ElementMock('face-up',105,390,180,55);
 const stock=new ElementMock('stock',50,250,80,90);
 const pile=new ElementMock('pile',160,235,90,110);
 const ashes=new ElementMock('ashes',280,260,70,90);
 const opponentHand=new ElementMock('opponent-hand',120,35,150,40);
 const opponentUp=new ElementMock('opponent-up',120,70,150,35);
 const selectors={
  '[data-play-target]':pile,'[data-play-target] .pile-card':pile,
  '.table-center .stack:first-child .pile-card':stock,
  '.table-center .stack:last-child .pile-card':ashes,
  '.hand-area .card-row.hand':hand,'.hand-area':handArea,
  '.opponents':opponents,'.zone.your-up .card-row':up,
  '.opponent[data-seat="1"]':opponent,
  '.opponent[data-seat="1"] .held-cards':opponentHand,
  '.opponent[data-seat="1"] .mini-cards':opponentUp
 };
 table.querySelector=s=>selectors[s]||null;
 table.querySelectorAll=s=>s==='.opponent[data-seat]'?[opponent]:[];
 opponents.querySelectorAll=()=>[opponent];
 hand.querySelectorAll=()=>[];
 handArea.querySelectorAll=()=>[];
 const document={
  visibilityState:'visible',body:new ElementMock('body',0,0,390,840),
  querySelector:s=>s==='#app .table'?table:null,
  createElement:()=>new ElementMock('ghost'),addEventListener(){}
 };
 const window={
  innerWidth:390,addEventListener(){},
  PileheadCardArt:{back:()=>'<svg>back</svg>',face:()=>'<svg>face</svg>',rules:{dump:true,burn:true}}
 };
 const sandbox={
  window,document,Element:ElementMock,localStorage:{getItem:()=>null},
  matchMedia:()=>({matches:reduced}),
  setTimeout:(fn,ms)=>{timers.push({fn,ms})},clearTimeout(){},console
 };
 new vm.Script(fx,{filename:'immersive.js'}).runInNewContext(sandbox);
 function flush(){
  let cycles=0;while(timers.length&&cycles++<250){
   timers.sort((a,b)=>a.ms-b.ms);
   timers.shift().fn();
  }
  assert.ok(cycles<250,'Motion queue must terminate, not recurse forever');
 }
 return{sync:window.PileheadTableFX.sync,movements,flush};
}
check('first deal travels from the deck to the human hand and opponent seat',()=>{
 const s=stage();
 s.sync({gameKey:'round-A',identity:'round-A:0',moveNo:0,ownSeat:0,events:[]});
 const cards=s.movements.filter(x=>x.kind==='animate');
 assert.ok(cards.length>=5);
 assert.ok(cards.every(x=>x.clazz.includes('ph-back')));
});
check('batched place, draw, pickup and DUMP animate sequentially',()=>{
 const s=stage();
 s.sync({gameKey:'round-A',identity:'round-A:0',moveNo:0,ownSeat:0,events:[]});
 const events=[
  {type:'play',seat:0,source:'hand',count:2,rank:6,drawnCount:1,move:1},
  {type:'take',seat:1,count:8,move:2},
  {type:'play',seat:0,source:'hand',count:1,action:'dump',target:1,takenCount:6,move:3}
 ];
 s.sync({gameKey:'round-A',identity:'round-A:3',moveNo:3,ownSeat:0,events,turn:0});
 s.flush();
 const animations=s.movements.filter(x=>x.kind==='animate');
 assert.ok(animations.length>=19,'Expect the dealt cards, throw, draw, pickups and dump');
 assert.ok(animations.some(x=>x.clazz.includes('ph-number')));
 assert.ok(animations.some(x=>x.clazz.includes('ph-action')));
 assert.ok(s.movements.some(x=>x.clazz.includes('impact-particles')));
 assert.ok(animations.some(x=>x.frames.length===3&&x.frames[1].offset===.57),'DUMP should pass over the pile');
});
check('reduced-motion settings suppress all card and particle animations',()=>{
 const s=stage(true);
 s.sync({gameKey:'round-B',identity:'round-B:0',moveNo:0,ownSeat:0,events:[]});
 s.sync({gameKey:'round-B',identity:'round-B:1',moveNo:1,ownSeat:0,
  events:[{type:'play',seat:0,source:'hand',count:1,rank:7,move:1}]});
 s.flush();
 assert.equal(s.movements.filter(x=>x.kind==='animate').length,0);
});
console.log('PILEHEAD physical motion: '+checks+' groups passed');
