'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const E=require('../dist/pilehead/engine.js');
const read=p=>fs.readFileSync(p,'utf8');
const kit=read('dist/pilehead/playtest.html');
const design=read('docs/pilehead-design.md');
const protocol=read('docs/pilehead-playtest-kit.md');
const index=read('dist/pilehead/index.html');
const print=read('dist/pilehead/print.html');
const vercel=read('scripts/build-vercel.mjs');
const readme=read('README.md');

assert.match(kit,/<html lang="en" dir="ltr">/);
assert.match(kit,/lang-he/);
for(const action of Object.keys(E.ACTIONS)){
 assert.match(kit,new RegExp('data-action="'+action+'"'),'Printable rules must explain '+action);
}
for(const feature of ['SLAM','SNAP','LAST-HAND COMBO','DUMP','54-card','2026-11-22','FINAL DUEL']){
 assert.ok(kit.includes(feature),'Missing public playtest detail: '+feature);
}
for(const field of ['sessionId','players','experience','medium','variant','learnMinutes','roundMinutes',
 'ruleClarifications','slamsObserved','slamsMissed','dumpMoments','endgameStalls',
 'spontaneousReplay','wouldChooseOverShithead','fun','clarity','agency','tension','notes']){
 assert.match(kit,new RegExp('name="'+field+'"'),'Missing survey field: '+field);
}
assert.match(kit,/e\.preventDefault\(\)/,'Survey must not submit to a server');
assert.match(kit,/new Blob\(\[JSON\.stringify\(row,null,2\)\]/,'Survey must download a local JSON record');
assert.doesNotMatch(kit,/<form[^>]*action=/,'Playtest must not transmit ratings');
const scripts=[...kit.matchAll(/<script>([\s\S]*?)<\/script>/g)];
assert.equal(scripts.length,1);
assert.doesNotThrow(()=>new vm.Script(scripts[0][1]),'Playtest inline JS must parse');

assert.match(index,/href="playtest\.html">Playtest kit/);
assert.match(print,/href="playtest\.html">Playtest rules/);
assert.match(vercel,/'playtest\.html'/,'Vercel build must include playtest.html');
assert.match(readme,/facilitator-oriented playtest kit\]\(https:\/\/[^)]+\/pilehead\/playtest\.html\)/i,
  "The maintained README must link to the actual hosted facilitator kit");
assert.match(protocol,/Default OFF/,'Experimental rule must not silently affect canonical play');
assert.match(protocol,/no personal/i,'Playtest scorecard must avoid PII');
assert.match(design,/v1\.7 Final Duel, revised 2026-11-22/,'Current playtest rules must identify the v1.7 release');
assert.match(design,/burn DUMP itself/i,'Canonical design must reflect current DUMP behavior');
assert.match(design,/independent four/i,'Canonical design must reflect independent SLAM');
assert.match(design,/LAST-HAND COMBO/);
assert.doesNotMatch(design,/including DUMP, into their hand/i,'Legacy DUMP wording must be removed');

function extract(g,pred){
 const zones=[g.stock,g.pile,g.ashes,...g.people.flatMap(p=>[p.hand,p.up,p.down])];
 for(const a of zones){const at=a.findIndex(pred);if(at>=0)return a.splice(at,1)[0]}
 throw Error('Card not found');
}
const g=E.create({players:2,seed:3207});E.start(g);
const four=Array.from({length:4},()=>extract(g,c=>c.kind==='number'&&c.rank===8));
g.stock.push(...g.people[1].hand.splice(0));g.people[1].hand.push(...four);
g.pile.push(extract(g,c=>c.kind==='number'&&c.rank===2));
g.turn=0;g.slamOpen=false;
assert.ok(E.slamOptions(g,1).length,'Player can independently SLAM four when top run is closed');
const ev=E.autoSlam(g,'greedy',0);
assert.equal(ev?.reason,'slam','Bot must see all legal full-four SLAMs');
assert.equal(g.ashes.length,5);
assert.equal(g.turn,1);
assert.equal(E.invariant(g),true);
console.log('PASS PILEHEAD playtest kit: rules, feedback export, build inclusion and independent SLAM');
