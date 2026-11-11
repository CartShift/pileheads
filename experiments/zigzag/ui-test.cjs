'use strict';
const assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const E=require('./engine.js');
const app=fs.readFileSync(path.join(__dirname,'app.js'),'utf8');
const html=fs.readFileSync(path.join(__dirname,'index.html'),'utf8');
const needed=['turn','opponentHand','opponentName','other','stock','deckVisual','discard','discardCount',
 'pile','pileMat','condition','ruleTip','message','handTitle','handHint','hand','chainControls',
 'endTurn','changeCard','take','takeButton','done','opponents','botStyle','seed','soundEnabled',
 'newGame','export','cover','coverTitle','reveal'];
for(const id of needed)assert.match(html,new RegExp('id="'+id+'"'),'Missing '+id);
let checks=0;
function test(name,fn){fn();checks++;console.log('PASS '+name)}
function mount(seed=20261111,store=new Map(),hotseat=false,fresh=true){
 const els=new Map(),tasks=[];
 function elem(id){
  if(!els.has(id)){
   const data={id,innerHTML:'',textContent:'',hidden:false,value:id==='opponents'?(hotseat?'hotseat':'bot'):
     id==='botStyle'?'strategic':String(seed),checked:false,disabled:false,
    onclick:null,onchange:null,style:{display:'none'},
    classList:{add(){},remove(){},toggle(){}},
    setAttribute(){},addEventListener(type,fn){this.events[type]=fn},events:{},
    querySelector(){return null},getBoundingClientRect(){return null}};
   els.set(id,data);
  }
  return els.get(id);
 }
 const ctx=vm.createContext({
  ZigzagLab:E,document:{getElementById:elem,querySelectorAll:()=>[],createElement:()=>({style:{},click(){}}),
   body:{appendChild(){}}},
  window:{matchMedia:()=>({matches:true})},location:{search:(fresh?'?new=1&seed=':'?seed=')+seed},URLSearchParams,
  localStorage:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v)},
  setTimeout:fn=>{tasks.push(fn);return tasks.length},clearTimeout(){},Date,
  URL:{createObjectURL:()=> 'blob:fake',revokeObjectURL(){}},Blob:class{},
  console,alert:msg=>{throw Error('Unexpected alert '+msg)}
 });
 vm.runInContext(app,ctx,{filename:'app.js'});
 function saved(){return JSON.parse(store.get('tilt-zigzag-core-v01'))}
 function tap(i){
  const card={dataset:{index:String(i)},disabled:false,getBoundingClientRect:()=>null};
  elem('hand').onclick({target:{closest:s=>s==='[data-index]'?card:null}});
 }
 function drain(){
  let count=0;while(tasks.length&&count++<10)tasks.shift()();
  assert.ok(count<10,'Unbounded bot loop');
 }
 return{elem,saved,tap,drain,tasks,store};
}
function seedWith(predicate){
 for(let seed=20261111;seed<20261500;seed++){
  const g=E.create({seed}),opts=E.legal(g,0);
  const result=predicate(opts,g);
  if(result!==undefined)return{seed,...result};
 }
 throw Error('Could not find seeded UI fixture');
}
test('First-time table shows concealed opponent, four-card hand and 24-card stock',()=>{
 const a=mount();
 assert.equal(a.saved().game.stock.length,24);
 assert.equal(a.saved().game.people[0].hand.length,4);
 assert.equal(a.elem('stock').textContent,'24 left');
 assert.match(a.elem('opponentHand').innerHTML,/back-card/);
 assert.doesNotMatch(a.elem('opponentHand').innerHTML,/data-index|aria-label="Number/);
 assert.equal(a.elem('chainControls').hidden,true);
 assert.match(a.elem('hand').innerHTML,/data-index/);
 assert.equal(a.store.has('one-card-one-rule-v01'),false);
});
test('First card with a valid Zigzag previews, second commits one actual turn',()=>{
 const {seed,first,second}=seedWith(moves=>{
  const candidate=moves.find(m=>m.indices?.length===2);
  return candidate?{first:candidate.indices[0],second:candidate.indices[1]}:undefined;
 });
 const a=mount(seed),initial=a.saved().game;
 a.tap(first);
 assert.equal(a.saved().game.turn,0,'First tap is a preview until continuation resolved');
 assert.equal(a.elem('chainControls').hidden,false);
 assert.match(a.elem('ruleTip').textContent,/OPTIONAL second/);
 assert.match(a.elem('pile').innerHTML,/preview/);
 a.tap(second);
 const g=a.saved().game;
 assert.equal(g.turn,1);assert.equal(g.log[0].cards.length,2);
 assert.equal(g.log[0].action,'play');assert.equal(E.count(g),48);
 assert.doesNotMatch(a.elem('message').textContent,/Cannot make that move/i);
 assert.equal(a.elem('chainControls').hidden,true);
 a.drain();
 assert.equal(a.saved().game.turn,2,'Bot should respond exactly once after completed Zigzag');
 assert.equal(E.count(a.saved().game),48);
});
test('Player can stop after first card even when a longer run is available',()=>{
 const {seed,first}=seedWith(moves=>{
  const c=moves.find(m=>m.indices?.length===2);
  return c?{first:c.indices[0]}:undefined;
 });
 const a=mount(seed);
 a.tap(first);
 assert.equal(a.saved().game.turn,0);
 a.elem('endTurn').onclick();
 const g=a.saved().game;
 assert.equal(g.turn,1);assert.equal(g.log[0].cards.length,1);
 assert.equal(E.count(g),48);
});
test('Change first card cancels preview without changing any game state',()=>{
 const {seed,first}=seedWith(moves=>{
  const c=moves.find(m=>m.indices?.length===2);
  return c?{first:c.indices[0]}:undefined;
 });
 const a=mount(seed),before=JSON.stringify(a.saved().game);
 a.tap(first);assert.equal(a.elem('chainControls').hidden,false);
 a.elem('changeCard').onclick();
 assert.equal(JSON.stringify(a.saved().game),before);
 assert.equal(a.elem('chainControls').hidden,true);
});
test('A first card with no second option commits instantly',()=>{
 const {seed,first}=seedWith(moves=>{
  const singles=moves.filter(m=>m.indices?.length===1);
  const one=singles.find(m=>!moves.some(n=>n.indices?.length===2&&n.indices[0]===m.indices[0]));
  return one?{first:one.indices[0]}:undefined;
 });
 const a=mount(seed);a.tap(first);
 assert.equal(a.saved().game.turn,1);
 assert.equal(a.saved().game.log[0].cards.length,1);
 assert.equal(a.elem('chainControls').hidden,true);
});
test('Preview is ephemeral and saved progress remains the uncommitted original turn',()=>{
 const {seed,first}=seedWith(moves=>{
  const c=moves.find(m=>m.indices?.length===2);
  return c?{first:c.indices[0]}:undefined;
 });
 const a=mount(seed),before=a.saved().game;
 a.tap(first);
 assert.equal(a.saved().game.turn,before.turn);
 // Recreate the app in a new context using saved game, not ?new=1.
 const saved=new Map(a.store);
 const b=mount(seed,saved,false,false);
 assert.equal(b.saved().game.turn,0);
 assert.equal(b.elem('chainControls').hidden,true);
});
test('Hotseat hides both hands on handoff and allows private reveal',()=>{
 const a=mount(20261122,new Map(),true);
 a.elem('opponents').value='hotseat';
 a.elem('newGame').onclick();
 assert.equal(a.elem('cover').style.display,'flex');
 assert.doesNotMatch(a.elem('hand').innerHTML,/data-index/);
 a.elem('reveal').onclick();
 assert.match(a.elem('hand').innerHTML,/data-index/);
 const g=a.saved().game,first=E.legal(g,E.active(g)).find(x=>x.indices?.length===1);
 // Force one-card completion, even if a second is available.
 a.tap(first.indices[0]);
 if(a.elem('chainControls').hidden===false)a.elem('endTurn').onclick();
 assert.equal(a.saved().game.turn,1);
 assert.equal(a.elem('cover').style.display,'flex');
 assert.doesNotMatch(a.elem('hand').innerHTML,/data-index/);
});
test('New matches, bot modes and local save key do not alter baseline ONE',()=>{
 const a=mount();
 a.elem('seed').value='999';
 a.elem('botStyle').value='greedy';
 a.elem('newGame').onclick();
 assert.equal(a.saved().game.seed,999);
 assert.equal(a.saved().botStyle,'greedy');
 assert.equal(a.saved().game.turn,0);
 assert.equal(a.store.has('one-card-one-rule-quick-v01'),false);
});
console.log(JSON.stringify({pass:true,checks}));
