'use strict';
/* DOM-stub integration suite for the first-person tabletop. These checks do
 * not replace real mobile-browser screenshots or physical touch QA. */
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const engine=fs.readFileSync(path.join(__dirname,'engine.js'),'utf8');
const app=fs.readFileSync(path.join(__dirname,'app.js'),'utf8');
const html=fs.readFileSync(path.join(__dirname,'index.html'),'utf8');
const required=['opponentName','opponentHand','deckVisual','stock','other','discard',
 'discardCount','pileMat','pile','hand','message','condition','ruleTip','take',
 'takeButton','soundEnabled','done','cover','reveal'];
for(const id of required)assert.match(html,new RegExp('id="'+id+'"'),'Missing first-person region: '+id);
assert.match(html,/touch-action:none/,'Touch dragging must not be consumed by mobile scrolling');
function mount(q='?new=1',store=new Map()){
 const elements=new Map(),tasks=[],ghosts=[],state={captures:0,releases:0,animations:0},defaults={
  seed:'20261111',opponents:'bot',botStyle:'thoughtful'
 };
 function mockClass(){
  const a=new Set();
  return{add:x=>a.add(x),remove:x=>a.delete(x),contains:x=>a.has(x),
   toggle:(x,on)=>{if(on===false)a.delete(x);else if(on===true)a.add(x);else if(a.has(x))a.delete(x);else a.add(x)}};
 }
 function el(id){
  if(!elements.has(id)){
   const events={};
   elements.set(id,{
    id,value:defaults[id]||'',textContent:'',innerHTML:'',hidden:false,style:{display:'none'},
    checked:false,onclick:null,onchange:null,events,className:'',classList:mockClass(),
    addEventListener:(type,fn)=>{events[type]=fn},
    setPointerCapture:()=>state.captures++,
    releasePointerCapture:()=>state.releases++,
    setAttribute(){},
    getBoundingClientRect:()=>({left:id==='pileMat'?130:210,top:id==='pileMat'?210:250,
      width:id==='pileMat'?130:95,height:id==='pileMat'?150:140}),
    querySelector:(selector)=>selector.includes('.back-card')?{
      getBoundingClientRect:()=>({left:220,top:65,width:40,height:59})
    }:selector.includes('.table-card')?{
      getBoundingClientRect:()=>({left:183,top:246,width:83,height:120})
    }:null
   });
  }
  return elements.get(id);
 }
 function mockNode(){
  return{
   style:{},innerHTML:'',className:'',disabled:false,classList:mockClass(),
   remove(){const i=ghosts.indexOf(this);if(i>=0)ghosts.splice(i,1)},
   removeAttribute(){},
   animate(){state.animations++;const a={onfinish:null,oncancel:null};return a},
   cloneNode(){return mockNode()},
   getBoundingClientRect(){return{left:105,top:500,width:82,height:121}}
  };
 }
 const ctx=vm.createContext({
  document:{getElementById:el,createElement:mockNode,
   body:{appendChild:n=>{ghosts.push(n);return n}},
   querySelectorAll:()=>ghosts
  },window:{matchMedia:()=>({matches:false})},location:{search:q},URLSearchParams,
  localStorage:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v)},
  setTimeout:fn=>{tasks.push(fn);return tasks.length},clearTimeout(){},
  URL:{createObjectURL:()=> 'blob:fake',revokeObjectURL(){}},
  Blob:class{constructor(parts){this.parts=parts}},Date,
  alert:m=>{throw Error('Unexpected alert: '+m)},console
 });
 vm.runInContext(engine,ctx,{filename:'engine.js'});
 vm.runInContext(app,ctx,{filename:'app.js'});
 function game(){return JSON.parse(store.get('one-card-one-rule-v01')).game}
 function tap(i){
  const card={dataset:{index:String(i)},disabled:false,
   getBoundingClientRect:()=>({left:105,top:500,width:82,height:121})};
  el('hand').onclick({target:{closest:s=>s==='[data-index]'?card:null}});
 }
 function drag(i){
  const source=mockNode();source.dataset={index:String(i)};
  const callbacks=el('hand').events;
  const ev=(x,y)=>({pointerId:17,clientX:x,clientY:y,button:0,
     preventDefault(){},target:{closest:selector=>selector==='[data-index]'?source:null}});
  callbacks.pointerdown(ev(115,565));
  callbacks.pointermove(ev(190,285));
  const over=el('pileMat').classList.contains('drop-active');
  callbacks.pointerup(ev(190,285));
  return over;
 }
 function drain(){
  let count=0;while(tasks.length&&count++<30)tasks.shift()();
  assert.ok(count<30,'Unbounded timer loop');
 }
 return{el,game,tap,drag,drain,store,state,ghosts};
}
function run(){
 let checks=0;
 const a=mount();
 assert.match(a.el('opponentHand').innerHTML,/back-card/);checks++;
 assert.equal((a.el('opponentHand').innerHTML.match(/class="back-card"/g)||[]).length,3);checks++;
 assert.doesNotMatch(a.el('opponentHand').innerHTML,/data-index|aria-label="Number/);checks++;
 assert.match(a.el('deckVisual').innerHTML,/back-card/);checks++;
 assert.equal(a.el('stock').textContent,'42 left');checks++;
 assert.equal(a.el('discardCount').textContent,'0 cards');checks++;
 assert.equal(a.el('condition').textContent,'ANY CARD');checks++;
 assert.equal(a.el('soundEnabled').checked,false);checks++;
 a.tap(0);
 assert.equal(a.game().turn,1);checks++;
 assert.match(a.el('hand').innerHTML,/data-index/);checks++; // own hand stays visible during bot turn
 assert.match(a.el('opponentHand').innerHTML,/back-card/);checks++;
 assert.equal(a.el('stock').textContent,'41 left');checks++;
 assert.ok(a.state.animations>=1,'Card flight should be activated when browser DOM supports it');checks++;
 a.drain();
 assert.equal(a.game().turn,2);checks++;
 assert.equal(a.el('stock').textContent,'40 left');checks++;
 assert.match(a.el('hand').innerHTML,/data-index/);checks++;
 assert.ok(a.state.animations>=2,'Bot should also animate a played card');checks++;
 const b=mount();
 const moved=b.drag(0);
 assert.equal(moved,true,'Pile should highlight when a card is dragged over');checks++;
 assert.equal(b.game().turn,1,'Dragging onto pile must play one legal card');checks++;
 assert.equal(b.state.captures,1);checks++;
 assert.equal(b.state.releases,1);checks++;
 assert.equal(b.el('pileMat').classList.contains('drop-active'),false);checks++;
 b.drain();assert.equal(b.game().turn,2);checks++;
 const c=mount();
 c.el('soundEnabled').checked=true;c.el('soundEnabled').onchange({target:{checked:true}});
 assert.equal(JSON.parse(c.store.get('one-card-one-rule-v01')).sounds,true);checks++;
 const d=mount('',c.store);
 assert.equal(d.el('soundEnabled').checked,true);checks++;
 const hot=mount();
 hot.el('opponents').value='hotseat';hot.el('newGame').onclick();
 assert.equal(hot.el('cover').style.display,'flex');checks++;
 assert.doesNotMatch(hot.el('hand').innerHTML,/data-index/);checks++;
 assert.match(hot.el('opponentHand').innerHTML,/back-card/);checks++;
 hot.el('reveal').onclick();hot.tap(0);
 assert.equal(hot.el('cover').style.display,'flex');checks++;
 assert.doesNotMatch(hot.el('hand').innerHTML,/data-index/);checks++;
 return{pass:true,checks};
}
if(require.main===module)console.log(JSON.stringify(run()));
module.exports={run};
