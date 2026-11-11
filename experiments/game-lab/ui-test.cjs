'use strict';
/* Browser-free integration smoke. Does NOT establish touch accessibility. */
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const engine=fs.readFileSync(path.join(__dirname,'engine.js'),'utf8');
const app=fs.readFileSync(path.join(__dirname,'app.js'),'utf8');
const html=fs.readFileSync(path.join(__dirname,'index.html'),'utf8');
for(const id of ['tabClaim','tabSignal','phase','scores','instruction','stage','hand','handTitle','handCount',
 'action','actionTitle','actionButtons','feedback','reveal','history','opponents','botStyle','seed','newGame','export','cover','revealButton']){
 assert.match(html,new RegExp('id="'+id+'"'),'Missing '+id);
}
function mount(query='?game=claim&new=1',store=new Map()){
 const el=new Map(),queue=[],defaults={opponents:'bot',botStyle:'planner',seed:'20261111'};
 function node(id){
  if(!el.has(id))el.set(id,{id,value:defaults[id]||'',textContent:'',innerHTML:'',hidden:false,style:{display:'none'},
   onclick:null,attrs:{},setAttribute(n,v){this.attrs[n]=v},getAttribute(n){return this.attrs[n]}});
  return el.get(id);
 }
 const ctx=vm.createContext({
  document:{getElementById:node,createElement:()=>({href:'',download:'',click(){}})},
  location:{search:query},URLSearchParams,
  localStorage:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v)},
  setTimeout:fn=>{queue.push(fn);return queue.length},clearTimeout(){},
  URL:{createObjectURL:()=> 'blob:fake',revokeObjectURL(){}},
  Blob:class{constructor(parts){this.parts=parts}},Date,
  alert:m=>{throw Error('Unexpected alert: '+m)},console
 });
 vm.runInContext(engine,ctx,{filename:'engine.js'});
 vm.runInContext(app,ctx,{filename:'app.js'});
 function state(){return JSON.parse(store.get('spark-game-lab-session-01'))}
 function clickHand(index){node('hand').onclick({target:{closest:s=>s==='[data-hand]'?{dataset:{hand:String(index)}}:null}})}
 function clickClaim(index,bank){
  node('actionButtons').onclick({target:{closest:s=>s==='[data-claim-index]'?{dataset:{claimIndex:String(index),claimBank:bank||''}}:null}});
 }
 function clickSignal(index,slot){
  node('actionButtons').onclick({target:{closest:s=>s==='[data-signal-index]'?{dataset:{signalIndex:String(index),signalSlot:String(slot)}}:null}});
 }
 function drain(){
  let n=0;while(queue.length&&n++<80)queue.shift()();
  assert.ok(n<80,'Bot loop did not terminate');
 }
 function nextRound(){node('reveal').onclick({target:{closest:s=>s==='[data-next-round]'?{dataset:{nextRound:'1'}}:null}})}
 return{node,store,state,drain,clickHand,clickClaim,clickSignal,nextRound,engine:ctx.SparkGameLab};
}
function run(){
 let checks=0;
 const claim=mount();
 assert.equal(claim.state().games.claim.turn,0);checks++;
 assert.match(claim.node('instruction').textContent,/STEP 1/);checks++;
 assert.match(claim.node('hand').innerHTML,/data-hand/);checks++;
 assert.doesNotMatch(claim.node('actionButtons').innerHTML,/data-claim-index/);checks++;
 claim.clickHand(0);
 assert.match(claim.node('instruction').textContent,/STEP 2/);checks++;
 assert.match(claim.node('actionButtons').innerHTML,/data-claim-index/);checks++;
 claim.clickClaim(0,null);
 assert.equal(claim.state().games.claim.turn,1);checks++;
 assert.match(claim.node('feedback').textContent,/placed/);checks++;
 claim.drain();
 assert.equal(claim.state().games.claim.turn,2);checks++;
 assert.equal(claim.engine.cardCount(claim.state().games.claim),72);checks++;
 const signal=mount('?game=signal&new=1');
 assert.match(signal.node('instruction').textContent,/STEP 1/);checks++;
 assert.equal(signal.state().games.signal.round,0);checks++;
 signal.clickHand(0);
 assert.match(signal.node('actionButtons').innerHTML,/data-signal-index/);checks++;
 signal.clickSignal(0,1);
 assert.ok(signal.state().games.signal.commits[0]);checks++;
 assert.equal(signal.state().games.signal.round,0);checks++;
 assert.doesNotMatch(signal.node('feedback').textContent,/bid Orange 4/i);checks++;
 signal.drain();
 assert.equal(signal.state().games.signal.round,1);checks++;
 assert.equal(signal.state().awaitingSignal,true);checks++;
 assert.equal(signal.node('reveal').hidden,false);checks++;
 assert.match(signal.node('reveal').innerHTML,/Bids revealed/);checks++;
 // A pending SIGNAL reveal must never prevent playing the separate CLAIM game.
 signal.node('tabClaim').onclick();
 assert.match(signal.node('instruction').textContent,/STEP 1/);checks++;
 signal.clickHand(0);
 assert.match(signal.node('actionButtons').innerHTML,/data-claim-index/);checks++;
 signal.clickClaim(0,null);
 assert.equal(signal.state().games.claim.turn,1);checks++;
 signal.drain();
 signal.node('tabSignal').onclick();
 assert.equal(signal.state().awaitingSignal,true);checks++;
 assert.equal(signal.node('reveal').hidden,false);checks++;
 assert.doesNotMatch(signal.node('hand').innerHTML,/data-hand/);checks++;
 signal.nextRound();
 assert.equal(signal.state().awaitingSignal,false);checks++;
 assert.match(signal.node('instruction').textContent,/STEP 1/);checks++;
 assert.equal(signal.engine.cardCount(signal.state().games.signal),60);checks++;
 const hot=mount('?game=claim&new=1');
 hot.node('opponents').value='hotseat';hot.node('newGame').onclick();
 assert.equal(hot.node('cover').style.display,'flex');checks++;
 assert.doesNotMatch(hot.node('hand').innerHTML,/data-hand/);checks++;
 hot.node('revealButton').onclick();
 assert.match(hot.node('hand').innerHTML,/data-hand/);checks++;
 hot.clickHand(0);hot.clickClaim(0,null);
 assert.equal(hot.node('cover').style.display,'flex');checks++;
 assert.doesNotMatch(hot.node('hand').innerHTML,/data-hand/);checks++;
 const restored=mount('?game=claim',hot.store);
 assert.equal(restored.state().games.claim.turn,1);checks++;
 assert.equal(restored.node('cover').style.display,'flex');checks++;
 const hotSignal=mount('?game=signal&new=1');
 hotSignal.node('opponents').value='hotseat';hotSignal.node('newGame').onclick();hotSignal.node('revealButton').onclick();
 hotSignal.clickHand(0);hotSignal.clickSignal(0,0);
 assert.equal(hotSignal.node('cover').style.display,'flex');checks++;
 assert.doesNotMatch(hotSignal.node('hand').innerHTML,/data-hand/);checks++;
 hotSignal.node('revealButton').onclick();
 hotSignal.clickHand(0);hotSignal.clickSignal(0,1);
 assert.equal(hotSignal.state().games.signal.round,1);checks++;
 assert.equal(hotSignal.state().awaitingSignal,true);checks++;
 assert.doesNotMatch(hotSignal.node('hand').innerHTML,/data-hand/);checks++;
 return{pass:true,checks};
}
if(require.main===module)console.log(JSON.stringify(run()));
module.exports={run};
