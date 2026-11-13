/* PILEHEAD simulator, run inside the EXISTING SPARK simulation worker.
   This is bot diagnostic evidence, never a proxy for human enjoyment. */
(function(root){'use strict';
const E=root.PileheadEngine;if(!E)throw Error('PILEHEAD engine is required');
const POLICIES=['greedy','saver','random'];
function valid(n,min,max,name){if(!Number.isInteger(n)||n<min||n>max)throw Error('Invalid '+name);return n}
function round(v){return Number(v.toFixed(2))}
function one(seed,players){
 const g=E.create({seed,players});g.people.forEach(p=>E.autoSetup(g,p.seat));E.start(g);
 let steps=0;while(g.phase==='play'&&steps++<1200){
  const slam=E.autoSlam(g,'greedy');
  if(!slam)E.move(g,g.turn,E.choose(g,g.turn,POLICIES[(g.turn+seed)%POLICIES.length]));
 }
 E.invariant(g);
 const by=(fn)=>g.events.filter(fn).length;
 return{seed,completed:g.phase==='over',actions:g.moves,loser:g.loser,
  pickups:by(e=>e.type==='take'||e.type==='blind-fail'),
  slams:by(e=>e.reason==='slam'),
  fours:by(e=>e.reason==='four'),
  burns:by(e=>e.burned),
  blindFailures:by(e=>e.type==='blind-fail'),
  actionsPlayed:by(e=>e.action!==null&&e.action!==undefined),
  recoveredCards:g.people.reduce((s,p)=>s+p.pickups,0),
  remainingStock:g.stock.length};
}
function runSimulation({games=120,players=4,seed=20261113}={}){
 valid(games,1,500,'games');valid(players,2,5,'players');valid(seed,0,0xffffffff,'seed');
 const rows=[];for(let i=0;i<games;i++)rows.push(one((seed+Math.imul(i,1777))>>>0,players));
 const completed=rows.filter(x=>x.completed),mean=key=>round(rows.reduce((a,r)=>a+r[key],0)/rows.length);
 const ordered=completed.map(r=>r.actions).sort((a,b)=>a-b);
 const pct=p=>round(100*p/rows.length);
 const loserBySeat=Array.from({length:players},(_,seat)=>({
   seat,losses:completed.filter(r=>r.loser===seat).length,
   pct:completed.length?round(100*completed.filter(r=>r.loser===seat).length/completed.length):0}));
 return{game:'pilehead',version:E.VERSION,conditions:{seed,games,players,maxActions:1200,
   botPolicies:POLICIES,policyAssignment:'rotated by seed to reduce seat/strategy confounding',autoSlam:'immediate, perfect detection',
   note:'Diagnostic simulation only. Bot selection is heuristic; human timing, strategy and fun were NOT evaluated.'},
  summary:{games,completed:completed.length,completionPct:pct(completed.length),
   capped:games-completed.length,
   meanActions:mean('actions'),medianActions:ordered.length?ordered[Math.floor(ordered.length/2)]:null,
   p90Actions:ordered.length?ordered[Math.floor(.9*(ordered.length-1))]:null,
   meanPickups:mean('pickups'),meanSlams:mean('slams'),meanFourBurns:mean('fours'),
   meanTotalBurns:mean('burns'),meanBlindFailures:mean('blindFailures'),
   meanActionsPlayed:mean('actionsPlayed'),meanRemainingStock:mean('remainingStock'),
   loserBySeat},sample:rows.slice(0,Math.min(rows.length,10))};
}
root.PileheadSim={runSimulation,one};
if(typeof module!=='undefined')module.exports=root.PileheadSim;
})(typeof globalThis!=='undefined'?globalThis:this);
