/* Run: node experiments/exchange/ui-test.cjs
 * DOM stub verifies interactions and that private hands are never rendered during
 * bot turns or before the next pass-and-play player lifts the privacy cover.
 * This is NOT a real-browser or touch test.
 */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const html=fs.readFileSync('experiments/exchange/playtest.html','utf8');
const scripts=Array.from(html.matchAll(/<script>([\s\S]*?)<\/script>/g),x=>x[1]);
assert.equal(scripts.length,2);
function mount(mode){
 const nodes=new Map(),store=new Map(),timers=[],updates=[];
 const defaults={rules:'ex934',players:'2',opponents:mode,seed:'20261110',refill:'safe'};
 const node=id=>{
  if(!nodes.has(id)){
   const item={value:defaults[id]||'',textContent:'',onclick:null,style:{},_html:''};
   Object.defineProperty(item,'innerHTML',{get(){return this._html},set(value){
    this._html=value;
    if(id==='hand'){
     const saved=store.get('spark-exchange-lab');
     const g=saved?JSON.parse(saved).game:null;
     updates.push({html:value,turn:g?.turn||0,covered:node('cover').style.display==='flex'});
    }
   }});
   nodes.set(id,item);
  }
  return nodes.get(id);
 };
 const context=vm.createContext({
  document:{getElementById:node,createElement:()=>({click(){},href:'',download:''})},
  localStorage:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v)},
  setTimeout(fn){timers.push(fn);return timers.length},clearTimeout(){},
  URL:{createObjectURL:()=> 'blob:test',revokeObjectURL(){}},
  Blob:class{constructor(parts){this.parts=parts}},
  alert(message){throw Error('Alert: '+message)}
 });
 for(const code of scripts)vm.runInContext(code,context);
 return {node,store,updates,
  state(){return JSON.parse(store.get('spark-exchange-lab')).game},
  runTimers(){let n=0;while(timers.length&&n++<90)timers.shift()();assert.ok(n<90,'Bot must finish without looping')}
 };
}
function moveFirst(m){
 const state=m.state(),pos=state.row.findIndex(c=>c!==state.players[0].hand[0]);
 assert.ok(pos>=0);
 m.node('hand').onclick({target:{closest:()=>({dataset:{index:'0'}})}});
 m.node('board').onclick({target:{closest:()=>({dataset:{position:String(pos)}})}});
}
const bots=mount('bots');moveFirst(bots);
assert.ok(bots.updates.some(x=>x.turn%2===1),'bot turn must render');
assert.ok(bots.updates.filter(x=>x.turn%2===1).every(x=>!x.html.includes('class="card')),'bot hand must stay hidden');
bots.runTimers();
assert.equal(bots.state().turn,2);
assert.equal(bots.state().players[0].hand.length,3);
assert.equal(bots.state().row.length,9);
const hotseat=mount('hotseat');
assert.equal(hotseat.node('cover').style.display,'flex');
assert.ok(hotseat.updates.every(x=>!x.html.includes('class="card')),'hand hidden before first reveal');
hotseat.node('reveal').onclick();moveFirst(hotseat);
assert.equal(hotseat.node('cover').style.display,'flex');
assert.ok(hotseat.updates.filter(x=>x.turn%2===1&&!x.covered).every(x=>!x.html.includes('class="card')),'next player hand cannot flash on handoff');
hotseat.node('reveal').onclick();
assert.ok(hotseat.node('hand').innerHTML.includes('data-index='),'new player can see their hand after cover');
console.log('PASS: Exchange solo bot turns, hotseat handoff privacy, moves, rendering and invariants.');
