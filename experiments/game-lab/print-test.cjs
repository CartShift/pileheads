'use strict';
/* Print-and-play generator sanity check, no real printer output. */
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'print.html'),'utf8');
const scripts=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(x=>x[1]);
assert.equal(scripts.length,1);
assert.match(html,/@page\s*\{\s*size:A4/);
const nodes=new Map(),control=[];let created=0;
for(const mode of ['claim','signal','both'])control.push({dataset:{mode},onclick:null});
function el(id){
 if(!nodes.has(id)){
  let h='';
  const n={id,children:[],textContent:'',className:'',
    get innerHTML(){return h},set innerHTML(x){h=x;if(x==='')this.children=[]},
    appendChild(child){this.children.push(child)}};
  nodes.set(id,n);
 }
 return nodes.get(id);
}
vm.runInNewContext(scripts[0],{document:{
 getElementById:el,querySelectorAll:selector=>selector==='[data-mode]'?control:[],
 createElement:tag=>{created++;return{tagName:tag,innerHTML:'',className:''}}
},window:{print(){}}});
function countCards(){
 const html=el('sheets').children.map(x=>x.innerHTML).join('');
 return [...html.matchAll(/<article class="card /g)].length;
}
assert.equal(el('sheets').children.length,9,'CLAIM: 8 sheets + score sheet');
assert.equal(countCards(),72);
assert.match(el('sheets').children.at(-1).innerHTML,/P1 TARGET 1/);
control.find(x=>x.dataset.mode==='signal').onclick();
assert.equal(el('sheets').children.length,8,'SIGNAL: 7 sheets + score sheet');
assert.equal(countCards(),60);
control.find(x=>x.dataset.mode==='both').onclick();
assert.equal(el('sheets').children.length,16,'Both decks: 15 sheets + score sheet');
assert.equal(countCards(),132);
assert.match(el('sheets').children.at(-1).innerHTML,/P2 TARGET 3/);
console.log(JSON.stringify({pass:true,claimCards:72,signalCards:60,bothCards:132,sheets:16,created}));
