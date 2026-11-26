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

// Exercise saves while a human decision is pending, not only between moves.
const clock=E.createEngine({now:()=>12345});
const zones=g=>[g.stock,g.pile,g.ashes,...g.people.flatMap(p=>[p.hand,p.up,p.down])];
function extract(g,predicate){
 for(const zone of zones(g)){const i=zone.findIndex(predicate);if(i>=0)return zone.splice(i,1)[0];}
 throw Error('Fixture card not found');
}
const dump=clock.create({players:3,seed:42});
clock.start(dump);
dump.ashes.push(...dump.stock.splice(0),...dump.people[0].hand.splice(0),...dump.people[0].up.splice(0));
const dumpCard=extract(dump,c=>c.action==='dump');
dump.people[0].down.push(dumpCard);
clock.invariant(dump);
assert.equal(clock.move(dump,0,{type:'play',source:'down',ids:[dumpCard.id]}).type,'dump-pending');
assert.equal(dump.blindReveal.expiresAt,14545);
assert.equal(dump.blindReveal.card.id,undefined);
const restoredDump=clock.restore(clock.serialize(dump));
assert.deepEqual(restoredDump,dump);
assert.deepEqual(clock.resolveDump(restoredDump,0,1),clock.resolveDump(dump,0,1));
assert.deepEqual(restoredDump,dump);
const snap=clock.create({players:3,seed:42});
clock.start(snap);
const first=extract(snap,c=>c.kind==='number'&&c.rank===5);
const next=extract(snap,c=>c.kind==='number'&&c.rank===5);
while(snap.people[0].hand.length>2)snap.stock.unshift(snap.people[0].hand.pop());
while(snap.people[0].hand.length<2)snap.people[0].hand.push(snap.stock.shift());
snap.people[0].hand.push(first);
snap.stock.push(next);
clock.invariant(snap);
clock.move(snap,0,{type:'play',source:'hand',ids:[first.id]});
const pendingSnap=clock.followUpOptions(snap,0)[0];
assert.ok(pendingSnap);
const restoredSnap=clock.restore(clock.serialize(snap));
assert.deepEqual(restoredSnap,snap);
assert.deepEqual(clock.move(restoredSnap,0,pendingSnap),clock.move(snap,0,pendingSnap));
assert.deepEqual(restoredSnap,snap);
const old=clock.create({players:3,seed:8});
for(const z of zones(old))for(let i=z.length-1;i>=0;i--)if(z[i].id>=52)z.splice(i,1);
old.version='pilehead-1.5.0';
assert.equal(clock.count(old),52);
clock.invariant(old);
assert.deepEqual(clock.restore(clock.serialize(old)),old);
console.log('PASS pending DUMP/SNAP, injected blind reveal clock, and legacy 52-card local snapshots');
