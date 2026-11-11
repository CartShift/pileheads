'use strict';
/* Isolated first-person UI regression: complete best-of-three set on phone DOM stubs. */
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const E=require('./engine.js'),S=require('./series.js');
const app=fs.readFileSync(path.join(__dirname,'app.js'),'utf8');
const html=fs.readFileSync(path.join(__dirname,'index.html'),'utf8');
for(const id of ['setScore','setHeadline','setTip','seriesLink','classicLink','quickLink','turn',
 'done','hand','opponentHand','cover','reveal','pile','stock','soundEnabled','handRule','deckRule']){
 assert.match(html,new RegExp('id="'+id+'"'));
}
function mount(seed,store=new Map()){
 const query='?mode=quick&series=3&new=1&seed='+seed,items=new Map(),timers=[];
 function el(id){
  if(!items.has(id)){
   const attrs={};
   items.set(id,{
    id,attrs,innerHTML:'',textContent:'',hidden:false,style:{display:'none'},checked:false,disabled:false,
    onclick:null,onchange:null,value:id==='opponents'?'bot':id==='botStyle'?'strategic':String(seed),
    setAttribute(k,v){attrs[k]=v},getBoundingClientRect(){return null},
    classList:{add(){},remove(){},toggle(){}},
    querySelector(){return null},addEventListener(){}
   });
  }
  return items.get(id);
 }
 const context=vm.createContext({
  OneLab:E,OneSeries:S,
  document:{getElementById:el,querySelectorAll:()=>[],createElement:()=>({click(){},style:{}}),
   body:{appendChild(){}}},
  location:{search:query},URLSearchParams,
  localStorage:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v)},
  setTimeout:fn=>{timers.push(fn);return timers.length},
  clearTimeout(){},
  URL:{createObjectURL:()=> 'blob:fake',revokeObjectURL(){}},Blob:class{},
  Date,window:{matchMedia:()=>({matches:true})},console,
  alert:m=>{throw Error('Unexpected alert '+m)}
 });
 vm.runInContext(app,context,{filename:'app.js'});
 function saved(){return JSON.parse(store.get('one-card-one-rule-quick-series-v01'))}
 function next(){
  const g=saved().game;
  if(E.finished(g))return false;
  const turn=E.active(g);
  if(turn===1){
   assert.ok(timers.length,'Bot turn must be scheduled');
   timers.shift()();return true;
  }
  const move=E.choose(g,0,'strategic');
  if(move.type==='take')el('takeButton').onclick();
  else{
   const card={disabled:false,dataset:{index:String(move.index)}};
   el('hand').onclick({target:{closest:selector=>selector==='[data-index]'?card:null}});
  }
  return true;
 }
 return{el,saved,next,store,timers};
}
function findDeciderSeed(){
 for(let seed=20261112;seed<=20261200;seed++){
  const set=S.create(seed);
  for(let round=0;round<2;round++){
   const g=E.create({seed:S.roundSeed(set),firstSeat:S.firstSeat(set),mode:'quick'});
   while(!E.finished(g)){
    const active=E.active(g);E.play(g,active,E.choose(g,active,'strategic'));
   }
   S.record(set,g);if(set.complete)break;
   S.advance(set);
  }
  if(!set.complete&&set.round===3&&set.wins[0]===1&&set.wins[1]===1)return seed;
 }
 throw Error('Could not find reproducible tied set');
}
function run(){
 let checks=0,turns=0;
 const seed=findDeciderSeed(),a=mount(seed),start=a.saved();
 assert.equal(start.series.round,1);checks++;
 assert.equal(start.series.wins.join(','),'0,0');checks++;
 assert.equal(a.el('setScore').hidden,false);checks++;
 assert.match(a.el('setHeadline').textContent,/ROUND 1 OF 3/);checks++;
 assert.equal(a.el('seriesLink').attrs['aria-current'],'page');checks++;
 assert.equal(a.el('quickLink').attrs['aria-current'],'false');checks++;
 const originalSessionKey='one-card-one-rule-quick-v01';
 assert.equal(a.store.has(originalSessionKey),false,'Series must not modify the standalone quick save');checks++;
 for(let round=1;round<=3;round++){
  let guard=0;
  while(!E.finished(a.saved().game)){
   a.next();turns++;
   assert.ok(++guard<200,'Round hung');
  }
  const snapshot=a.saved();
  assert.equal(snapshot.series.round,round);checks++;
  assert.equal(snapshot.series.history.length,round);checks++;
  assert.equal(snapshot.series.wins.reduce((x,y)=>x+y,0),round);checks++;
  assert.equal(E.count(snapshot.game),48);checks++;
  assert.match(a.el('done').innerHTML,/data-rematch/);checks++;
  assert.ok(!a.el('done').hidden);checks++;
  if(round!==3){
   assert.equal(snapshot.series.complete,false);checks++;
   a.el('done').onclick({target:{closest:s=>s==='[data-rematch]'?{dataset:{rematch:'1'}}:null}});
   const next=a.saved();
   assert.equal(next.series.round,round+1);checks++;
   assert.equal(next.game.firstSeat,S.firstSeat(next.series));checks++;
   assert.equal(next.game.seed,S.roundSeed(next.series));checks++;
   assert.equal(E.count(next.game),48);checks++;
  }else{
   assert.equal(snapshot.series.complete,true);checks++;
   assert.match(a.el('done').innerHTML,/wins the set/);checks++;
   assert.match(a.el('done').innerHTML,/New best-of-three set/);checks++;
  }
 }
 const before=a.saved().series.baseSeed;
 a.el('done').onclick({target:{closest:s=>s==='[data-rematch]'?{}:null}});
 const reset=a.saved();
 assert.equal(reset.series.round,1);checks++;
 assert.deepEqual(reset.series.wins,[0,0]);checks++;
 assert.equal(reset.series.baseSeed,(before+1)>>>0);checks++;
 assert.equal(E.count(reset.game),48);checks++;
 assert.equal(a.store.has(originalSessionKey),false);checks++;
 return{pass:true,checks,turns,seed};
}
if(require.main===module)console.log(JSON.stringify(run()));
module.exports={run};
