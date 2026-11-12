'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const P=require('../dist/tilt/engine.js');
const T=require('../dist/tilt-sim-core.js');
const Spark=require('../dist/engine-v5.js');
const SparkSim=require('../dist/sim-core.js');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
let checks=0;
function test(label,fn){fn();checks++;console.log('PASS '+label)}
test('TILT is a separate physical 32 CORE + 16 EXTRA pack with 2 Jokers',()=>{
 const cards=P.deck();
 assert.equal(cards.length,48);
 assert.equal(cards.filter(c=>c.id%3!==2).length,32);
 assert.equal(cards.filter(c=>c.id%3!==2&&c.kind==='joker').length,2);
});
test('TILT comparison supports all three rule variants, paired seats, and real counters',()=>{
 const r=T.runSimulation({pairsPerMatchup:12,seed:20261112});
 assert.equal(r.conditions.totalGames,216);
 assert.deepEqual(Object.keys(r.modes),['plain','joker','match']);
 for(const mode of Object.keys(r.modes)){
  const x=r.modes[mode];
  assert.equal(x.all.games,72);
  assert.equal(x.all.draws,0);
  assert.equal(x.all.burnedJokersPerGame>=0,true);
  assert.ok(x.all.firstSeatWinPct>=0&&x.all.firstSeatWinPct<=100);
  for(const other of ['greedy','hoard','random']){
   const m=x.matchups[other];
   assert.equal(m.games,24);
   assert.ok(m.timingWinPct>=0&&m.timingWinPct<=100);
  }
 }
 assert.equal(r.modes.plain.all.countersPerGame,0);
 assert.ok(r.modes.match.all.countersPerGame>r.modes.joker.all.countersPerGame);
});
test('Seeded reports reproduce exactly, and checked-in baseline is reproducible',()=>{
 const one=T.runSimulation({pairsPerMatchup:6,seed:432123});
 assert.deepEqual(one,T.runSimulation({pairsPerMatchup:6,seed:432123}));
 const saved=JSON.parse(read('dist/tilt-simulation-results.json'));
 assert.deepEqual(T.runSimulation({pairsPerMatchup:saved.conditions.pairsPerMatchup,seed:saved.conditions.seed}),saved);
});
test('Invalid simulation settings are rejected without running a game',()=>{
 for(const options of [{pairsPerMatchup:0},{pairsPerMatchup:1000},{seed:-1},{seed:1.5}])
  assert.throws(()=>T.runSimulation(options),/Invalid /);
});
test('Shared worker dispatches TILT without altering the existing SPARK suite',()=>{
 const imported=[],posted=[],context={
  importScripts:(...paths)=>imported.push(...paths),
  TiltSim:T,SparkSim,
  postMessage:x=>posted.push(x)
 };
 vm.runInNewContext(read('dist/simulation.worker.js'),context,{filename:'simulation.worker.js'});
 for(const asset of ['engine-v5.js','sim-core.js','tilt/engine.js','tilt-sim-core.js'])
  assert.ok(imported.includes(asset),'Missing worker asset: '+asset);
 context.onmessage({data:{suite:'tilt',pairsPerMatchup:3,seed:123}});
 assert.equal(posted.at(-1).ok,true);
 assert.equal(posted.at(-1).suite,'tilt');
 assert.equal(posted.at(-1).result.conditions.totalGames,54);
 context.onmessage({data:{gamesPerMode:6,seed:123}});
 assert.equal(posted.at(-1).ok,true);
 assert.equal(posted.at(-1).suite,'spark');
 assert.equal(posted.at(-1).result.format,'spark-mode-comparison');
});
test('Studio ships a TILT game selector and deep link without overwriting SPARK',()=>{
 const html=read('dist/index.html');
 assert.match(html,/data-sim-suite/);
 assert.match(html,/function tiltSimulationView/);
 assert.match(html,/function sparkSimulationView/);
 assert.match(html,/tilt\/index\.html\?rule=match/);
 assert.match(html,/tilt-simulation-results\.json/);
 assert.match(html,/id="run-tilt-simulation"/);
 const inline=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)];
 for(const script of inline)if(script[1].trim())assert.doesNotThrow(()=>new Function(script[1]));
 const game=read('dist/tilt/index.html');
 assert.match(game,/engine\.js/);assert.match(game,/app\.js/);
 assert.match(game,/screen=sim&amp;suite=tilt/);
});
test('Both output builders include real TILT browser and simulation assets',()=>{
 const workerBuild=read('scripts/build.mjs'),vercelBuild=read('scripts/build-vercel.mjs');
 for(const name of ['tilt/index.html','tilt/engine.js','tilt/app.js','tilt/print.html',
    'tilt-sim-core.js','tilt-simulation-results.json'])assert.ok(workerBuild.includes(name),'Worker build missing '+name);
 assert.match(vercelBuild,/tilt-sim-core\.js/);
 assert.match(vercelBuild,/tilt-simulation-results\.json/);
 assert.match(vercelBuild,/fs\.mkdirSync\(path\.join\(target,'tilt'\)/);
});
console.log(JSON.stringify({pass:true,checks}));
