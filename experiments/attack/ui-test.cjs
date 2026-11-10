'use strict';
/* DOM-stub integration for the Attack app. Run with node experiments/attack/ui-test.cjs
 * Does not replace manual mobile Chrome and actual touch tests.
 */
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const engine=fs.readFileSync(require('node:path').join(__dirname,'engine.js'),'utf8');
const app=fs.readFileSync(require('node:path').join(__dirname,'app.js'),'utf8');
class El{
 constructor(context,id,parent=null){
  this.context=context;this.id=id;this.parent=parent;this.style={};this.dataset={};this.children=[];
  this._html='';this.textContent='';this.value='';this.attrs={};this.classes=new Set();
  this.classList={add:(...args)=>args.forEach(x=>this.classes.add(x)),remove:(...args)=>args.forEach(x=>this.classes.delete(x)),contains:n=>this.classes.has(n)};
 }
 get innerHTML(){return this._html}
 set innerHTML(raw){
  this._html=String(raw);this.children=[];
  if(['hand','board'].includes(this.id)){
   for(const m of this._html.matchAll(/<button class="card ([A-Z]) ([^"]*)"([^>]*)>/g)){
    const el=new El(this.context,'card',this);el.value=m[1];
    el.classes.add('card');
    for(const k of ['index']){const v=m[3].match(new RegExp('data-'+k+'="(\\d+)"'));if(v)el.dataset[k]=v[1]}
    this.children.push(el);
   }
  }else if(this.id==='gaps'){
   for(const m of this._html.matchAll(/<button data-pos="(\d+)"/g)){
    const el=new El(this.context,'gap',this);el.dataset.pos=m[1];this.children.push(el);
   }
  }else if(this.id==='scores'){
   for(const m of this._html.matchAll(/<div class="score [^"]*" data-seat="(\d+)"/g)){
    const el=new El(this.context,'score',this);el.dataset.seat=m[1];this.children.push(el);
   }
  }
  if(this.id==='hand'){
   const saved=this.context.store.get('spark-attack-lab-v02');
   const g=saved?JSON.parse(saved).game:null;
   this.context.handRenders.push({turn:g?.turn||0,pending:!!g?.pending,visible:this._html.includes('data-index='),cover:this.context.id('cover').style.display==='flex'});
  }
 }
 get firstElementChild(){return this.children[0]||null}
 getBoundingClientRect(){const i=Number(this.dataset.pos||this.dataset.index||0);
  if(this.id==='card'&&this.parent?.id==='board')return {left:50+this.parent.children.indexOf(this)*40,top:180,width:38,height:62};
  if(this.id==='card'&&this.parent?.id==='hand')return {left:32+this.parent.children.indexOf(this)*35,top:330,width:33,height:60};
  if(this.id==='gap')return {left:48+i*40,top:260,width:35,height:38};
  if(this.id==='score')return {left:110+Number(this.dataset.seat)*110,top:80,width:100,height:60};
  return {left:60,top:195,width:48,height:70};
 }
 querySelectorAll(sel){
  if(sel.includes('.card'))return this.children.filter(c=>c.id==='card');
  if(sel.includes('[data-index]'))return this.children.filter(c=>c.dataset.index!==undefined);
  if(sel.includes('[data-pos]'))return this.children.filter(c=>c.dataset.pos!==undefined);
  return [];
 }
 querySelector(s){if(s==='.card')return this.querySelectorAll('.card')[0]||null;return null}
 cloneNode(){const el=new El(this.context,this.id,this.parent);el.value=this.value;return el}
 animate(){this.context.animations++;return {finished:Promise.resolve()}}
 appendChild(el){this.children.push(el);return el}
 remove(){this.context.ghosts=this.context.ghosts.filter(x=>x!==this)}
 setAttribute(n,v){this.attrs[n]=v}
 removeAttribute(n){delete this.attrs[n]}
 setPointerCapture(){}
}
function mount({mode='attack',opponents='bots',motion='off',seed='1'}={}){
 const ctx={nodes:new Map(),store:new Map(),timers:[],handRenders:[],ghosts:[],animations:0};
 const defaults={rules:mode,opponents,motion,seed,initialHand:'9'};
 ctx.id=id=>{if(!ctx.nodes.has(id)){const el=new El(ctx,id);el.value=defaults[id]||'';ctx.nodes.set(id,el)}return ctx.nodes.get(id)};
 const document={
  getElementById:ctx.id,createElement:()=>new El(ctx,'holder'),
  querySelector:s=>s.startsWith('.score')?ctx.id('scores').children.find(e=>e.dataset.seat===s.match(/\d+/)?.[0])||null:s.startsWith('#')?ctx.id(s.slice(1)):null,
  querySelectorAll:()=>ctx.ghosts,
  body:{appendChild(x){ctx.ghosts.push(x)}}
 };
 const sandbox=vm.createContext({document,Element:El,
  localStorage:{getItem:k=>ctx.store.get(k)||null,setItem:(k,v)=>ctx.store.set(k,v)},
  setTimeout(fn){ctx.timers.push(fn);return ctx.timers.length},clearTimeout(){},
  URL:{createObjectURL:()=> 'blob:stub',revokeObjectURL(){}},Blob:class{},
  alert(msg){throw Error('Unexpected alert '+msg)},console});
 vm.runInContext(engine,sandbox);vm.runInContext(app,sandbox);
 ctx.engine=sandbox.SparkAttack;ctx.state=()=>JSON.parse(ctx.store.get('spark-attack-lab-v02')).game;
 ctx.drain=async()=>{
  for(let i=0;i<360;i++){
   if(ctx.timers.length)ctx.timers.shift()();
   for(let j=0;j<10;j++)await Promise.resolve();
   if(i===359&&ctx.timers.length)throw Error('Timers not exhausted');
  }
 };
 ctx.clickMove=async(op)=>{
  ctx.id('hand').onclick({target:{closest:()=>({dataset:{index:String(op.move.index)}})}});
  ctx.id('gaps').onclick({target:{closest:()=>({dataset:{pos:String(op.move.pos)}})}});
  await ctx.drain();
 };
 ctx.skipBonus=async()=>{
  ctx.id('endBonus').onclick();
  await ctx.drain();
 };
 return ctx;
}
async function run(){
 const a=mount({seed:'1',mode:'attack',motion:'off'});
 const original=a.state(),scoring=a.engine.legal(original,0).find(x=>x.scored);
 assert.ok(scoring,'controlled seed must have a scoring move');
 a.id('hand').onclick({target:{closest:()=>({dataset:{index:String(scoring.move.index)}})}});
 assert.match(a.id('gaps').innerHTML,/merge-gap/,'scoring placements should be visibly identified');
 await a.clickMove(scoring);
 assert.equal(a.state().turn,0,'attack bonus keeps the active player');
 assert.equal(a.state().pending.kind,'bonus');
 assert.equal(a.state().players[1].hand.length,10);
 assert.equal(a.id('endBonus').style.display,'inline-flex');
 assert.match(a.id('rowHint').textContent,/BONUS MOVE/);
 assert.ok(a.id('gaps').innerHTML.includes('data-pos='));
 const follow=a.engine.legal(a.state(),0)[0];
 assert.ok(follow);
 await a.clickMove(follow);
 assert.ok(a.state().turn>=2,'bot completes after our second placement');
 assert.ok(a.state().log[0].bonusUsed);
 assert.equal(a.state().log[0].actions.length,2);
 assert.equal(a.engine.conservation(a.state()),144);
 const chains=mount({seed:'5',mode:'chains',motion:'on'});
 const long=chains.engine.legal(chains.state(),0).find(x=>x.waves.length>=2);
 assert.ok(long,'controlled seed must include a chain');
 await chains.clickMove(long);
 assert.equal(chains.state().pending.kind,'bonus');
 assert.equal(chains.state().players[1].hand.length,11);
 assert.equal(chains.id('endBonus').style.display,'inline-flex');
 await chains.skipBonus();
 assert.ok(chains.state().turn>=2);
 assert.equal(chains.state().log[0].bonusUsed,false);
 assert.ok(chains.animations>8,'exchange, collection and refill should animate');
 assert.equal(chains.ghosts.length,0,'no ghosts left after animations');
 const hot=mount({seed:'1',mode:'no-penalty',opponents:'hotseat',motion:'off'});
 assert.equal(hot.id('cover').style.display,'flex');
 assert.ok(hot.handRenders.every(x=>!x.visible));
 hot.id('reveal').onclick();
 await hot.clickMove(hot.engine.legal(hot.state(),0).find(o=>o.scored));
 assert.equal(hot.state().pending.kind,'bonus');
 assert.equal(hot.id('cover').style.display,'none','bonus should not hand device to opponent');
 await hot.skipBonus();
 assert.equal(hot.id('cover').style.display,'flex');
 assert.ok(hot.handRenders.filter(x=>x.turn===1&&!x.cover).every(x=>!x.visible),'opponent hand leaked before cover');
 return {result:'PASS',checks:20,animations:chains.animations,gameTurn:a.state().turn,chainTurn:chains.state().turn};
}
if(require.main===module)run().then(x=>console.log(JSON.stringify(x))).catch(e=>{console.error(e);process.exitCode=1});
module.exports={run};