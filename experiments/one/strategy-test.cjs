'use strict';
/* Targeted tests for ONE's information-safe strategic opponent. */
const assert=require('node:assert/strict');
const E=require('./engine.js');
let checks=0;
function check(label,fn){fn();checks++;console.log('OK '+label)}
function relocate(g,seat,card){
 const i=g.stock.findIndex(c=>c.n===card.n&&c.arrow===card.arrow);
 assert.ok(i>=0,'fixture card missing '+JSON.stringify(card));
 g.stock.push(g.people[seat].hand[card.index]);
 g.people[seat].hand[card.index]=g.stock.splice(i,1)[0];
}
function fixed(g){
 // Ensure the first two cards have radically different next-player flexibility.
 relocate(g,0,{index:0,n:1,arrow:'up'});
 relocate(g,0,{index:1,n:8,arrow:'up'});
 g.pile.length=0;
 return g;
}
check('New strategic policy is legal in 2-, 3- and 4-player matches',()=>{
 for(const players of [2,3,4]){
  const g=E.create({seed:33,players});
  const action=E.choose(g,0,'strategic');
  assert.ok(E.legal(g,0).some(m=>m.type===action.type&&m.index===action.index));
  E.play(g,0,action);
  assert.equal(E.count(g),48);
 }
});
check('Early game plays flexible UP 1 instead of restrictive UP 8',()=>{
 const g=fixed(E.create({seed:20261111}));
 assert.equal(g.stock.length,42);
 const move=E.choose(g,0,'strategic');
 assert.equal(move.index,0);
});
check('After draw stock empties, pressure chooses UP 8 instead of UP 1',()=>{
 const g=fixed(E.create({seed:20261111}));
 g.ashes.push(...g.stock.splice(0));
 assert.equal(g.stock.length,0);
 const move=E.choose(g,0,'strategic');
 assert.equal(move.index,1);
 assert.equal(E.count(g),48);
});
check('Strategic bot never inspects hidden opponent cards',()=>{
 const a=E.create({seed:91}),b=JSON.parse(JSON.stringify(a));
 b.people[1].hand=b.people[1].hand.map(c=>({...c,n:8,arrow:'down',id:-c.id-1}));
 assert.deepEqual(E.choose(a,0,'strategic'),E.choose(b,0,'strategic'));
});
check('Strategic bot never depends on order or identity of unseen stock',()=>{
 const a=E.create({seed:124}),b=JSON.parse(JSON.stringify(a));
 b.stock.reverse();
 assert.deepEqual(E.choose(a,0,'strategic'),E.choose(b,0,'strategic'));
});
check('Public top-card info can influence choice, but rules stay unchanged',()=>{
 const a=E.create({seed:301}),before=E.deck();
 for(let seed=1;seed<=75;seed++){
  const g=E.create({seed});
  while(!E.finished(g)){
   const seat=E.active(g);
   const action=E.choose(g,seat,'strategic');
   assert.ok(E.legal(g,seat).some(m=>m.type===action.type&&m.index===action.index));
   E.play(g,seat,action);
   assert.equal(E.count(g),48);
  }
 }
 assert.deepEqual(E.deck(),before);
});
console.log(JSON.stringify({pass:true,checks}));
