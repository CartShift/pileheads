'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../dist/pilehead/endgame-lab-engine.js'),'utf8');
const original=fs.readFileSync(path.join(__dirname,'../dist/pilehead/engine.js'),'utf8');
const html=fs.readFileSync(path.join(__dirname,'../dist/pilehead/endgame-lab.html'),'utf8');
const app=fs.readFileSync(path.join(__dirname,'../dist/pilehead/endgame-lab-app.js'),'utf8');
const manifest=fs.readFileSync(path.join(__dirname,'../scripts/build-vercel.mjs'),'utf8');
const classic=fs.readFileSync(path.join(__dirname,'../dist/pilehead/index.html'),'utf8');
function engine(rule,code=source){
 const root={StackEndgameLabMode:rule};
 new Function('globalThis','module',code)(root,{exports:{}});
 return root.PileheadEngine;
}
const canonical=engine('final-burn',original);
assert.equal(canonical.VERSION,'pilehead-1.6.0');
assert.equal(canonical.ENDGAME_RULE,undefined);
assert(!classic.includes('endgame-lab-app.js'));
assert(!classic.includes('endgame-lab-engine.js'));
for(const asset of ['endgame-lab.html','endgame-lab.css','endgame-lab-engine.js','endgame-lab-app.js']){
 assert(manifest.includes("'"+asset+"'"),'Render build missing '+asset);
}
assert(html.includes('id="lab-rule"'));
assert(html.includes('id="lab-new-seed"'));
assert(html.includes('id="lab-seed-label"'));
assert(!html.includes('src="engine.js"'),'canonical engine must not be loaded');
assert(!html.includes('src="app.js"'),'canonical storage/UI must not be loaded');
assert(!html.includes('src="online.js"'),'experiment must never impersonate online authoritative rules');
assert(app.includes("KEY='pilehead-endgame-lab-v1-'"),'isolated local saves');
assert(app.includes('StackEndgameLabSeed'),'same-seed comparisons');
assert(app.includes('erodedCount'),'erosion is visible in event text');

function state(E,{players=3,active=players,stockEmpty=true,pileCount=3}={}){
 const g=E.create({players,seed:20261121});
 for(let i=0;i<players;i++)E.autoSetup(g,i);
 E.start(g);
 if(stockEmpty)g.people[1].hand.push(...g.stock.splice(0));
 if(pileCount)g.pile.push(...g.people[1].hand.splice(0,pileCount));
 for(let seat=active;seat<players;seat++){
  const p=g.people[seat];g.ashes.push(...p.hand.splice(0),...p.up.splice(0),...p.down.splice(0));
  p.out=true;g.finishedOrder.push(seat);
 }
 E.invariant(g);
 return g;
}
function forceSlot(g,array,index,test){
 if(test(array[index]))return array[index];
 const zones=[g.stock,g.pile,g.ashes,...g.people.flatMap(p=>[p.hand,p.up,p.down])];
 for(const zone of zones){
  const i=zone.findIndex(test);if(i<0)continue;
  [array[index],zone[i]]=[zone[i],array[index]];
  return array[index];
 }
 throw Error('Required card missing from deck');
}
function verify(E,rule){
 const pre=state(E,{stockEmpty:false});
 assert(pre.stock.length>0);
 const previousTop=pre.pile.at(-1).id;
 const preTake=E.move(pre,0,{type:'take'});
 assert.equal(preTake.erodedCount,0,'stock present must keep original rules');
 assert(pre.people[0].hand.some(c=>c.id===previousTop));
 E.invariant(pre);

 const active=state(E,{players:3,active:rule==='final-duel'?3:3});
 const shouldBurn=rule==='final-burn';
 const top=active.pile.at(-1).id;
 const before=active.ashes.length;
 const event=E.move(active,0,{type:'take'});
 assert.equal(event.erodedCount,shouldBurn?1:0,'correct activation by player count');
 assert.equal(active.ashes.length,before+(shouldBurn?1:0));
 assert.equal(active.people[0].hand.some(c=>c.id===top),!shouldBurn,'visible top moved to proper zone');
 assert.equal(event.takenCount,event.count-(shouldBurn?1:0));
 E.invariant(active);

 const duel=state(E,{players:3,active:2});
 const topDuel=duel.pile.at(-1).id;
 const duelEv=E.move(duel,0,{type:'take'});
 assert.equal(duelEv.erodedCount,1,'two active players must trigger both variants');
 assert(duel.ashes.some(c=>c.id===topDuel));E.invariant(duel);

 // A one-card voluntary pickup must burn one card without taking any cards.
 const solo=state(E,{players:2,pileCount:1});
 const one=solo.pile[0].id;
 const beforeHand=solo.people[0].hand.length;
 const soloEv=E.move(solo,0,{type:'take'});
 assert.equal(soloEv.takenCount,0);
 assert.equal(soloEv.erodedCount,1);
 assert.equal(solo.people[0].hand.length,beforeHand);
 assert(solo.ashes.some(c=>c.id===one));E.invariant(solo);

 // Forced DUMP with selected target must also erode exactly one top card.
 const direct=state(E,{players:2});
 const dump=forceSlot(direct,direct.people[0].hand,0,c=>c.action==='dump');
 const directTop=direct.pile.at(-1).id;
 const directEv=E.move(direct,0,{type:'play',source:'hand',ids:[dump.id],target:1});
 assert.equal(directEv.reason,'dump');
 assert.equal(directEv.erodedCount,1);
 assert(direct.ashes.some(c=>c.id===directTop));E.invariant(direct);

 // Blind DUMP defers target resolution; the erosion must occur once, not twice.
 const pending=state(E,{players:2});
 const blind=forceSlot(pending,pending.people[0].down,0,c=>c.action==='dump');
 const other=pending.people[1];
 other.hand.push(...pending.people[0].hand.splice(0),
  ...pending.people[0].up.splice(0),...pending.people[0].down.splice(1));
 assert.equal(E.stage(pending,0),'down');
 const pendingTop=pending.pile.at(-1).id;
 const revealed=E.move(pending,0,{type:'play',source:'down',ids:[blind.id]});
 assert.equal(revealed.type,'dump-pending');
 assert.equal(pending.ashes.some(c=>c.id===pendingTop),false);
 const resolved=E.resolveDump(pending,0,1);
 assert.equal(resolved.erodedCount,1);
 assert.equal(pending.ashes.filter(c=>c.id===pendingTop).length,1);
 E.invariant(pending);

 // Blind failure: the newly revealed bad card is topmost and must be burned.
 const fail=state(E,{players:2});
 const bad=forceSlot(fail,fail.people[0].down,0,c=>c.kind==='number'&&c.rank<10);
 fail.people[1].hand.push(...fail.people[0].hand.splice(0),
  ...fail.people[0].up.splice(0),...fail.people[0].down.splice(1));
 fail.limit={type:'min',value:10};
 const failEv=E.move(fail,0,{type:'play',source:'down',ids:[bad.id]});
 assert.equal(failEv.type,'blind-fail');
 assert.equal(failEv.erodedCount,1);
 assert(fail.ashes.some(c=>c.id===bad.id));E.invariant(fail);

 // Exact one-card failed blind flip must finish the player, not strand an
 // already empty player in the game with no legal options.
 const last=state(E,{players:2,pileCount:0});
 const lastBad=forceSlot(last,last.people[0].down,0,c=>c.kind==='number'&&c.rank<10);
 last.people[1].hand.push(...last.people[0].hand.splice(0),
  ...last.people[0].up.splice(0),...last.people[0].down.splice(1));
 last.limit={type:'min',value:10};
 const lastEv=E.move(last,0,{type:'play',source:'down',ids:[lastBad.id]});
 assert.equal(lastEv.type,'blind-fail');
 assert.equal(lastEv.erodedCount,1);
 assert(last.people[0].out,'last card must allow finish');
 assert.equal(last.phase,'over');
 E.invariant(last);
}
for(const rule of ['final-burn','final-duel']){
 const E=engine(rule);
 assert.equal(E.ENDGAME_RULE,rule);
 assert.equal(E.VERSION,'pilehead-lab-1.6.1');
 verify(E,rule);
 for(const seed of [20263535,20264844]){
  const g=E.create({players:2,seed});for(let j=0;j<2;j++)E.autoSetup(g,j);E.start(g);
  for(let i=0;i<2000&&g.phase==='play';i++){
   if(g.pendingDump)E.resolveDump(g,g.pendingDump.seat,E.botDumpTarget(g,g.pendingDump.seat));
   else E.move(g,g.turn,E.choose(g,g.turn,g.turn?'saver':'greedy'));
  }
  assert.equal(g.phase,'over','pathological loop must finish: '+rule+'/'+seed);
  E.invariant(g);
 }
}
console.log('PASS Endgame Lab: isolated production, activation, take, blind-fail, DUMP both paths, card conservation, exact infinite loops');
