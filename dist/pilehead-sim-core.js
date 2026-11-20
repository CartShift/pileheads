/* STACK diagnostic laboratory. Deterministic strategy probes, never a substitute for human playtests. */
(function(root){'use strict';
const E=root.PileheadEngine;if(!E)throw Error('STACK engine required');
const POLICIES=['greedy','saver','random'];
const PROFILES=['perfect','attentive','casual','mixed'];
const DECKS=['current54','legacy52'];
const maxActions=1200;
const valid=(x,lo,hi,label)=>{if(!Number.isInteger(x)||x<lo||x>hi)throw Error('Invalid '+label);return x};
const decimal=x=>Number(x.toFixed(2));
const seeded=seed=>{let state=(seed^0x819ae49f)>>>0;return ()=>{
 state^=state<<13;state^=state>>>17;state^=state<<5;return (state>>>0)/4294967296;
}};
function legacyDeck(game){
 const zones=[game.stock,game.pile,game.ashes,...game.people.flatMap(p=>[p.hand,p.up,p.down])];
 for(const id of [52,53]){
  const source=zones.find(z=>z.some(c=>c.id===id));
  if(!source)throw Error('Missing historical card '+id);
  const index=source.findIndex(c=>c.id===id);
  if(source===game.stock)source.splice(index,1);
  else{
   const replacement=game.stock.findIndex(c=>c.id<52);
   if(replacement<0)throw Error('Cannot restore historical stock');
   source[index]=game.stock.splice(replacement,1)[0];
  }
 }
 game.version='pilehead-1.5.0';
 E.invariant(game);
}
function reactionChance(profile,seat,type){
 if(profile==='perfect')return 1;
 if(profile==='attentive')return type==='snap'?.80:.86;
 if(profile==='casual')return type==='snap'?.34:.45;
 const awareness=[.92,.72,.48,.29,.64][seat%5];
 return Math.min(1,awareness*(type==='snap'?.82:1));
}
function one(seed,players,profile='mixed',variant='current54'){
 valid(seed,0,0xffffffff,'seed');valid(players,2,5,'players');
 if(!PROFILES.includes(profile))throw Error('Invalid reaction profile');
 if(!DECKS.includes(variant))throw Error('Invalid deck variant');
 const g=E.create({seed,players}),random=seeded(seed);
 if(variant==='legacy52')legacyDeck(g);
 g.people.forEach(p=>E.autoSetup(g,p.seat));E.start(g);
 let iterations=0,snapOpportunities=0,slamOpportunities=0,twoPlayerActions=0;
 while(g.phase==='play'&&iterations++<maxActions){
  if(g.pendingDump){E.resolveDump(g,g.pendingDump.seat,E.botDumpTarget(g,g.pendingDump.seat));continue}
  if(g.people.filter(p=>!p.out).length===2)twoPlayerActions++;
  const candidates=[],follow=g.followUp&&E.followUpOptions(g,g.followUp.seat)[0];
  if(follow){snapOpportunities++;candidates.push({seat:g.followUp.seat,move:follow,type:'snap'})}
  for(const person of g.people){
   const slam=E.slamOptions(g,person.seat)[0];
   if(slam){slamOpportunities++;candidates.push({seat:person.seat,move:slam,type:'slam'})}
  }
  // Shuffle reaction order independently from engine randomness to avoid seat-0 priority.
  for(let i=candidates.length-1;i>0;i--){
   const j=Math.floor(random()*(i+1));[candidates[i],candidates[j]]=[candidates[j],candidates[i]];
  }
  const claimed=candidates.find(r=>random()<reactionChance(profile,r.seat,r.type));
  if(claimed)E.move(g,claimed.seat,claimed.move);
  else E.move(g,g.turn,E.choose(g,g.turn,POLICIES[(g.turn+seed)%POLICIES.length]));
 }
 E.invariant(g);
 const count=predicate=>g.events.filter(predicate).length;
 return{seed,completed:g.phase==='over',actions:g.moves,loser:g.loser,
  pickups:count(e=>e.type==='take'||e.type==='blind-fail'),
  slams:count(e=>e.reason==='slam'),fours:count(e=>e.reason==='four'),
  burns:count(e=>e.burned),burnCards:count(e=>e.reason==='burn'),
  snaps:count(e=>e.reason==='snap'),snapOpportunities,slamOpportunities,
  blindFailures:count(e=>e.type==='blind-fail'),
  actionsPlayed:count(e=>e.action!==null&&e.action!==undefined),
  recoveredPiles:g.people.reduce((n,p)=>n+p.pickups,0),
  twoPlayerActions,remainingStock:g.stock.length};
}
function runSimulation({games=120,players=4,seed=20261113,reactionProfile='mixed',deckVariant='current54'}={}){
 valid(games,1,5000,'games');valid(players,2,5,'players');valid(seed,0,0xffffffff,'seed');
 if(!PROFILES.includes(reactionProfile))throw Error('Invalid reaction profile');
 if(!DECKS.includes(deckVariant))throw Error('Invalid deck variant');
 const rows=Array.from({length:games},(_,i)=>one((seed+Math.imul(i,1777))>>>0,players,reactionProfile,deckVariant));
 const completed=rows.filter(x=>x.completed),sum=key=>rows.reduce((a,r)=>a+r[key],0);
 const mean=key=>decimal(sum(key)/rows.length),ordered=rows.map(r=>r.actions).sort((a,b)=>a-b);
 const quantile=p=>ordered[Math.floor(p*(ordered.length-1))];
 const losers=Array.from({length:players},(_,seat)=>({
  seat,losses:completed.filter(r=>r.loser===seat).length,
  pct:completed.length?decimal(completed.filter(r=>r.loser===seat).length/completed.length*100):0
 }));
 return{game:'pilehead',version:deckVariant==='current54'?E.VERSION:'pilehead-1.5.0',
  conditions:{games,players,seed,maxActions,deckVariant,reactionProfile,
   botPolicies:POLICIES,policyAssignment:'rotated by game seed',
   reactionModel:'deterministic seeded independent recognition probabilities; no wall-clock latency',
   note:'Synthetic diagnostic results only, not real enjoyment, skill or human reaction time.'},
  summary:{games,completed:completed.length,completionPct:decimal(completed.length*100/games),
   capped:games-completed.length,meanActions:mean('actions'),medianActions:quantile(.5),p90Actions:quantile(.9),
   p95Actions:quantile(.95),meanPickups:mean('pickups'),meanSlams:mean('slams'),
   meanSlamOpportunities:mean('slamOpportunities'),meanSnapOpportunities:mean('snapOpportunities'),
   meanSnaps:mean('snaps'),meanFourBurns:mean('fours'),
   meanBurnCards:mean('burnCards'),meanTotalBurns:mean('burns'),
   meanBlindFailures:mean('blindFailures'),meanActionsPlayed:mean('actionsPlayed'),
   meanTwoPlayerActions:mean('twoPlayerActions'),meanRemainingStock:mean('remainingStock'),
   loserBySeat:losers},sample:rows.slice(0,Math.min(rows.length,10))};
}
root.PileheadSim={runSimulation,one,PROFILES,DECKS};
if(typeof module!=='undefined')module.exports=root.PileheadSim;
})(typeof globalThis!=='undefined'?globalThis:this);
