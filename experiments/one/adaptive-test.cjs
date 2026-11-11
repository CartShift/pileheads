'use strict';
const assert=require('node:assert/strict'),E=require('./engine.js');
let checks=0;
function check(label,fn){fn();checks++;console.log('PASS '+label)}
check('Adaptive bot uses only its own hand and public pickup history',()=>{
 const a=E.create({mode:'quick',seed:19}),b=JSON.parse(JSON.stringify(a));
 b.people[1].hand=b.people[1].hand.map(c=>({...c,n:8,arrow:'down',id:-c.id-1}));
 b.stock.reverse();
 assert.deepEqual(E.choose(a,0,'adaptive'),E.choose(b,0,'adaptive'));
});
check('Adaptive policy always selects a legal move in short and long matches',()=>{
 for(const mode of ['quick','classic']){
  const g=E.create({mode,seed:13579});
  while(!E.finished(g)){
   const seat=E.active(g),m=E.choose(g,seat,'adaptive');
   assert.ok(E.legal(g,seat).some(x=>x.type===m.type&&x.index===m.index));
   E.play(g,seat,m);
   assert.equal(E.count(g),48);
  }
  assert.ok(g.winner!==null);
 }
});
check('A public pickup pattern can cause the adaptive agent to break a rigid trap',()=>{
 let changed=false;
 for(let seed=1;seed<=400&&!changed;seed++){
  const g=E.create({seed,mode:'quick'});
  g.ashes.push(...g.stock.splice(0)); // fixture for the endgame
  g.log=[{action:'take'},{action:'play'},{action:'take'},{action:'play'}];
  const a=E.choose(g,0,'strategic'),b=E.choose(g,0,'adaptive');
  if(a.type==='play'&&b.type==='play'&&a.index!==b.index)changed=true;
 }
 assert.equal(changed,true,'Adaptive must sometimes act differently when publicly stuck');
});
check('Identical adaptive three-player agents avoid the known endless cycles much more often',()=>{
 let baselineDraw=0,adaptiveDraw=0;
 for(let seed=1;seed<=180;seed++){
  for(const policy of ['strategic','adaptive']){
   const g=E.create({seed:(20261111+seed*71)>>>0,players:3,mode:'classic'});
   while(!E.finished(g)){
    const seat=E.active(g);E.play(g,seat,E.choose(g,seat,policy));
   }
   if(g.draw){if(policy==='strategic')baselineDraw++;else adaptiveDraw++}
   assert.equal(E.count(g),48);
  }
 }
 assert.ok(baselineDraw>12);
 assert.ok(adaptiveDraw<baselineDraw/3,'Baseline draws '+baselineDraw+', adaptive draws '+adaptiveDraw);
});
console.log(JSON.stringify({pass:true,checks}));
