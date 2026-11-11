'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const E=require('./engine.js');
const engine=fs.readFileSync(path.join(__dirname,'engine.js'),'utf8');
const app=fs.readFileSync(path.join(__dirname,'app.js'),'utf8');
const html=fs.readFileSync(path.join(__dirname,'index.html'),'utf8');
for(const id of ['turn','stock','other','condition','ruleTip','pile','message','handTitle','handHint','hand',
 'take','takeButton','done','opponents','botStyle','seed','newGame','export','cover','coverTitle','reveal']){
 assert.match(html,new RegExp('id="'+id+'"'),'Missing '+id);
}
function mount(search='?new=1',store=new Map()){
 const items=new Map(),tasks=[];
 const defaults={seed:'20261111',opponents:'bot',botStyle:'thoughtful'};
 function el(id){
  if(!items.has(id))items.set(id,{id,value:defaults[id]||'',innerHTML:'',textContent:'',style:{display:'none'},
   hidden:false,onclick:null,disabled:false});
  return items.get(id);
 }
 const ctx=vm.createContext({document:{getElementById:el,createElement:()=>({href:'',download:'',click(){}})},
  location:{search},URLSearchParams,localStorage:{getItem:key=>store.get(key)||null,setItem:(key,v)=>store.set(key,v)},
  setTimeout:fn=>{tasks.push(fn);return tasks.length},clearTimeout(){},
  URL:{createObjectURL:()=> 'blob:fake',revokeObjectURL(){}},
  Blob:class{constructor(parts){this.parts=parts}},Date,
  alert(msg){throw Error('Unexpected alert: '+msg)},console
 });
 vm.runInContext(engine,ctx,{filename:'engine.js'});
 vm.runInContext(app,ctx,{filename:'app.js'});
 function state(){return JSON.parse(store.get('one-card-one-rule-v01'))}
 function tap(index,disabled=false){
  el('hand').onclick({target:{closest:selector=>selector==='[data-index]'?{disabled,dataset:{index:String(index)}}:null}});
 }
 function drain(){let n=0;while(tasks.length&&n++<100)tasks.shift()();assert.ok(n<100,'Too many bot tasks')}
 return{el,state,store,tap,drain,engine:ctx.OneLab};
}
function run(){
 let checks=0;
 const a=mount();
 assert.equal(a.state().game.turn,0);checks++;
 assert.match(a.el('condition').textContent,/ANY CARD/);checks++;
 assert.match(a.el('hand').innerHTML,/data-index/);checks++;
 assert.equal((a.el('hand').innerHTML.match(/class="card/g)||[]).length,3);checks++;
 assert.equal(a.el('take').hidden,true);checks++;
 a.tap(0);
 assert.equal(a.state().game.turn,1);checks++;
 assert.match(a.el('message').textContent,/played |Same number/);checks++;
 a.drain();
 assert.equal(a.state().game.turn,2);checks++;
 assert.equal(a.engine.count(a.state().game),48);checks++;
 const top=a.state().game.pile.at(-1);
 if(top){
  assert.match(a.el('condition').textContent,top.arrow==='up'?/HIGHER/:/LOWER/);
  checks++;
 }
 // Verify blocked cards are dimmed AND protected from a synthetic click.
 const choices=a.engine.legal(a.state().game,0);
 const blocked=a.state().game.people[0].hand.findIndex((_,i)=>!choices.some(m=>m.type==='play'&&m.index===i));
 if(blocked>=0){
  assert.match(a.el('hand').innerHTML,/disabled/);checks++;
  const before=a.state().game.turn;a.tap(blocked,true);
  assert.equal(a.state().game.turn,before);checks++;
 }
 // Seeded restart changes the active match, no cross-test save pollution.
 a.el('seed').value='777';
 a.el('newGame').onclick();
 assert.equal(a.state().game.seed,777);checks++;
 assert.equal(a.state().game.turn,0);checks++;
 const hot=mount();
 hot.el('opponents').value='hotseat';hot.el('newGame').onclick();
 assert.equal(hot.el('cover').style.display,'flex');checks++;
 assert.doesNotMatch(hot.el('hand').innerHTML,/data-index/);checks++;
 hot.el('reveal').onclick();
 assert.match(hot.el('hand').innerHTML,/data-index/);checks++;
 hot.tap(0);
 assert.equal(hot.state().game.turn,1);checks++;
 assert.equal(hot.el('cover').style.display,'flex');checks++;
 assert.doesNotMatch(hot.el('hand').innerHTML,/data-index/);checks++;
 const restore=mount('',hot.store);
 assert.equal(restore.state().game.turn,1);checks++;
 assert.equal(restore.el('cover').style.display,'flex');checks++;
 // Construct a blocked state through the engine for a realistic take-only UI.
 const forced=E.create({seed:400});
 for(let i=0;i<forced.people[0].hand.length;i++)if(forced.people[0].hand[i].n===8){
  const j=forced.stock.findIndex(c=>c.n<8);const replacement=forced.stock.splice(j,1)[0];
  forced.stock.push(forced.people[0].hand[i]);forced.people[0].hand[i]=replacement;
 }
 const k=forced.stock.findIndex(c=>c.n===8&&c.arrow==='up');
 assert.ok(k>=0);forced.pile.push(forced.stock.splice(k,1)[0]);
 assert.equal(E.legal(forced,0)[0].type,'take');
 const takeStore=new Map([['one-card-one-rule-v01',JSON.stringify({game:forced,opponents:'bot',botStyle:'thoughtful',message:'Your move'})]]);
 const taking=mount('',takeStore);
 assert.equal(taking.el('take').hidden,false);checks++;
 const before=taking.state().game.people[0].hand.length;
 taking.el('takeButton').onclick();
 assert.equal(taking.state().game.turn,1);checks++;
 assert.equal(taking.state().game.people[0].hand.length,before+1);checks++;
 assert.equal(taking.state().game.pile.length,0);checks++;
 return{pass:true,checks};
}
if(require.main===module)console.log(JSON.stringify(run()));
module.exports={run};
