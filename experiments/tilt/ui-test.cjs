'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const engine=fs.readFileSync(path.join(__dirname,'engine.js'),'utf8');
const app=fs.readFileSync(path.join(__dirname,'app.js'),'utf8');
const html=fs.readFileSync(path.join(__dirname,'index.html'),'utf8');
for(const id of ['tabCross','tabForge','status','stock','ashes','instruction','board','hand','handLabel','actionTitle','actions',
 'feedback','history','ruleTitle','rules','opponents','botStyle','seed','newGame','export','cover','coverTitle','reveal']){
 assert.match(html,new RegExp('id="'+id+'"'));
}
function mount(query='?concept=cross&new=1',store=new Map()){
 const items=new Map(),tasks=[],defaults={seed:'20261111',opponents:'bot',botStyle:'planner'};
 function el(id){
  if(!items.has(id))items.set(id,{id,value:defaults[id]||'',innerHTML:'',textContent:'',style:{display:'none'},
   onclick:null,attributes:{},setAttribute(k,v){this.attributes[k]=v}});
  return items.get(id);
 }
 const ctx=vm.createContext({document:{getElementById:el,createElement:()=>({href:'',download:'',click(){}})},
  location:{search:query},URLSearchParams,
  localStorage:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v)},
  setTimeout:fn=>{tasks.push(fn);return tasks.length},clearTimeout(){},
  URL:{createObjectURL:()=> 'blob:fake',revokeObjectURL(){}},
  Blob:class{constructor(parts){this.parts=parts}},Date,
  alert(msg){throw Error('Unexpected alert '+msg)},console
 });
 vm.runInContext(engine,ctx,{filename:'engine.js'});
 vm.runInContext(app,ctx,{filename:'app.js'});
 function state(){return JSON.parse(store.get('tilt-mechanics-lab-v01'))}
 function pick(index){el('hand').onclick({target:{closest:(selector)=>selector==='[data-index]'?{dataset:{index:String(index)}}:null}})}
 function action({type,index,lane}){
  el('actions').onclick({target:{closest:(selector)=>selector==='[data-type]'?{dataset:{type,index:index===undefined?'':String(index),lane:lane||''}}:null}});
 }
 function drain(){let n=0;while(tasks.length&&n++<100)tasks.shift()();assert.ok(n<100)}
 return{el,state,store,pick,action,drain,engine:ctx.TiltLab};
}
function run(){
 let checks=0;
 const a=mount();
 assert.equal(a.state().games.cross.turn,0);checks++;
 assert.match(a.el('board').innerHTML,/SUN/);checks++;
 assert.match(a.el('board').innerHTML,/MOON/);checks++;
 assert.match(a.el('hand').innerHTML,/data-index/);checks++;
 assert.match(a.el('instruction').textContent,/STEP 1/);checks++;
 const legal=a.engine.legal(a.state().games.cross,0);
 a.pick(legal[0].index);
 assert.match(a.el('instruction').textContent,/STEP 2/);checks++;
 assert.match(a.el('actions').innerHTML,/data-type/);checks++;
 a.action(legal[0]);
 assert.equal(a.state().games.cross.turn,1);checks++;
 assert.match(a.el('feedback').textContent,/played CREST/);checks++;
 a.drain();
 assert.equal(a.state().games.cross.turn,2);checks++;
 assert.equal(a.engine.count(a.state().games.cross),48);checks++;
 const forge=mount('?concept=forge&new=1');
 assert.match(forge.el('board').innerHTML,/Prepared card/);checks++;
 assert.match(forge.el('rules').innerHTML,/PREPARE/);checks++;
 forge.pick(0);
 assert.match(forge.el('actions').innerHTML,/PREPARE/);checks++;
 forge.action({type:'prepare',index:0});
 assert.ok(forge.state().games.forge.players[0].prepared);checks++;
 assert.equal(forge.state().games.forge.turn,1);checks++;
 forge.drain();
 assert.equal(forge.state().games.forge.turn,2);checks++;
 assert.equal(forge.engine.count(forge.state().games.forge),48);checks++;
 const before=forge.state().games.forge.turn;
 forge.el('tabCross').onclick();
 assert.equal(forge.state().kind,'cross');checks++;
 assert.equal(forge.state().games.forge.turn,before);checks++;
 forge.el('tabForge').onclick();
 assert.equal(forge.state().games.forge.turn,before);checks++;
 const hot=mount();
 hot.el('opponents').value='hotseat';hot.el('newGame').onclick();
 assert.equal(hot.el('cover').style.display,'flex');checks++;
 assert.doesNotMatch(hot.el('hand').innerHTML,/data-index/);checks++;
 hot.el('reveal').onclick();
 assert.match(hot.el('hand').innerHTML,/data-index/);checks++;
 const action=hot.engine.legal(hot.state().games.cross,0)[0];
 hot.pick(action.index);hot.action(action);
 assert.equal(hot.state().games.cross.turn,1);checks++;
 assert.equal(hot.el('cover').style.display,'flex');checks++;
 assert.doesNotMatch(hot.el('hand').innerHTML,/data-index/);checks++;
 const restored=mount('?concept=cross',hot.store);
 assert.equal(restored.state().games.cross.turn,1);checks++;
 assert.equal(restored.el('cover').style.display,'flex');checks++;
 const hotF=mount('?concept=forge&new=1');
 hotF.el('opponents').value='hotseat';hotF.el('newGame').onclick();hotF.el('reveal').onclick();
 hotF.pick(0);hotF.action({type:'prepare',index:0});
 assert.equal(hotF.el('cover').style.display,'flex');checks++;
 assert.doesNotMatch(hotF.el('hand').innerHTML,/data-index/);checks++;
 hotF.el('reveal').onclick();
 assert.match(hotF.el('hand').innerHTML,/data-index/);checks++;
 assert.equal(hotF.engine.count(hotF.state().games.forge),48);checks++;
 return{pass:true,checks};
}
if(require.main===module)console.log(JSON.stringify(run()));
module.exports={run};
