'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const read=file=>fs.readFileSync(path.join(__dirname,'..',file),'utf8');
const engine=read('dist/pilehead/engine.js'),print=read('dist/pilehead/print.html');
const simulation=read('dist/pilehead-sim-core.js');
const build=read('scripts/build-vercel.mjs');
const renderServer=read('scripts/render-server.cjs');
assert.match(renderServer,/url\.pathname === '\/livez'/);
assert.match(renderServer,/url\.pathname === '\/readyz'/);
assert.match(renderServer,/duration > 1000 \|\| res\.statusCode >= 500/);
for(const [label,source]of [['engine',engine],['simulation',simulation]])
 assert.doesNotThrow(()=>new vm.Script(source,{filename:label+'.js'}));
assert.match(print,/PILEHEADS/);
assert.match(print,/deck=E\.deck\(\)/);
for(const asset of ['engine.js','playtest.html','stack-sheet.webp','stack-back.webp'])
 assert.ok(build.includes(asset),asset);
assert.match(renderServer, /res\.statusCode = 308/);
const table=read('apps/web/components/game-table.tsx');
for(const name of ['classicHref','Play Classic','Original Classic'])assert.ok(!table.includes(name),name);
globalThis.PileheadEngine=require('../dist/pilehead/engine.js');
const sim=require('../dist/pilehead-sim-core.js');
const report=sim.runSimulation({games:4,players:2,seed:30});
assert.equal(report.game,'pilehead');
assert.equal(report.summary.completed,4);
const baseline=JSON.parse(read('dist/pilehead-simulation-results.json'));
assert.equal(baseline.game,'pilehead');
assert.equal(baseline.conditions.games,120);
console.log('PASS PILEHEADS Next route, simulator, deck and deployment smoke checks');
