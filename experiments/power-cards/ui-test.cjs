'use strict';
const assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const E=require('./engine.js');
const app=fs.readFileSync(path.join(__dirname,'app.js'),'utf8');
const html=fs.readFileSync(path.join(__dirname,'index.html'),'utf8');
for(const id of [
 'turn','opponentHand','opponentName','other','stock','deckVisual','discard','discardCount',
 'pile','pileMat','condition','ruleTip','message','handTitle','handHint','hand','take','takeButton',
 'takeExplain','done','opponents','botStyle','seed','soundEnabled','newGame','export','cover',
 'coverTitle','reveal','modeTitle','plainLink','jokerLink','matchLink','jokerWarning',
 'jokerWarningTitle','jokerWarningBody'
])assert.match(html,new RegExp('id="'+id+'"'),'Missing '+id);
let checks=0;
function check(label,fn){fn();checks++;console.log('PASS '+label)}
function mount(mode='match',seed=20261111,store=new Map(),fresh=true){
 const els=new Map(),timers=[];
 function el(id){
  if(!els.has(id)){
   const attrs={};
   els.set(id,{id,attrs,value:id==='opponents'?'bot':id==='botStyle'?'timing':String(seed),
    innerHTML:'',textContent:'',hidden:false,checked:false,disabled:false,style:{display:'none'},
    onclick:null,onchange:null,events:{},
    setAttribute(name,v){attrs[name]=v},
    addEventListener(type,cb){this.events[type]=cb},
    getBoundingClientRect(){return{x:0,y:0,left:0,top:0,width:70,height:100}},
    classList:{add(){},remove(){},toggle(){}},
    querySelector(){return null}
   });
  }
  return els.get(id);
 }
 const query='?rule='+mode+(fresh?'&new=1&seed='+seed:'');
 const ctx=vm.createContext({
  PowerLab:E,document:{getElementById:el,querySelectorAll:()=>[],body:{appendChild(){}},
   createElement:()=>({style:{},click(){},remove(){}})},
  window:{matchMedia:()=>({matches:true})},location:{search:query},URLSearchParams,
  localStorage:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v)},
  setTimeout:fn=>{timers.push(fn);return timers.length},clearTimeout(){},
  Date,URL:{createObjectURL:()=> 'blob:fake',revokeObjectURL(){}},Blob:class{},
  console,alert:msg=>{throw Error('Unexpected alert '+msg)}
 });
 vm.runInContext(app,ctx,{filename:'app.js'});
 function saved(){return JSON.parse(store.get('tilt-joker-lab-'+mode+'-v01'))}
 function tap(index){
  const card={dataset:{index:String(index)},disabled:false,
   getBoundingClientRect(){return{x:0,y:0,left:0,top:0,width:70,height:100}}};
  el('hand').onclick({target:{closest:s=>s==='[data-index]'?card:null}});
 }
 function drain(limit=12){
  let n=0;while(timers.length&&n++<limit)timers.shift()();
  assert.ok(n<limit,'Bot loop did not terminate');
 }
 return{el,store,saved,tap,drain,timers};
}
function replaceInHand(g,seat,index,predicate){
 const i=g.stock.findIndex(predicate);
 if(i<0)throw Error('Fixture card unavailable');
 const old=g.people[seat].hand[index];
 g.people[seat].hand[index]=g.stock[i];g.stock[i]=old;
 return g.people[seat].hand[index];
}
function fixture(mode='match',defend=true){
 for(let seed=100;seed<500;seed++){
  const g=E.create({seed,mode,firstSeat:1});
  const hasJoker=g.stock.filter(c=>c.kind==='joker').length>=(mode==='joker'?2:1);
  const hasTarget=g.stock.filter(c=>c.n===5).length>=(defend?2:1);
  if(!hasJoker||!hasTarget)continue;
  replaceInHand(g,1,0,c=>c.kind==='joker');
  const topIndex=g.stock.findIndex(c=>c.n===5);
  g.pile.push(g.stock.splice(topIndex,1)[0]);
  if(defend)replaceInHand(g,0,0,c=>c.n===5);
  else if(mode==='joker')replaceInHand(g,0,0,c=>c.kind==='joker');
  else{
   for(let i=0;i<g.people[0].hand.length;i++){
    if(g.people[0].hand[i].n===5)replaceInHand(g,0,i,c=>c.n!==5&&c.kind!=='joker');
   }
  }
  E.play(g,1,{type:'play',index:0});
  assert.equal(E.active(g),0);assert.ok(g.pending);
  return g;
 }
 throw Error('Could not make chosen attack scenario');
}
function stored(mode,g){
 const store=new Map();
 store.set('tilt-joker-lab-'+mode+'-v01',JSON.stringify({
  game:g,opponents:'bot',botStyle:'timing',message:'An incoming Joker!',sounds:false
 }));
 return store;
}
check('First person UI shows a private 4-card hand, opaque opponent backs, and separate saves',()=>{
 const a=mount('match');assert.equal(a.saved().game.people[0].hand.length,4);
 assert.equal(a.saved().game.stock.length,24);
 assert.match(a.el('hand').innerHTML,/data-index/);
 assert.match(a.el('opponentHand').innerHTML,/back-card/);
 assert.doesNotMatch(a.el('opponentHand').innerHTML,/aria-label="Number|data-index/);
 assert.equal(a.el('matchLink').attrs['aria-current'],'page');
 assert.equal(a.el('jokerWarning').hidden,true);
 assert.equal(a.store.has('one-card-one-rule-quick-v01'),false);
});
check('Playing a Joker on an empty pile never creates a pending attack or steals a turn',()=>{
 const g=E.create({seed:891,mode:'match'});
 replaceInHand(g,0,0,c=>c.kind==='joker');
 const a=mount('match',g.seed,stored('match',g),false);
 assert.match(a.el('handHint').textContent,/discarded with no attack/);
 a.tap(0);
 const after=a.saved().game;
 assert.equal(after.log.at(-1).reason,'jokerBurned');
 assert.equal(after.pending,null);
 assert.equal(after.pile.length,0);
 assert.equal(E.active(after),1);
 assert.equal(a.el('jokerWarning').hidden,true);
 assert.match(a.saved().message,/No attack/i);
 assert.equal(E.count(after),48);
});
check('Incoming Joker leaves the target rank visible and offers a matching-card counter',()=>{
 const g=fixture('match',true),a=mount('match',g.seed,stored('match',g),false);
 assert.equal(a.saved().game.pending.targetRank,5);
 assert.equal(a.el('jokerWarning').hidden,false);
 assert.match(a.el('condition').textContent,/MATCH 5/);
 assert.match(a.el('pile').innerHTML,/CHALLENGE 5/);
 assert.equal(a.el('pile').className,'pile pending-attack');
 assert.match(a.el('pile').innerHTML,/class="number">5/);
 assert.match(a.el('hand').innerHTML,/data-index="0"/);
 assert.equal(a.el('takeButton').textContent,'TAKE THE WHOLE PILE (1)');
 const first=a.saved().game.people[0].hand.length;
 a.tap(0);
 const after=a.saved().game;
 assert.equal(after.pending,null);assert.equal(after.log.at(-1).reason,'jokerBlocked');
 assert.equal(after.people[0].hand.length,first);
 assert.equal(E.active(after),0,'Defender leads again');
 assert.equal(E.count(after),48);
 assert.equal(a.el('jokerWarning').hidden,true);
 assert.equal(a.el('pile').className,'pile');
});
check('Without a counter, user takes all visible cards and the attacker gets the next turn',()=>{
 const g=fixture('plain',false);
 g.pile.push(...g.stock.splice(-3));
 const a=mount('plain',g.seed,stored('plain',g),false);
 assert.equal(a.el('takeButton').textContent,'TAKE THE WHOLE PILE (4)');
 assert.equal(a.el('jokerWarning').hidden,false);
 assert.match(a.el('condition').textContent,/TAKE ALL/);
 a.el('takeButton').onclick();
 const after=a.saved().game;
 assert.equal(after.log.at(-1).reason,'jokerHit');
 assert.equal(after.log.at(-1).taken,4);
 assert.equal(after.pending,null);assert.equal(E.active(after),1);
 assert.equal(E.count(after),48);a.drain();
 assert.equal(E.count(a.saved().game),48);
});
check('Joker-vs-Joker mode enables a matching special counter but not a rank card',()=>{
 const g=fixture('joker',false),a=mount('joker',g.seed,stored('joker',g),false);
 assert.equal(E.legal(g,0).some(m=>m.type==='counter'),true);
 assert.equal(a.el('jokerLink').attrs['aria-current'],'page');
 assert.match(a.el('hand').innerHTML,/data-index="0"/);
 a.tap(0);
 assert.equal(a.saved().game.log.at(-1).reason,'jokerBlocked');
 assert.equal(a.saved().game.pending,null);
 assert.equal(E.active(a.saved().game),0);
});
check('A new match can select different bot behavior without altering game mechanics',()=>{
 const a=mount('match');
 a.el('seed').value='12345';a.el('botStyle').value='hoard';a.el('newGame').onclick();
 assert.equal(a.saved().game.seed,12345);
 assert.equal(a.saved().botStyle,'hoard');
 assert.equal(a.saved().game.turn,0);
 assert.equal(a.store.has('tilt-joker-lab-plain-v01'),false);
});
check('Private hotseat handoff hides the incoming card faces',()=>{
 const a=mount('match');
 a.el('opponents').value='hotseat';a.el('newGame').onclick();
 assert.equal(a.el('cover').style.display,'flex');
 assert.doesNotMatch(a.el('hand').innerHTML,/data-index/);
 a.el('reveal').onclick();assert.match(a.el('hand').innerHTML,/data-index/);
 const g=a.saved().game,action=E.legal(g,0).find(x=>x.type==='play');
 a.tap(action.index);
 assert.equal(a.saved().game.turn,1);
 assert.equal(a.el('cover').style.display,'flex');
 assert.doesNotMatch(a.el('hand').innerHTML,/data-index/);
});
console.log(JSON.stringify({pass:true,checks}));
