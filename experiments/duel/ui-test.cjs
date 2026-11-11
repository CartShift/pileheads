'use strict';
/* Standalone DOM-stub integration; does not establish mobile touch usability. */
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const engine=fs.readFileSync(path.join(__dirname,'engine.js'),'utf8');
const app=fs.readFileSync(path.join(__dirname,'app.js'),'utf8');
const html=fs.readFileSync(path.join(__dirname,'index.html'),'utf8');
for(const id of ['information','opponents','seed','start','rematch','reveal','board','hand','otherHand','scores','cover','export']){
 assert.match(html,new RegExp('id="'+id+'"'));
}
function mount({information='open',opponents='bots',seed='20261111',store=new Map()}={}){
 const nodes=new Map(),timers=[];
 const defaults={information,opponents,seed};
 const node=id=>{
  if(!nodes.has(id))nodes.set(id,{id,value:defaults[id]||'',innerHTML:'',textContent:'',style:{display:'none'},disabled:false,onclick:null});
  return nodes.get(id);
 };
 const sandbox=vm.createContext({
  document:{getElementById:node,createElement:()=>({href:'',download:'',click(){}})},
  localStorage:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v)},
  setTimeout:fn=>{timers.push(fn);return timers.length},clearTimeout(){},
  URL:{createObjectURL:()=> 'blob:stub',revokeObjectURL(){}},
  Blob:class{constructor(parts){this.parts=parts}},
  alert:msg=>{throw Error('Unexpected alert '+msg)},console
 });
 vm.runInContext(engine,sandbox,{filename:'duel/engine.js'});
 vm.runInContext(app,sandbox,{filename:'duel/app.js'});
 const E=sandbox.SparkDuel;
 function state(){return JSON.parse(store.get('spark-duel-lab-v01')).game}
 function click(ownIndex,boardPosition){
  node('hand').onclick({target:{closest:()=>({dataset:{index:String(ownIndex)}})}});
  node('board').onclick({target:{closest:()=>({dataset:{pos:String(boardPosition)}})}});
 }
 function drain(){for(let i=0;timers.length&&i<100;i++){const callback=timers.shift();callback()} assert.equal(timers.length,0,'Timer loop did not terminate')}
 return {node,store,E,state,click,drain};
}
function run(){
 let checks=0;
 const a=mount({information:'open'});
 assert.equal(a.state().information,'open');checks++;
 assert.match(a.node('hand').innerHTML,/class="card/);checks++;
 assert.match(a.node('otherHand').innerHTML,/class="card/);checks++;
 const move=a.E.legal(a.state(),0)[0];
 a.click(move.move.index,move.move.pos);
 assert.equal(a.state().turn,1);checks++;
 a.drain();
 assert.equal(a.state().turn,2);checks++;
 assert.equal(a.E.cardCount(a.state()),144);checks++;
 const hidden=mount({information:'hidden'});
 assert.doesNotMatch(hidden.node('otherHand').innerHTML,/class="card/);checks++;
 const hot=mount({information:'hidden',opponents:'hotseat'});
 assert.equal(hot.node('cover').style.display,'flex');checks++;
 assert.doesNotMatch(hot.node('hand').innerHTML,/class="card/);checks++;
 hot.node('reveal').onclick();
 assert.match(hot.node('hand').innerHTML,/class="card/);checks++;
 const first=hot.E.legal(hot.state(),0)[0];hot.click(first.move.index,first.move.pos);
 assert.equal(hot.node('cover').style.display,'flex');checks++;
 assert.doesNotMatch(hot.node('hand').innerHTML,/class="card/);checks++;
 const saved=hot.store;
 const reloaded=mount({information:'open',opponents:'bots',store:saved});
 assert.equal(reloaded.state().turn,1);checks++;
 assert.equal(reloaded.node('cover').style.display,'flex');checks++;
 reloaded.node('reveal').onclick();
 assert.match(reloaded.node('hand').innerHTML,/class="card/);checks++;
 const openHot=mount({information:'open',opponents:'hotseat'});
 assert.notEqual(openHot.node('cover').style.display,'flex');checks++;
 openHot.click(openHot.E.legal(openHot.state(),0)[0].move.index,openHot.E.legal(openHot.state(),0)[0].move.pos);
 assert.notEqual(openHot.node('cover').style.display,'flex');checks++;
 assert.match(openHot.node('otherHand').innerHTML,/class="card/);checks++;
 return {pass:true,checks};
}
if(require.main===module)console.log(JSON.stringify(run()));
module.exports={run};
