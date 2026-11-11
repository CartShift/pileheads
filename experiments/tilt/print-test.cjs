'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'print.html'),'utf8');
assert.match(html,/@page\s*\{\s*size:A4/);
const inline=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>m[1]);
assert.equal(inline.length,1);
const E=require('./engine.js');
const nodes=new Map();
function get(id){
 if(!nodes.has(id))nodes.set(id,{id,children:[],textContent:'',innerHTML:'',
  appendChild(item){this.children.push(item)}});
 return nodes.get(id);
}
vm.runInNewContext(inline[0],{globalThis:{TiltLab:E},document:{
 getElementById:get,createElement:tag=>({tagName:tag,className:'',innerHTML:''})
}});
const sheets=get('sheets').children;
assert.equal(sheets.length,7,'Six A4 card sheets and one rule sheet');
const joined=sheets.slice(0,6).map(s=>s.innerHTML).join('');
const cards=[...joined.matchAll(/<article class="card /g)];
assert.equal(cards.length,48);
const links=[...joined.matchAll(/class="card pivot"/g)].length;
assert.equal(links,12);
assert.match(sheets[6].innerHTML,/CROSS/);
assert.match(sheets[6].innerHTML,/FORGE/);
assert.match(joined,/CREST/);assert.match(joined,/SHADE/);
console.log(JSON.stringify({pass:true,sheets:7,cards:48,links:12}));
