'use strict';
const assert=require('node:assert/strict'),E=require('../dist/pilehead/engine.js');
let checks=0;const test=(name,fn)=>{fn();checks++;console.log('PASS '+name)};
function areas(g){return[g.stock,g.pile,g.ashes,...g.people.flatMap(p=>[p.hand,p.up,p.down])]}
function get(g,action){for(const z of areas(g)){const i=z.findIndex(c=>c.action===action);if(i>=0)return z.splice(i,1)[0]}throw Error('Missing '+action)}
function fixture(action,players=3,source='hand'){
 const g=E.create({seed:63812,players});E.start(g);const p=g.people[0];
 if(source==='up')g.ashes.push(...g.stock.splice(0),...p.hand.splice(0),...p.up.splice(0));
 else g.stock.push(...p.hand.splice(0));
 const two=[get(g,action),get(g,action)];p[source].push(...two);E.invariant(g);
 return{g,two,p};
}
function choices(g,two,source='hand'){
 const opts=E.options(g,0).filter(o=>o.type==='play'&&o.source===source);
 return{first:opts.find(o=>o.ids.length===1&&o.ids[0]===two[0].id),
 second:opts.find(o=>o.ids.length===1&&o.ids[0]===two[1].id),
 pair:opts.find(o=>o.ids.length===2&&two.every(c=>o.ids.includes(c.id)))};
}
test('v1.2 with all 52 cards and unpowered numbers',()=>{
 assert.equal(E.VERSION,'pilehead-1.2.0');assert.equal(E.deck().length,52);
 assert.equal(E.deck().filter(c=>c.kind==='number').length,40);
 for(const n of Object.values(E.ACTIONS))assert.equal(n,2);
});
test('all six matching action kinds can be grouped or played separately',()=>{
 for(const name of Object.keys(E.ACTIONS)){
  const {g,two}=fixture(name),opts=choices(g,two);
  assert.ok(opts.first,'first '+name);assert.ok(opts.second,'second '+name);
  assert.ok(opts.pair,'pair '+name);
  const ev=E.move(g,0,{type:'play',source:'hand',ids:[two[1].id,two[0].id]});
  assert.equal(ev.action,name);assert.equal(ev.count,2);E.invariant(g);
 }
});
test('BURN pair burns once and repeats turn',()=>{
 const {g,two}=fixture('burn');const before=g.ashes.length;
 const ev=E.move(g,0,{type:'play',source:'hand',ids:two.map(c=>c.id)});
 assert.equal(ev.burned,true);assert.equal(g.ashes.length,before+2);assert.equal(g.pile.length,0);
 assert.equal(g.turn,0);E.invariant(g);
});
test('DUMP pair transfers both cards and repeats turn',()=>{
 const {g,two}=fixture('dump'),before=g.people[1].hand.length;
 const ev=E.move(g,0,{type:'play',source:'hand',ids:two.map(c=>c.id)});
 assert.equal(ev.target,1);assert.equal(ev.takenCount,2);
 assert.equal(g.people[1].hand.length,before+2);assert.ok(two.every(c=>g.people[1].hand.some(x=>x.id===c.id)));
 assert.equal(g.pile.length,0);assert.equal(g.turn,0);assert.equal(g.people[1].pickups,1);E.invariant(g);
});
test('SKIP pair skips one player only',()=>{
 const {g,two}=fixture('skip',4);
 E.move(g,0,{type:'play',source:'hand',ids:two.map(c=>c.id)});
 assert.equal(g.turn,2);E.invariant(g);
});
test('UNDER pair applies 1–4 limit once',()=>{
 const {g,two}=fixture('under');
 E.move(g,0,{type:'play',source:'hand',ids:two.map(c=>c.id)});
 assert.equal(g.limit.type,'under');assert.equal(E.isLegal(g,{kind:'number',rank:4}),true);
 assert.equal(E.isLegal(g,{kind:'number',rank:5}),false);assert.equal(g.turn,1);E.invariant(g);
});
test('GHOST preserves limit and RESET removes limit when grouped',()=>{
 for(const action of ['ghost','reset']){
  const {g,two}=fixture(action);g.limit={type:'min',value:8};
  E.move(g,0,{type:'play',source:'hand',ids:two.map(c=>c.id)});
  assert.deepEqual(g.limit,action==='ghost'?{type:'min',value:8}:null);
  assert.equal(g.turn,1);E.invariant(g);
 }
});
test('identical actions also group on face-up layer',()=>{
 const {g,two,p}=fixture('burn',3,'up');
 assert.equal(E.stage(g,0),'up');const group=choices(g,two,'up').pair;assert.ok(group);
 const ev=E.move(g,0,group);assert.equal(ev.count,2);assert.equal(ev.burned,true);
 assert.equal(p.up.length,0);E.invariant(g);
});
test('mixed action kinds and number/action combinations are forbidden',()=>{
 const {g,two}=fixture('reset'),p=g.people[0];
 const burn=get(g,'burn');p.hand.push(burn);
 const z=g.stock.findIndex(c=>c.kind==='number');assert.ok(z>=0);
 const num=g.stock.splice(z,1)[0];p.hand.push(num);
 assert.throws(()=>E.move(g,0,{type:'play',source:'hand',ids:[two[0].id,burn.id]}));
 assert.throws(()=>E.move(g,0,{type:'play',source:'hand',ids:[two[0].id,num.id]}));
 E.invariant(g);
});
test('blind layer remains one card per move',()=>{
 const {g,two,p}=fixture('dump');
 g.ashes.push(...g.stock.splice(0),...p.hand.splice(0),...p.up.splice(0));
 p.down.push(get(g,'dump'),get(g,'dump'));
 assert.equal(E.stage(g,0),'down');
 assert.ok(E.options(g,0).every(o=>o.ids.length===1));
 assert.throws(()=>E.move(g,0,{type:'play',source:'down',ids:two.map(c=>c.id)}));
 E.invariant(g);
});
test('any copy of a number is legal individually, including the fourth copy',()=>{
 const g=E.create({seed:501,players:2});E.start(g);
 g.stock.push(...g.people[0].hand.splice(0));
 const same=[];for(const z of areas(g))for(let i=z.length-1;i>=0;i--)
  if(z[i].kind==='number'&&z[i].rank===4)same.push(z.splice(i,1)[0]);
 g.people[0].hand.push(...same);
 const opts=E.options(g,0);
 for(const c of same)assert.ok(opts.some(o=>o.type==='play'&&o.ids.length===1&&o.ids[0]===c.id));
 assert.ok(opts.some(o=>o.type==='play'&&o.ids.length===4));
 E.invariant(g);
});
console.log('PILEHEAD matching actions: '+checks+' groups passed');
