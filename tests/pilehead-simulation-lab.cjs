'use strict';
const assert=require('node:assert/strict');
globalThis.PileheadEngine=require('../dist/pilehead/engine.js');
const {runSimulation,one,PROFILES,DECKS}=require('../dist/pilehead-sim-core.js');
assert.deepEqual(PROFILES,['perfect','attentive','casual','mixed']);
assert.deepEqual(DECKS,['current54','classic54','legacy52']);
for(const players of [2,3,4,5]){
 for(const deckVariant of DECKS){
  const x=runSimulation({games:12,players,seed:12883,reactionProfile:'mixed',deckVariant});
  assert.equal(x.summary.games,12);
  assert.equal(x.summary.completed,12,'must complete '+players+' players '+deckVariant);
  assert.ok(x.summary.meanSnapOpportunities>=x.summary.meanSnaps);
  assert.ok(x.summary.meanSlamOpportunities>=x.summary.meanSlams);
  assert.ok(x.summary.meanBurnCards<=x.summary.meanTotalBurns);
  assert.ok(x.summary.p90Actions>=x.summary.medianActions);
  assert.equal(x.summary.loserBySeat.length,players);
  assert.equal(deckVariant!=='current54'&&x.summary.meanErodedCards!==0,false,'historical rules must not erode');
  assert.deepEqual(x,runSimulation({games:12,players,seed:12883,reactionProfile:'mixed',deckVariant}),
   'same seed must reproduce every measurement');
 }
}
for(const profile of PROFILES){
 const game=one(17819,4,profile,'current54');
 assert.equal(game.completed,true);
 assert.equal(typeof game.snapOpportunities,'number');
 assert.equal(typeof game.slamOpportunities,'number');
}
assert.throws(()=>runSimulation({reactionProfile:'unrealistic'}),/Invalid reaction profile/);
assert.throws(()=>runSimulation({deckVariant:'fantasy'}),/Invalid deck variant/);
console.log('PASS STACK seeded simulation: current vs historical decks, reactions, metrics and repeatability');
