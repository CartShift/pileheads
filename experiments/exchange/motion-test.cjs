/* Run: node experiments/exchange/motion-test.cjs
 * A deterministic DOM + Web Animations API harness. Not a real Chrome test.
 * Tests that Exchange cards move, score waves resolve, and private hands remain safe.
 */
'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync('experiments/exchange/playtest.html','utf8');
const scripts=Array.from(html.matchAll(/<script>([\s\S]*?)<\/script>/g),x=>x[1]);
assert.equal(scripts.length,2);
class Element{
 constructor(ui,name,kind='root',classes='',index=0,parent=null){
  this.ui=ui;this.name=name;this.kind=kind;this.index=index;this.parent=parent;
  this.style={};this.dataset={};this.children=[];this._html='';this.textContent='';this.value='';
  this.attrs={};this._set=new Set(classes.split(/\s+/).filter(Boolean));
  this.classList={add:(...xs)=>xs.forEach(x=>this._set.add(x)),remove:(...xs)=>xs.forEach(x=>this._set.delete(x)),contains:x=>this._set.has(x)};
 }
 get innerHTML(){return this._html}
 set innerHTML(value){
  this._html=String(value);this.children=[];
  if(['board','hand','holder'].includes(this.name)){
   for(const m of this._html.matchAll(/<button class="card ([A-Z]) ([^"]*)"([^>]*)>/g)){
    const node=new Element(this.ui,'card','card','card '+m[1]+' '+m[2],this.children.length,this);
    for(const k of ['index','position']){const found=m[3].match(new RegExp('data-'+k+'="(\\d+)"'));if(found)node.dataset[k]=found[1]}
    this.children.push(node);
   }
  }else if(this.name==='scores'){
   for(const m of this._html.matchAll(/<div data-seat="(\d+)" class="score ([^"]*)"/g)){
    const el=new Element(this.ui,'score','score','score '+m[2],Number(m[1]),this);
    el.dataset.seat=m[1];el.counter=new Element(this.ui,'counter','counter');
    el.counter.textContent=this._html.split(m[0])[1].match(/class="score-count">(\d+)/)?.[1]||'0';
    this.children.push(el);
   }
  }
  if(this.name==='hand'){
   const saved=this.ui.store.get('spark-exchange-lab');
   this.ui.handUpdates.push({turn:saved?JSON.parse(saved).game.turn:0,html:this._html,covered:this.ui.node('cover').style.display==='flex'});
  }
 }
 get firstElementChild(){return this.children[0]||null}
 getBoundingClientRect(){
  if(this.kind==='card'&&this.parent?.name==='board')return {left:45+this.index*48,top:195,width:43,height:67};
  if(this.kind==='card'&&this.parent?.name==='hand')return {left:140+this.index*83,top:350,width:72,height:103};
  if(this.kind==='score')return {left:36+this.index*113,top:92,width:101,height:62};
  if(this.name==='deckStack')return {left:22,top:142,width:38,height:55};
  return {left:100,top:185,width:48,height:78};
 }
 querySelectorAll(selector){
  if(selector.includes('.card'))return this.children.filter(x=>x.kind==='card');
  if(selector.includes('data-index'))return this.children.filter(x=>x.dataset.index!==undefined);
  if(selector.includes('data-position'))return this.children.filter(x=>x.dataset.position!==undefined);
  return [];
 }
 querySelector(selector){
  if(selector==='.card')return this.querySelectorAll('.card')[0]||null;
  if(selector==='.score-count')return this.counter||null;
  if(selector.startsWith('[data-seat='))return this.children.find(x=>x.dataset.seat===selector.match(/\d+/)?.[0])||null;
  return null;
 }
 cloneNode(){const el=new Element(this.ui,this.name,this.kind,[...this._set].join(' '),this.index,this.parent);el._html=this._html;return el}
 animate(){this.ui.stats.animations++;return {finished:Promise.resolve()}}
 appendChild(child){this.children.push(child);return child}
 remove(){this.ui.ghosts=this.ui.ghosts.filter(x=>x!==this)}
 removeAttribute(key){delete this.attrs[key]}
 setAttribute(key,v){this.attrs[key]=v}
 setPointerCapture(){}
}
function mount(mode='bots',motion='on'){
 const ui={nodes:new Map(),store:new Map(),timers:[],ghosts:[],handUpdates:[],stats:{animations:0}};
 ui.store.set('spark-exchange-motion',motion);
 const defaults={rules:'ex934',players:'2',opponents:mode,seed:'20261110',refill:'safe'};
 ui.node=id=>{
  if(!ui.nodes.has(id)){
   const n=new Element(ui,id);
   n.value=defaults[id]||'';ui.nodes.set(id,n);
  }return ui.nodes.get(id);
 };
 const document={
  getElementById:ui.node,createElement:tag=>new Element(ui,'holder'),
  querySelector:s=>s.startsWith('.score')?ui.node('scores').querySelector(s):s[0]==='#'?ui.node(s.slice(1)):null,
  querySelectorAll:()=>ui.ghosts,body:{appendChild(x){ui.ghosts.push(x)}}
 };
 const context=vm.createContext({
  document,localStorage:{getItem:k=>ui.store.get(k)||null,setItem:(k,v)=>ui.store.set(k,v)},
  setTimeout(fn){ui.timers.push(fn);return ui.timers.length},clearTimeout(){},
  URL:{createObjectURL:()=> 'blob:fake',revokeObjectURL(){}},
  Blob:class{constructor(parts){this.parts=parts}},
  alert(msg){throw Error('Unexpected alert: '+msg)},
  console
 });
 for(const script of scripts)vm.runInContext(script,context);
 ui.engine=context.SparkExchange;
 ui.state=()=>JSON.parse(ui.store.get('spark-exchange-lab')).game;
 ui.drain=async()=>{
  for(let i=0;i<600;i++){
   if(ui.timers.length)ui.timers.shift()();
   for(let j=0;j<12;j++)await Promise.resolve();
   if(i===599&&ui.timers.length)throw Error('Motion queue stuck');
  }
 };
 return ui;
}
function chooseHand(ui,move){
 ui.node('hand').onclick({target:{closest:()=>({dataset:{index:String(move.index)}})}});
 ui.node('board').onclick({target:{closest:()=>({dataset:{position:String(move.pos)}})}});
}
async function run(){
 const bot=mount('bots');
 const pre=bot.state();
 const chosen=bot.engine.legal(pre,0).sort((a,b)=>b.points-a.points)[0];
 chooseHand(bot,chosen.move);
 await bot.drain();
 assert.equal(bot.state().turn,2,'one human and one bot turn should complete');
 assert.ok(bot.stats.animations>=4,'flight + score/collapse/replenishment should animate');
 assert.equal(bot.ghosts.length,0,'all animation ghost cards removed');
 assert.equal(bot.node('board').children.length,9);
 assert.equal(bot.state().players[0].hand.length,3);
 assert.ok(bot.handUpdates.filter(x=>x.turn%2===1).every(x=>!x.html.includes('data-index=')),'bot cards remain private');
 const hotseat=mount('hotseat');
 assert.equal(hotseat.node('cover').style.display,'flex');
 assert.ok(hotseat.handUpdates.every(x=>!x.html.includes('data-index=')),'first hand hidden until reveal');
 hotseat.node('reveal').onclick();
 const hot=hotseat.engine.legal(hotseat.state(),0).find(o=>o.points>0)||hotseat.engine.legal(hotseat.state(),0)[0];
 chooseHand(hotseat,hot.move);await hotseat.drain();
 assert.equal(hotseat.state().turn,1);
 assert.equal(hotseat.node('cover').style.display,'flex');
 assert.ok(hotseat.handUpdates.filter(x=>x.turn===1&&!x.covered).every(x=>!x.html.includes('data-index=')),'next hand cannot flash');
 const reduced=mount('bots','off');
 const noMotionBefore=reduced.stats.animations;
 chooseHand(reduced,reduced.engine.legal(reduced.state(),0)[0].move);
 assert.equal(reduced.stats.animations,noMotionBefore,'off disables animation');
 return {result:'PASS',animations:bot.stats.animations,hotseatAnimations:hotseat.stats.animations,checks:12};
}
if(require.main===module)run().then(r=>console.log(JSON.stringify(r))).catch(err=>{console.error(err);process.exitCode=1});
module.exports={run};
