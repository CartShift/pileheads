'use strict';
/* Endgame Lab comparison; does not change canonical rules.
 * Run: node scripts/bench-endgame-lab.cjs
 */
const fs=require('node:fs');
const path=require('node:path');
const regular=fs.readFileSync(path.join(__dirname,'../dist/pilehead/engine.js'),'utf8');
const lab=fs.readFileSync(path.join(__dirname,'../dist/pilehead/endgame-lab-engine.js'),'utf8');
function load(code,rule){
 const scope={StackEndgameLabMode:rule};
 new Function('globalThis','module',code)(scope,{exports:{}});
 return scope.PileheadEngine;
}
const variants={Classic:load(regular),'Final Burn':load(lab,'final-burn'),'Final Duel':load(lab,'final-duel')};
function simulate(E,players,seed,maxMoves=1800){
 const g=E.create({players,seed});
 // The control cohort is the pre-v1.7 classic 54-card rule, not the new
 // Final Duel default. Only the named experimental engines enable erosion.
 if(E.VERSION==='pilehead-1.7.0'){g.version='pilehead-1.6.0';delete g.endgameRule}
 for(let i=0;i<players;i++)E.autoSetup(g,i);
 E.start(g);
 let longestStall=0,stalled=0;
 for(let i=0;i<maxMoves&&g.phase==='play';i++){
  const before=[g.stock.length,g.ashes.length,g.finishedOrder.length,...g.people.map(p=>p.up.length+p.down.length)].join(':');
  if(g.pendingDump)E.resolveDump(g,g.pendingDump.seat,E.botDumpTarget(g,g.pendingDump.seat));
  else E.move(g,g.turn,E.choose(g,g.turn,['greedy','saver','random'][g.turn%3]));
  const after=[g.stock.length,g.ashes.length,g.finishedOrder.length,...g.people.map(p=>p.up.length+p.down.length)].join(':');
  stalled=before===after?stalled+1:0;
  longestStall=Math.max(longestStall,stalled);
 }
 E.invariant(g);
 return {moves:g.moves,finished:g.phase==='over',longestStall,
  eroded:g.events.reduce((n,e)=>n+(e.erodedCount||0),0)};
}
const report={description:'250 deterministic identical deal seeds per player-count/rules variation',
 maxMoves:1800,policies:['greedy','saver','random'],results:{}};
for(const players of [2,3,4,5]){
 for(const [name,E] of Object.entries(variants)){
  const games=Array.from({length:250},(_,i)=>simulate(E,players,20261121+17*i));
  const moves=games.map(g=>g.moves).sort((a,b)=>a-b);
  report.results[players+'p '+name]={
   completed:games.filter(g=>g.finished).length,
   median:moves[Math.floor(moves.length*.5)],
   p95:moves[Math.floor(moves.length*.95)],
   max:moves.at(-1),
   over200:moves.filter(m=>m>200).length,
   maxStall:Math.max(...games.map(g=>g.longestStall)),
   avgEroded:Math.round(games.reduce((n,g)=>n+g.eroded,0)/games.length*10)/10
  };
 }
}
report.repeatedStateSeeds=[20263535,20264844].map(seed=>({
 seed,...Object.fromEntries(Object.entries(variants).map(([name,E])=>[name,simulate(E,2,seed,2000)]))
}));
console.log(JSON.stringify(report,null,2));
