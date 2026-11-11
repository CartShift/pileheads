'use strict';
const assert=require('node:assert/strict'),E=require('./engine.js');
let checks=0,completed=0;
function check(label,fn){fn();checks++;console.log('OK '+label)}
check('Regular mode remains identical in deck size and 3-card hand',()=>{
 const a=E.create({seed:77}),b=E.create({seed:77,mode:'classic'});
 assert.deepEqual(a,b);assert.equal(a.people[0].hand.length,3);
 assert.equal(a.stock.length,42);assert.equal(a.aside.length,0);assert.equal(E.count(a),48);
});
check('Quick mode uses 32 balanced core cards, 16 aside and 4-card hands',()=>{
 const g=E.create({seed:77,mode:'quick'});
 assert.equal(g.mode,'quick');assert.equal(g.handLimit,4);assert.equal(g.stock.length,24);
 assert.equal(g.aside.length,16);assert.ok(g.people.every(p=>p.hand.length===4));
 const inGame=[...g.stock,...g.people.flatMap(p=>p.hand)];
 assert.equal(inGame.length,32);
 for(let n=1;n<=8;n++)for(const arrow of ['up','down']){
  assert.equal(inGame.filter(c=>c.n===n&&c.arrow===arrow).length,2);
  assert.equal(g.aside.filter(c=>c.n===n&&c.arrow===arrow).length,1);
 }
 assert.equal(E.count(g),48);
 assert.equal(new Set([...inGame,...g.aside].map(c=>c.id)).size,48);
});
check('Short mode only supports two players until multiplayer validation',()=>{
 assert.throws(()=>E.create({mode:'quick',players:3}),/currently supports 2 players/);
 assert.throws(()=>E.create({mode:'wrong'}),/Unknown mode/);
});
check('Old saved regular games remain countable without new optional fields',()=>{
 const g=E.create({seed:2});
 delete g.mode;delete g.handLimit;delete g.aside;
 assert.equal(E.count(g),48);
 const legal=E.legal(g,0)[0];E.play(g,0,legal);
 assert.equal(E.count(g),48);
 assert.equal(g.people[0].hand.length,3);
});
check('Quick mode produces reproducible full matches without phantom cards',()=>{
 for(let seed=1;seed<=100;seed++){
  const a=E.create({seed:seed*41,mode:'quick'});
  while(!E.finished(a)){
   const seat=E.active(a);
   const m=E.choose(a,seat,seat===0?'strategic':'random');
   E.play(a,seat,m);assert.equal(E.count(a),48);
   assert.ok(a.people.every(p=>p.hand.length<=4||(p.pickups>0)));
   assert.ok(a.turn<=E.MAX_TURNS);
  }
  assert.equal(a.draw,false);
  completed++;
 }
 const x=E.simulate({seed:512,mode:'quick'},['strategic','basic']);
 const y=E.simulate({seed:512,mode:'quick'},['strategic','basic']);
 assert.deepEqual(x,y);
});
check('Quick strategic opponent does not read the other hand or unseen core cards',()=>{
 const a=E.create({seed:4321,mode:'quick'}),b=JSON.parse(JSON.stringify(a));
 b.people[1].hand.reverse();
 b.stock.reverse();
 assert.deepEqual(E.choose(a,0,'strategic'),E.choose(b,0,'strategic'));
});
console.log(JSON.stringify({pass:true,checks,completed}));
