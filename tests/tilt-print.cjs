'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'../dist/tilt/print.html'),'utf8'),E=require('../dist/tilt/engine.js');
const inline=html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
assert.ok(inline,'Print script must be present');
assert.match(html,/@page\{size:A4/);
const nodes=new Map();
function get(id){
 if(!nodes.has(id))nodes.set(id,{children:[],appendChild(n){this.children.push(n)}});
 return nodes.get(id);
}
vm.runInNewContext(inline,{globalThis:{PowerLab:E},document:{getElementById:get,
 createElement:tag=>({tagName:tag,innerHTML:'',className:''})}});
const pages=get('sheets').children;
assert.equal(pages.length,7,'Six A4 pages of cards and one rule page');
const cards=pages.slice(0,6).map(p=>p.innerHTML).join('');
assert.equal((cards.match(/<article class="card /g)||[]).length,48);
assert.equal((cards.match(/JOKER · CORE/g)||[]).length,2);
assert.equal((cards.match(/CORE · BOTH MODES/g)||[]).length,30);
assert.equal((cards.match(/EXTRA · OPTIONAL/g)||[]).length,16);
assert.equal((cards.match(/class="card joker"/g)||[]).length,2);
assert.match(cards,/FULL PILE/);
const rules=pages[6].innerHTML;
assert.match(rules,/Joker counter/);
assert.match(rules,/match counter/i);
assert.match(rules,/SAME NUMBER/);
assert.match(rules,/SIDEWAYS/);
assert.match(rules,/32 CORE/);
console.log(JSON.stringify({pass:true,pages:7,cards:48,core:32,jokers:2,extra:16}));
