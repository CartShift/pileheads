'use strict';
const assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'print.html'),'utf8'),E=require('./engine.js');
assert.match(html,/@page\s*\{\s*size:A4/);
const script=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>m[1]);
assert.equal(script.length,1);
const nodes=new Map();
function get(id){
 if(!nodes.has(id))nodes.set(id,{children:[],appendChild(node){this.children.push(node)}});
 return nodes.get(id);
}
vm.runInNewContext(script[0],{globalThis:{ZigzagLab:E},document:{getElementById:get,
 createElement:tag=>({tagName:tag,className:'',innerHTML:''})}});
const pages=get('sheets').children;
assert.equal(pages.length,7,'6 card sheets + 1 rules page');
const cards=pages.slice(0,6).map(x=>x.innerHTML).join('');
assert.equal((cards.match(/<article class="card /g)||[]).length,48);
assert.equal((cards.match(/CORE · BOTH MODES/g)||[]).length,32);
assert.equal((cards.match(/EXTRA · REGULAR/g)||[]).length,16);
assert.equal((cards.match(/class="card up"/g)||[]).length,24);
assert.equal((cards.match(/class="card down"/g)||[]).length,24);
const instructions=pages.at(-1).innerHTML;
assert.match(instructions,/Optional Zigzag/);
assert.match(instructions,/opposite way/);
assert.match(instructions,/32 CORE/);
assert.match(instructions,/Maximum|exactly one more/i);
console.log(JSON.stringify({pass:true,pages:7,cards:48,core:32,extra:16}));
