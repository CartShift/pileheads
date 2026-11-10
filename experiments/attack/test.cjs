'use strict';
/* Run: node experiments/attack/test.cjs */
const assert=require('node:assert/strict');
const E=require('./engine.js');
let checks=0,matches=0,turns=0;
function check(name,fn){fn();checks++;console.log('OK '+name)}
check('Capturing three or more always removes all matched cards',()=>{
 const r=E.resolve(['B','B','B','P','P','P','G']);
 assert.equal(r.waves.length,1);
 assert.equal(r.captured.length,6);
 assert.deepEqual(r.row,['G']);
});
check('Successful Attack sends one captured card and permits an extra discard',()=>{
 const g=E.create({seed:1,mode:'attack'});
 const before=g.players.map(p=>p.hand.length);
 const move=E.legal(g,0).find(x=>x.scored);
 assert.ok(move);
 let x=E.place(g,0,move.move.index,move.move.pos);
 assert.equal(x.status,'discard');
 assert.equal(x.record.received.length,1);
 assert.equal(g.players[1].hand.length,before[1]+1);
 assert.equal(g.players[0].hand.length,before[0]-1);
 assert.equal(g.turn,0);
 const selected=g.players[0].hand[0];
 x=E.discard(g,0,0);
 assert.equal(x.status,'done');
 assert.equal(x.color,selected);
 assert.equal(g.players[0].hand.length,before[0]-2);
 assert.equal(g.turn,1);
 assert.equal(E.conservation(g),g.deckSize);
});
check('Chains send exactly one captured card per matching wave',()=>{
 const g=E.create({seed:5,mode:'chains'});
 const op=E.legal(g,0).find(x=>x.waves.length>=2);
 assert.ok(op,'must find 2-wave fixture');
 let r=E.place(g,0,op.move.index,op.move.pos),record=r.record;
 assert.equal(record.waves.length,2);
 assert.equal(record.received.length,2);
 assert.deepEqual(record.penaltyIndices,[0,record.waves[0].removed.length]);
 assert.equal(g.players[1].hand.length,11);
 assert.equal(r.remaining,2);
 r=E.discard(g,0,0);assert.equal(r.remaining,1);
 r=E.discard(g,0,0);assert.equal(r.status,'done');
 assert.equal(g.players[0].hand.length,6);
 assert.equal(E.conservation(g),144);
});
check('No-penalty mode keeps opponent hand unchanged',()=>{
 const g=E.create({seed:1,mode:'no-penalty'});
 const op=E.legal(g,0).find(x=>x.scored);
 let r=E.place(g,0,op.move.index,op.move.pos);
 assert.equal(r.record.received.length,0);
 assert.equal(r.record.penaltyIndices.length,0);
 assert.equal(g.players[1].hand.length,9);
 E.discard(g,0,0);
 assert.equal(g.players[0].hand.length,7);
 assert.equal(E.conservation(g),144);
});
check('Zero-score move exchanges rightmost card into the hand',()=>{
 for(const mode of ['attack','chains','no-penalty']){
  const g=E.create({seed:1,mode}),old=g.players[0].hand.length;
  const m=E.legal(g,0).find(x=>!x.scored);
  const r=E.place(g,0,m.move.index,m.move.pos);
  assert.equal(r.status,'done');assert.ok(r.record.taken);
  assert.equal(g.players[0].hand.length,old);
  assert.equal(g.players[1].hand.length,old);
  assert.equal(E.conservation(g),144);
 }
});
check('Reject illegal moves, wrong seats and extra discards',()=>{
 const g=E.create({seed:2,mode:'attack'});
 assert.throws(()=>E.place(g,1,0,0),/Wrong turn/);
 assert.throws(()=>E.place(g,0,999,0),/Illegal placement/);
 assert.throws(()=>E.place(g,0,0,9),/Illegal placement/);
 assert.throws(()=>E.discard(g,0,0),/No pending discard/);
});
check('Pending discard survives JSON save/reload',()=>{
 const g=E.create({seed:1,mode:'attack'});
 const m=E.legal(g,0).find(x=>x.scored);
 E.place(g,0,m.move.index,m.move.pos);
 const saved=JSON.parse(JSON.stringify(g));
 assert.ok(saved.pending&&saved.pending.remaining===1);
 E.discard(saved,0,0);
 assert.equal(saved.pending,null);assert.equal(saved.turn,1);
 assert.equal(E.conservation(saved),144);
});
check('Seeded simulations are deterministic and terminate safely',()=>{
 for(const mode of ['attack','chains','no-penalty']){
  const args={seed:420,mode,initialHand:9};
  assert.deepEqual(E.run(args),E.run(args));
  const r=E.run(args);
  assert.ok(r.turns<=240);
  assert.ok(['winner','stock_exhausted','no_safe_refill','no_legal_moves','turn_limit'].includes(r.endedBy));
  if(r.endedBy==='winner'){
   assert.ok(r.winner===0||r.winner===1);
   assert.equal(r.handSizes[r.winner],0);
  }
 }
});
check('Full games retain card conservation and correct turn order',()=>{
 for(const mode of ['attack','chains','no-penalty'])for(const hand of [7,9,11])for(let seed=171;seed<179;seed++){
  const g=E.create({seed,mode,initialHand:hand}),policies=['planner','greedy'];
  while(!g.blocked&&!g.drawn&&g.winner===null){
   const seat=g.turn%2,legal=E.legal(g,seat);assert.ok(legal.length,'non-terminal state must have legal move');
   const m=E.choose(g,seat,policies[seat]);
   let r=E.place(g,seat,m.index,m.pos);
   assert.equal(E.conservation(g),144);
   assert.equal(g.players.length,2);
   while(r.status==='discard'){
    const ix=E.discardChoice(g,seat,policies[seat]);
    r=E.discard(g,seat,ix);
    assert.equal(E.conservation(g),144);
   }
   turns++;assert.equal(g.turn,turns%1000000===-1?-1:g.log.length);
   assert.ok(g.players.every(p=>p.hand.length>=0));
   if(!g.blocked)assert.equal(g.row.length,9);
  }
  matches++;
  if(g.winner!==null)assert.equal(g.players[g.winner].hand.length,0);
 }
});
console.log(JSON.stringify({checks,matches,turns}));
