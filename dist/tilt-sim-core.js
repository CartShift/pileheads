/* TILT Joker Lab simulator adapter for the existing SPARK worker.
 * Deterministic paired seeds + reversed strategy seats.
 * No actual UI/deck changes; no access to hidden opponent hands by policy.
 */
(function(root){'use strict';
const P=root.PowerLab;
if(!P)throw Error('TiltSim requires the TILT Joker engine');
const MODES=['plain','joker','match'],OTHERS=['greedy','hoard','random'];
function validate(n,name,min,max){
 if(!Number.isInteger(n)||n<min||n>max)throw Error('Invalid '+name);
 return n;
}
function round(n){return Number(n.toFixed(2))}
function oneGame(mode,seed,styles){
 const g=P.create({mode,seed}),events={attacks:0,burns:0,hits:0,counters:0,
  largeHits:0,hitCards:0,counterCards:0,normalPickups:0,matchingClears:0};
 while(!P.finished(g)){
  const player=P.active(g),move=P.choose(g,player,styles[player]);
  const ev=P.play(g,player,move);
  events.attacks+=+(ev.reason==='joker');
  events.burns+=+(ev.reason==='jokerBurned');
  events.hits+=+(ev.reason==='jokerHit');
  events.counters+=+(ev.reason==='jokerBlocked');
  events.largeHits+=+(ev.reason==='jokerHit'&&ev.taken>=4);
  events.hitCards+=ev.reason==='jokerHit'?ev.taken:0;
  events.counterCards+=ev.reason==='jokerBlocked'?ev.taken:0;
  events.normalPickups+=+(ev.reason==='pickup');
  events.matchingClears+=+(ev.reason==='match');
  if(P.count(g)!==P.DECK_SIZE)throw Error('TILT deck conservation failed');
 }
 return{winner:g.winner,draw:g.draw,turns:g.turn,events};
}
function cohort(mode,versus,pairs,seed){
 const rows=[];
 for(let i=0;i<pairs;i++){
  const gameSeed=(seed+Math.imul(i,1039)+13579)>>>0;
  for(let flip=0;flip<2;flip++){
   const styles=flip?[versus,'timing']:['timing',versus];
   rows.push({...oneGame(mode,gameSeed,styles),styles,seed:gameSeed,flipped:!!flip});
  }
 }
 return rows;
}
function aggregate(rows){
 const len=rows.length,turns=rows.map(r=>r.turns).sort((a,b)=>a-b),
  sum=(key)=>rows.reduce((n,r)=>n+r.events[key],0),
  wins=rows.reduce((n,r)=>n+(r.draw?.5:r.styles[r.winner]==='timing'?1:0),0),
  firstSeat=rows.reduce((n,r)=>n+(r.draw?.5:r.winner===0?1:0),0),
  hits=sum('hits'),counters=sum('counters');
 return{games:len,draws:rows.filter(r=>r.draw).length,
  timingWinPct:round(100*wins/len),
  firstSeatWinPct:round(100*firstSeat/len),
  medianActions:turns[Math.floor(len/2)],
  p90Actions:turns[Math.floor(len*.9)],
  attacksPerGame:round(sum('attacks')/len),
  burnedJokersPerGame:round(sum('burns')/len),
  successfulHitsPerGame:round(hits/len),
  countersPerGame:round(counters/len),
  bigHit4PlusPerGame:round(sum('largeHits')/len),
  meanCardsOnHit:round(sum('hitCards')/Math.max(1,hits)),
  meanCardsOnCounter:round(sum('counterCards')/Math.max(1,counters)),
  regularPickupsPerGame:round(sum('normalPickups')/len),
  numberClearsPerGame:round(sum('matchingClears')/len)
 };
}
function runSimulation({pairsPerMatchup=24,seed=20261112}={}){
 validate(pairsPerMatchup,'pairsPerMatchup',2,150);
 validate(seed,'seed',0,4294967295);
 const modes={};
 for(const mode of MODES){
  const matchups={},all=[];
  for(const versus of OTHERS){
   const rows=cohort(mode,versus,pairsPerMatchup,seed);
   matchups[versus]=aggregate(rows);
   all.push(...rows);
  }
  modes[mode]={mode,matchups,all:aggregate(all)};
 }
 return{format:'tilt-joker-variant-comparison-v1',
  source:'deterministic bot simulation, NOT human playtesting',
  conditions:{
   seed,pairsPerMatchup,
   totalGames:MODES.length*OTHERS.length*pairsPerMatchup*2,
   perMode:OTHERS.length*pairsPerMatchup*2,
   players:2,coreCards:32,jokers:2,extraCardsAside:16,
   referencePolicy:'timing',challengerPolicies:OTHERS,
   pairing:'For each seed and challenger, run both seat assignments. This does NOT make opponents equally strong.',
   fairInformation:'Bots use only own hand, visible pile and stock count, never opponent cards or hidden stock.',
   limitations:'Winning against a basic bot does not prove greater human skill, player enjoyment or original mechanics. Actions are not elapsed minutes. Physical/touch playtest still required.'
  },modes};
}
root.TiltSim={runSimulation};
})(typeof globalThis!=='undefined'?globalThis:this);
if(typeof module!=='undefined')module.exports=globalThis.TiltSim;
