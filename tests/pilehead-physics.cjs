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
function stage(reduced=false,mode=null){
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
  remove(){this.isConnected=false;movements.push({kind:'remove',where:this.name,clazz:this.className})}
  animate(frames,options){movements.push({kind:'animate',where:this.name,clazz:this.className,frames,options,
   origin:{left:this.style.left,top:this.style.top}});return{onfinish:null,oncancel:null}}
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
 const tapped=new ElementMock('tapped-card',16,500,80,112);
 const selectors={
  '[data-play-target]':pile,'[data-play-target] .pile-card':pile,
  '.table-center .stack:first-child .pile-card':stock,
  '.table-center .stack:last-child .pile-card':ashes,
  '.hand-area .card-row.hand':hand,'.hand-area':handArea,
  '.opponents':opponents,'.zone.your-up .card-row':up,
  '.opponent[data-seat="1"]':opponent,
  '.opponent[data-seat="1"] .held-cards':opponentHand,
  '.opponent[data-seat="1"] .mini-cards':opponentUp,
  '[data-card="12"]':tapped
 };
 table.querySelector=s=>selectors[s]||null;
 opponent.querySelector=s=>s==='.held-cards'?opponentHand:s==='.mini-cards'?opponentUp:null;
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
  window,document,Element:ElementMock,localStorage:{getItem:key=>key==='pilehead-table-motion-v1'?mode:null},
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
 return{sync:window.PileheadTableFX.sync,captureMove:window.PileheadTableFX.captureMove,movements,flush};
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
check('exact tapped card is the flight origin, not the center of the hand rail',()=>{
 const s=stage();
 s.sync({gameKey:'round-T',identity:'round-T:0',moveNo:0,ownSeat:0,events:[]});
 s.captureMove({gameKey:'round-T',seat:0,moveNo:1,move:{type:'play',source:'hand',ids:[12]}});
 s.sync({gameKey:'round-T',identity:'round-T:1',moveNo:1,ownSeat:0,
  events:[{type:'play',seat:0,source:'hand',count:1,rank:7,move:1}]});
 const thrown=s.movements.find(x=>x.kind==='animate'&&x.clazz.includes('ph-number'));
 assert.ok(thrown,'The selected card should animate from its touched location');
 assert.ok(Number.parseFloat(thrown.origin.left)<50,'The flight must originate beside the touched card');
});
check('same revision cannot animate the same event twice',()=>{
 const s=stage();
 s.sync({gameKey:'round-X',identity:'round-X:0',moveNo:0,ownSeat:0,events:[]});
 const event={type:'play',seat:0,source:'hand',count:1,rank:7,move:1};
 s.sync({gameKey:'round-X',identity:'round-X:1',moveNo:1,ownSeat:0,events:[event]});
 const before=s.movements.filter(x=>x.kind==='animate').length;
 s.sync({gameKey:'round-X',identity:'round-X:1',moveNo:1,ownSeat:0,events:[event]});
 assert.equal(s.movements.filter(x=>x.kind==='animate').length,before);
});
check('motion presets support quick and off without breaking gameplay',()=>{
 const full=stage(),quick=stage(false,'quick'),off=stage(false,'off');
 for(const s of [full,quick,off])s.sync({gameKey:'round-Q',identity:'round-Q:0',moveNo:0,ownSeat:0,events:[]});
 const fullAnim=full.movements.find(x=>x.kind==='animate');
 const quickAnim=quick.movements.find(x=>x.kind==='animate');
 assert.ok(fullAnim&&quickAnim);
 assert.ok(quickAnim.options.duration<fullAnim.options.duration);
 assert.equal(off.movements.filter(x=>x.kind==='animate').length,0);
});
check('new round cancels stale flight and burn callbacks',()=>{
 const s=stage();
 s.sync({gameKey:'old',identity:'old:0',moveNo:0,ownSeat:0,events:[]});
 s.sync({gameKey:'old',identity:'old:1',moveNo:1,ownSeat:0,
  events:[{type:'play',seat:0,source:'hand',count:1,rank:6,burned:true,burnedCount:8,move:1}]});
 s.sync({gameKey:'new',identity:'new:0',moveNo:0,ownSeat:0,events:[]});
 const before=s.movements.filter(x=>x.kind==='animate').length;
 s.flush();
 assert.equal(s.movements.filter(x=>x.kind==='animate').length,before,
  'A finished room must not play delayed effects from the prior game');
});
check('SKIP reports its public target seat for a visible skipped turn',()=>{
 const g=engine.create({players:2,seed:45});
 engine.start(g);
 const all=[g.stock,g.pile,g.ashes,...g.people.flatMap(p=>[p.hand,p.up,p.down])];
 const source=all.find(a=>a.some(c=>c.action==='skip'));
 assert.ok(source);
 const idx=source.findIndex(c=>c.action==='skip');
 const hand=g.people[0].hand;
 const swapped=hand[0];hand[0]=source[idx];source[idx]=swapped;
 const ev=engine.move(g,0,{type:'play',source:'hand',ids:[hand[0].id]});
 assert.equal(ev.target,1);
 assert.equal(g.turn,0);
 engine.invariant(g);
});
check('turn focus moves to the next player only after the card flight',()=>{
 const s=stage();
 s.sync({gameKey:'turn-A',identity:'turn-A:0',moveNo:0,ownSeat:0,events:[]});
 s.sync({gameKey:'turn-A',identity:'turn-A:1',moveNo:1,ownSeat:0,turn:1,
  events:[{type:'play',seat:0,source:'hand',rank:8,count:1,move:1}]});
 const before=s.movements.filter(x=>x.kind==='animate'&&x.where==='opponent-hand').length;
 assert.equal(before,0,'Do not announce the next turn while the throw is airborne');
 s.flush();
 const after=s.movements.filter(x=>x.kind==='animate'&&x.where==='opponent-hand').length;
 assert.ok(after>before,'The next player should be highlighted after the throw resolves');
});
console.log('PILEHEAD physical motion: '+checks+' groups passed');
