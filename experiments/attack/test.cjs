'use strict';
/* Run: node experiments/attack/test.cjs */
const assert=require('node:assert/strict');
const E=require('./engine.js');
let checks=0,matches=0,turns=0;
function check(name,fn){fn();checks++;console.log('OK '+name)}
check('Three or more cards resolve in consecutive waves',()=>{
 const r=E.resolve(['B','B','B','P','P','P','G']);
 assert.equal(r.waves.length,1);
 assert.equal(r.captured.length,6);
 assert.deepEqual(r.row,['G']);
});
check('Attack gives exactly one optional bonus instead of discarding',()=>{
 const g=E.create({seed:1,mode:'attack'}),before=g.players.map(p=>p.hand.length);
 const move=E.legal(g,0).find(x=>x.scored);
 assert.ok(move);
 const x=E.place(g,0,move.move.index,move.move.pos);
 assert.equal(x.status,'bonus');
 assert.equal(g.pending.kind,'bonus');
 assert.equal(g.players[1].hand.length,before[1]+1);
 assert.equal(g.players[0].hand.length,before[0]-1);
 assert.equal(g.turn,0);
 assert.ok(E.legal(g,0).length>0);
 assert.equal(E.legal(g,1).length,0,'Opponent cannot interrupt bonus');
 assert.equal(E.conservation(g),144);
 const end=E.endBonus(g,0);
 assert.equal(end.status,'done');
 assert.equal(g.turn,1);
 assert.equal(g.pending,null);
 assert.equal(g.players[0].hand.length,before[0]-1);
 assert.equal(g.log[0].actions.length,1);
 assert.equal(g.log[0].bonusUsed,false);
 assert.equal(E.conservation(g),144);
});
check('Bonus can attack but never grants a third placement',()=>{
 let found;
 for(let seed=1;seed<300&&!found;seed++){
  const g=E.create({seed,mode:'attack'});
  for(const m of E.legal(g,0).filter(x=>x.scored).slice(0,8)){
   const candidate=E.create({seed,mode:'attack'});
   const first=E.place(candidate,0,m.move.index,m.move.pos);
   if(first.status==='bonus'&&E.legal(candidate,0).some(x=>x.scored)){found={candidate,first};break}
  }
 }
 assert.ok(found,'Expected a seeded double-merge fixture');
 const {candidate:g}=found;
 const before=g.players[1].hand.length;
 const next=E.legal(g,0).find(x=>x.scored);
 const r=E.place(g,0,next.move.index,next.move.pos);
 assert.equal(r.status,'done');
 assert.equal(g.pending,null);
 assert.equal(g.turn,1);
 assert.equal(g.log[0].actions.length,2);
 assert.equal(g.log[0].bonusUsed,true);
 assert.equal(g.log[0].bonusAttacks,1);
 assert.equal(g.players[1].hand.length,before+1);
 assert.throws(()=>E.endBonus(g,0),/No bonus move/);
 assert.equal(E.conservation(g),144);
});
check('Chains send one penalty per wave, with a single bonus only',()=>{
 const g=E.create({seed:5,mode:'chains'});
 const op=E.legal(g,0).find(x=>x.waves.length>=2);
 assert.ok(op);
 const r=E.place(g,0,op.move.index,op.move.pos);
 assert.equal(r.status,'bonus');
 assert.equal(r.record.waves.length,2);
 assert.equal(r.record.received.length,2);
 assert.deepEqual(r.record.penaltyIndices,[0,r.record.waves[0].removed.length]);
 assert.equal(g.players[1].hand.length,11);
 assert.equal(g.players[0].hand.length,8);
 E.endBonus(g,0);
 assert.equal(g.log[0].received.length,2);
 assert.equal(g.log[0].bonusEarned,true);
 assert.equal(E.conservation(g),144);
});
check('No-penalty mode leaves opponent untouched but awards bonus',()=>{
 const g=E.create({seed:1,mode:'no-penalty'});
 const op=E.legal(g,0).find(x=>x.scored);
 const r=E.place(g,0,op.move.index,op.move.pos);
 assert.equal(r.status,'bonus');
 assert.equal(r.record.received.length,0);
 assert.equal(g.players[1].hand.length,9);
 E.endBonus(g,0);
 assert.equal(g.players[0].hand.length,8);
 assert.equal(E.conservation(g),144);
});
check('Zero-score placement exchanges row edge without a bonus',()=>{
 for(const mode of ['attack','chains','no-penalty']){
  const g=E.create({seed:1,mode}),old=g.players[0].hand.length;
  const m=E.legal(g,0).find(x=>!x.scored);
  const r=E.place(g,0,m.move.index,m.move.pos);
  assert.equal(r.status,'done');
  assert.ok(r.record.taken);
  assert.equal(g.players[0].hand.length,old);
  assert.equal(g.turn,1);
  assert.equal(g.pending,null);
  assert.equal(E.conservation(g),144);
 }
});
check('Wrong seats, illegal placements and invalid bonus passes are rejected',()=>{
 const g=E.create({seed:1,mode:'attack'});
 assert.throws(()=>E.place(g,1,0,0),/Wrong turn/);
 assert.throws(()=>E.place(g,0,999,0),/Illegal placement/);
 assert.throws(()=>E.place(g,0,0,9),/Illegal placement/);
 assert.throws(()=>E.endBonus(g,0),/No bonus move/);
 const m=E.legal(g,0).find(x=>x.scored);
 E.place(g,0,m.move.index,m.move.pos);
 assert.throws(()=>E.place(g,1,0,0),/Wrong turn/);
 assert.throws(()=>E.endBonus(g,1),/No bonus move/);
 E.endBonus(g,0);
 assert.throws(()=>E.endBonus(g,0),/No bonus move/);
});
check('Pending bonus survives JSON save/reload and can be passed',()=>{
 const g=E.create({seed:1,mode:'attack'});
 const m=E.legal(g,0).find(x=>x.scored);
 E.place(g,0,m.move.index,m.move.pos);
 const saved=JSON.parse(JSON.stringify(g));
 assert.equal(saved.pending.kind,'bonus');
 assert.equal(saved.pending.actions.length,1);
 E.endBonus(saved,0);
 assert.equal(saved.pending,null);
 assert.equal(saved.turn,1);
 assert.equal(E.conservation(saved),144);
});
check('Empty hand wins instantly without requiring a bonus move',()=>{
 const g=E.create({seed:1,mode:'attack'});
 const choice=E.legal(g,0).find(x=>x.scored);
 assert.ok(choice);
 const color=g.players[0].hand[choice.move.index];
 g.discard.push(...g.players[0].hand.filter((_,i)=>i!==choice.move.index));
 g.players[0].hand=[color];
 assert.equal(E.conservation(g),144);
 const r=E.place(g,0,0,choice.move.pos);
 assert.equal(r.status,'done');
 assert.equal(g.winner,0);
 assert.equal(g.pending,null);
 assert.equal(g.players[0].hand.length,0);
 assert.equal(E.conservation(g),144);
});
check('Seeded simulations are deterministic and terminate safely',()=>{
 for(const mode of ['attack','chains','no-penalty']){
  const args={seed:420,mode,initialHand:9};
  assert.deepEqual(E.run(args),E.run(args));
  const r=E.run(args);
  assert.ok(r.turns<=240);
  assert.ok(['winner','stock_exhausted','no_safe_refill','no_legal_moves','turn_limit'].includes(r.endedBy));
  assert.ok(r.bonusUsed<=r.bonusEarned);
  assert.ok(r.bonusAttacks<=r.bonusUsed);
  if(r.endedBy==='winner'){
   assert.ok(r.winner===0||r.winner===1);
   assert.equal(r.handSizes[r.winner],0);
  }
 }
});
check('Full games conserve all 144 cards and remain turn-bounded',()=>{
 for(const mode of ['attack','chains','no-penalty'])for(const hand of [7,9,11])for(let seed=171;seed<179;seed++){
  const g=E.create({seed,mode,initialHand:hand}),policies=['planner','greedy'];
  while(!g.blocked&&!g.drawn&&g.winner===null){
   const seat=g.turn%2,options=E.legal(g,seat);
   if(!options.length){g.blocked='no_legal_moves';break}
   const move=E.choose(g,seat,policies[seat]);
   let response=E.place(g,seat,move.index,move.pos);
   assert.equal(E.conservation(g),144);
   if(response.status==='bonus'){
    assert.equal(g.turn,g.log.length);
    const options2=E.legal(g,seat);
    assert.ok(options2.length>0);
    const follow=E.choose(g,seat,policies[seat]);
    response=E.place(g,seat,follow.index,follow.pos);
    assert.equal(E.conservation(g),144);
   }
   assert.equal(response.status,'done');
   assert.equal(g.pending,null);
   assert.equal(g.turn,g.log.length);
   assert.ok(g.log.at(-1).actions.length<=2);
   assert.ok(g.players.every(p=>p.hand.length>=0));
   if(!g.blocked)assert.equal(g.row.length,9);
   turns++;
  }
  matches++;
  if(g.winner!==null)assert.equal(g.players[g.winner].hand.length,0);
 }
});
console.log(JSON.stringify({checks,matches,turns}));
