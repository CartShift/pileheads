'use strict';
/* STACK late-game attrition research.
 * To run manually: node scripts/bench-endgame-attrition.cjs
 * This script deliberately does NOT patch the deployed rules.
 * It compares vanilla engine with an in-memory prototype of one-card erosion:
 * once draw stock is empty, burn bottom pile card before every pickup.
 */
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const source=fs.readFileSync(path.join(__dirname,'../dist/pilehead/engine.js'),'utf8');
const anchor=' const n=g.pile.length;g.people[seat].hand.push(...g.pile.splice(0));g.people[seat].pickups++;';
assert(source.includes(anchor),'Take implementation changed; review erosion design');
function makeEngine(erosion){
 const root={};
 const content=erosion?source.replace(anchor,
   ' if(!g.stock.length)g.ashes.push(g.pile.shift());'+anchor):source;
 new Function('globalThis','module',content)(root,{exports:{}});
 return root.PileheadEngine;
}
const baseline=makeEngine(false),candidate=makeEngine(true);
function signature(g){
 const ids=c=>c.map(x=>x.id).sort((a,b)=>a-b).join(',');
 return [
  g.turn,g.phase,g.limit?.type,g.limit?.value,g.stock.length,
  ids(g.ashes),g.pile.map(x=>x.id).join(','),g.slamOpen,
  ...g.people.map(p=>[ids(p.hand),ids(p.up),ids(p.down),p.out].join('/'))
 ].join('|');
}
function play(E,seed,players,maxMoves=1800){
 const g=E.create({players,seed});
 for(let i=0;i<players;i++)E.autoSetup(g,i);
 E.start(g);
 const seen=new Map();
 let cycle=null,maxNoProgress=0,noProgress=0;
 for(let i=0;i<maxMoves&&g.phase==='play';i++){
  const sig=signature(g);
  if(cycle===null&&seen.has(sig))cycle={from:seen.get(sig),to:g.moves,
    period:g.moves-seen.get(sig)};
  seen.set(sig,g.moves);
  const progressBefore=[
   g.stock.length,g.ashes.length,g.finishedOrder.length,
   ...g.people.map(p=>p.up.length+p.down.length)].join(':');
  if(g.pendingDump)E.resolveDump(g,g.pendingDump.seat,E.botDumpTarget(g,g.pendingDump.seat));
  else E.move(g,g.turn,E.choose(g,g.turn,['greedy','saver','random'][g.turn%3]));
  const progressAfter=[
   g.stock.length,g.ashes.length,g.finishedOrder.length,
   ...g.people.map(p=>p.up.length+p.down.length)].join(':');
  noProgress=progressBefore===progressAfter?noProgress+1:0;
  maxNoProgress=Math.max(maxNoProgress,noProgress);
  E.invariant(g);
 }
 return {seed,moves:g.moves,finished:g.phase==='over',cycle,maxNoProgress};
}
function distribution(E,players,n=250){
 const a=[];
 for(let i=0;i<n;i++)a.push(play(E,20261121+i*17,players));
 const sorted=a.map(x=>x.moves).sort((x,y)=>x-y);
 return {
  games:n,finished:a.filter(x=>x.finished).length,
  median:sorted[Math.floor(n*.5)],p95:sorted[Math.floor(n*.95)],
  max:sorted.at(-1),over200:sorted.filter(x=>x>200).length,
  maxNoProgress:Math.max(...a.map(x=>x.maxNoProgress))
 };
}
const pathological=[20263535,20264844].map(seed=>({
 seed,existing:play(baseline,seed,2,2000),proposed:play(candidate,seed,2,2000)
}));
for(const {existing,proposed} of pathological){
 assert(existing.cycle&&[15,18].includes(existing.cycle.period),'known loop not reproduced');
 assert(!existing.finished,'baseline should demonstrate a recurring state');
 assert(proposed.finished,'one-card pickup erosion must terminate known loop');
}
const report={
 rule:'After draw stock is exhausted, each pile pickup burns the bottom card and adds the rest to the takers hand',
 pathological,
 twoPlayers:{current:distribution(baseline,2),erosion:distribution(candidate,2)},
 fourPlayers:{current:distribution(baseline,4),erosion:distribution(candidate,4)}
};
console.log(JSON.stringify(report,null,2));
