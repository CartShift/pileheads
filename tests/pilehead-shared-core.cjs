'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const before=globalThis.PileheadEngine;
const E=require('../packages/game-engine');
assert.equal(globalThis.PileheadEngine,before,'package must not write browser global');
const {renderBrowserBundle,sync}=require('../scripts/sync-game-engine.cjs');
sync({check:true});
const scope=vm.createContext({});
vm.runInContext(renderBrowserBundle(),scope);
const B=scope.PileheadEngine;
assert.deepEqual(Object.keys(E).sort(),Array.from(Object.keys(B)).sort());
const normalize=x=>JSON.parse(JSON.stringify(x));
for(const players of [2,3,4,5])for(const seed of [0,42,123,20261113]){
 const A=E.createEngine({now:()=>1000}), C=B.createEngine({now:()=>1000});
 let a=A.create({players,seed}),b=C.create({players,seed});
 for(let i=0;i<players;i++){A.autoSetup(a,i);C.autoSetup(b,i);}
 A.start(a);C.start(b);
 assert.equal(a.startedAt,1000);
 assert.deepEqual(normalize(a),normalize(b));
 for(let i=0;i<600&&a.phase==='play';i++){
  if(a.pendingDump){const seat=a.pendingDump.seat,target=A.botDumpTarget(a,seat);assert.deepEqual(normalize(A.resolveDump(a,seat,target)),normalize(C.resolveDump(b,seat,target)));}
  else {const seat=a.turn,style=['greedy','saver','random'][seat%3],ma=A.choose(a,seat,style),mb=C.choose(b,seat,style);assert.deepEqual(normalize(ma),normalize(mb));assert.deepEqual(normalize(A.move(a,seat,ma)),normalize(C.move(b,seat,mb)));}
  assert.deepEqual(normalize(a),normalize(b));
  if(i%17===0){a=A.restore(A.serialize(a));b=C.restore(C.serialize(b));assert.deepEqual(normalize(a),normalize(b));}
 }
 A.invariant(a);C.invariant(b);
}
const a=E.create({seed:1,players:2});const copy=E.restore(E.serialize(a));assert.deepEqual(copy,a);assert.notEqual(copy,a);
const bad=JSON.parse(E.serialize(a));bad.state.stock[0]=bad.state.stock[1];assert.throws(()=>E.restore(JSON.stringify(bad)));
assert.throws(()=>E.restore('{"schemaVersion":99,"state":{}}'));
assert.throws(()=>E.restore(JSON.stringify({schemaVersion:1,state:{...a,rng:-1}})));
assert.throws(()=>E.createEngine({now:123}));
assert.equal(E.deck('pilehead-1.5.0').length,52);assert.equal(E.deck().length,54);
const legacy=require('../dist/pilehead/engine.js');assert.equal(legacy.VERSION,E.VERSION);
console.log('PASS shared core package, Classic bundle, fake clock, save/resume, 2–5 seat seeded parity and invalid snapshots');
