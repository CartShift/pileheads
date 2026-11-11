'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'print.html'),'utf8'),E=require('./engine.js');
assert.match(html,/@page\s*\{\s*size:A4/);
const inline=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(x=>x[1]);
assert.equal(inline.length,1);
const nodes=new Map();function get(id){if(!nodes.has(id))nodes.set(id,{id,children:[],appendChild(item){this.children.push(item)}});return nodes.get(id)}
vm.runInNewContext(inline[0],{globalThis:{OneLab:E},document:{getElementById:get,createElement:tag=>({tagName:tag,innerHTML:'',className:''})}});
const pages=get('sheets').children;
assert.equal(pages.length,7,'Six card sheets + one rules page');
const cards=pages.slice(0,6).map(p=>p.innerHTML).join('');
assert.equal((cards.match(/<article class="card /g)||[]).length,48);
assert.equal((cards.match(/class="card up"/g)||[]).length,24);
assert.equal((cards.match(/class="card down"/g)||[]).length,24);
assert.match(pages[6].innerHTML,/TILT ONE/);
assert.match(pages[6].innerHTML,/SAME OR HIGHER/i);
console.log(JSON.stringify({pass:true,pages:7,cards:48,up:24,down:24}));
