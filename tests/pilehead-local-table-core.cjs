'use strict';
const assert=require('node:assert/strict');
const E=require('../packages/game-engine').createEngine({now:()=>0});
const {localBotOpportunity,asLocalRoom}=require('../apps/web/lib/local-table-core.cjs');
for(const players of [2,3,4,5])for(let seed=1;seed<=12;seed++){
 const g=E.create({players,seed});
 for(let i=0;i<players;i++)E.autoSetup(g,i);
 const setup=asLocalRoom(E,g);
 assert.equal(setup.phase,'setup');
 assert.equal(localBotOpportunity(E,g),null);
 assert.deepEqual(setup.legal,[]);
 g.starterSeat=seed%players;E.start(g);
 for(let step=0;step<40&&g.phase==='play';step++){
  const before=JSON.stringify(g),v=asLocalRoom(E,g),bot=localBotOpportunity(E,g);
  assert.equal(JSON.stringify(g),before,'selectors must not mutate engine state');
  assert.equal(v.stockCount,g.stock.length);
  assert.equal(v.ashesCount,g.ashes.length);
  assert.deepEqual(v.pile,g.pile);
  assert.deepEqual(v.legal,g.turn===0?E.options(g,0):[]);
  assert.deepEqual(v.followup,E.followUpOptions(g,0));
  assert.deepEqual(v.slam,E.slamOptions(g,0));
  for(const p of v.players){
   assert.equal(p.handCount,g.people[p.seat].hand.length);
   assert.deepEqual(p.blindSlots,Array.from({length:p.downCount},(_,i)=>i));
  }
  if(bot)assert.ok(bot.seat>0&&!g.people[bot.seat].out);
  if(g.pendingDump)E.resolveDump(g,g.pendingDump.seat,E.botDumpTarget(g,g.pendingDump.seat));
  else if(bot?.kind==='snap')E.move(g,bot.seat,E.followUpOptions(g,bot.seat)[0]);
  else if(bot?.kind==='slam')E.move(g,bot.seat,E.slamOptions(g,bot.seat)[0]);
  else E.move(g,g.turn,E.choose(g,g.turn));
  E.invariant(g);
 }
}
const fixture={phase:'play',pendingDump:{seat:0},people:[],turn:0};
assert.equal(localBotOpportunity(E,fixture),null);
assert.deepEqual(localBotOpportunity(E,{...fixture,pendingDump:{seat:2}}),{seat:2,kind:'dump',ids:''});
console.log('PASS local table projection and bot selector parity across seeded games');
