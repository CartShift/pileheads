'use strict';
const assert=require('node:assert/strict');
const {run}=require('../scripts/bench-simulator.cjs');
const args={games:12,maxSteps:300,firstSeed:20261128};
const report=run(args);
assert.deepEqual(report,run(args),'same inputs must produce same benchmark');
assert.equal(report.results.length,8);
for(const c of report.results){
 assert.equal(c.completed+c.capped.length,c.games);
 assert.equal(c.starterGames.reduce((a,b)=>a+b,0),c.games);
 assert.equal(c.starterCompleted.reduce((a,b)=>a+b,0),c.completed);
 assert.equal(c.wins.reduce((a,b)=>a+b,0),c.completed);
 assert.equal(c.losses.reduce((a,b)=>a+b,0),c.completed);
 assert.ok(c.observedMoves.p50<=c.observedMoves.p95&&c.observedMoves.p95<=c.observedMoves.p99);
 assert.ok(c.capped.every(x=>x.steps===args.maxSteps));
}
const capped=run({games:3,maxSteps:1,firstSeed:42});
assert.ok(capped.results.every(c=>c.completed===0&&c.capped.length===3&&c.completedMoves===null));
assert.throws(()=>run({games:0}));
console.log('PASS deterministic simulator benchmark, cohort accounting and capped-game evidence');
