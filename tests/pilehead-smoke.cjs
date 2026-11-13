'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const read=p=>fs.readFileSync(require('node:path').join(__dirname,'..',p),'utf8');
const app=read('dist/pilehead/app.js'),engine=read('dist/pilehead/engine.js'),html=read('dist/pilehead/index.html');
const print=read('dist/pilehead/print.html'),hub=read('dist/index.html'),worker=read('dist/simulation.worker.js');
for(const [name,code]of [['engine',engine],['table',app],['simulation',read('dist/pilehead-sim-core.js')]])
 assert.doesNotThrow(()=>new vm.Script(code,{filename:name+'.js'}),'Script parsing: '+name);
assert.match(html,/src="engine\.js"/);assert.match(html,/src="app\.js"/);
assert.match(html,/prefers-reduced-motion/);assert.match(html,/href="\.\.\/index\.html"/);
assert.match(app,/data-card=.*data-source/);assert.match(app,/if\(back\)return/);
assert.match(app,/Flip face-down card/);assert.match(app,/back:true,interactive:canDown/);
assert.match(app,/E\.slamOptions/);assert.match(app,/E\.invariant/);
assert.match(app,/pilehead-playtest-v01/);
assert.match(print,/PILEHEAD/);assert.match(print,/deck=E\.deck\(\)/);
assert.match(hub,/PILEHEAD ·/);assert.match(hub,/pileheadSimulationView/);
assert.match(worker,/pilehead\/engine\.js/);assert.match(worker,/PileheadSim\.runSimulation/);
for(const build of ['scripts/build.mjs','scripts/build-vercel.mjs']){
 const body=read(build);assert.match(body,/pilehead\/index\.html|pilehead'\)/);
 assert.match(body,/pilehead-sim-core\.js/)}
const baseline=JSON.parse(read('dist/pilehead-simulation-results.json'));
assert.equal(baseline.game,'pilehead');assert.equal(baseline.conditions.games,120);
console.log('PASS PILEHEAD UI, simulator, printable deck and deployment asset smoke checks');
