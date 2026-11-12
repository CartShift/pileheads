'use strict';
/* Inspectable simulation, not proof of fun or rules originality.
 * node experiments/power-cards/simulate.cjs --seeds 900 --seed 20261111
 * Counterfactual seat flips reuse the seed, so paired samples are correlated.
 */
const P=require('./engine.js'),Original=require('../one/engine.js');
function flag(name,def,max){
 const i=process.argv.indexOf(name);
 if(i<0)return def;
 const n=Number(process.argv[i+1]);
 if(!Number.isInteger(n)||n<1||n>max)throw Error('Invalid '+name);
 return n;
}
const seeds=flag('--seeds',900,10000),base=flag('--seed',20261111,4294967295),
 fmt=x=>Number(x.toFixed(1));
function run(engine,mode,styles,seed,firstSeat=0){
 const old=engine===Original;
 const g=old?engine.create({seed,mode:'quick',players:2}):
  engine.create({seed,mode,firstSeat});
 let attacks=0,hits=0,counters=0,damage=0,bounce=0,largeHits=0,
  littleHits=0,matchClears=0,pickups=0,hitWhenPileBig=0,challengeUsed=0,
  drawPhase=0,latePhase=0,powerOpportunities=0,regularOpportunities=0,jokersBurned=0;
 while(!engine.finished(g)){
  const seat=engine.active(g),moves=engine.legal(g,seat);
  if(moves.some(m=>m.type==='play'&&g.people[seat].hand[m.index]?.kind==='joker'))
   powerOpportunities++;
  if(moves.some(m=>m.type==='play'&&!g.people[seat].hand[m.index]?.kind))
   regularOpportunities++;
  const move=engine.choose(g,seat,styles[seat]);
  const e=engine.play(g,seat,move);
  attacks+=+(e.reason==='joker');jokersBurned+=+(e.reason==='jokerBurned');
  hits+=+(e.reason==='jokerHit');damage+=e.reason==='jokerHit'?e.taken:0;
  counters+=+(e.reason==='jokerBlocked');bounce+=e.reason==='jokerBlocked'?e.taken:0;
  largeHits+=+(e.reason==='jokerHit'&&e.taken>=4);
  littleHits+=+(e.reason==='jokerHit'&&e.taken<=1);
  matchClears+=+(e.reason==='match');pickups+=+(e.reason==='pickup');
  if(e.reason==='joker'&&e.challenge!==null)challengeUsed++;
  drawPhase+=+(g.stock.length>0);latePhase+=+(g.stock.length===0);
  if(engine.count(g)!==48)throw Error('Deck conservation failed');
 }
 return{g,attacks,hits,counters,damage,bounce,largeHits,littleHits,
  matchClears,pickups,hitWhenPileBig,challengeUsed,drawPhase,latePhase,
  powerOpportunities,regularOpportunities,jokersBurned};
}
function summarize(records,p,q){
 const v={games:records.length,firstWins:0,wins:0,draws:0,turns:[],
  attacks:0,hits:0,counters:0,damage:0,bounce:0,largeHits:0,littleHits:0,
  matchClears:0,pickups:0,drawPhase:0,latePhase:0,challenged:0,powerOpportunities:0,
  normalOpportunities:0,jokersBurned:0};
 for(const r of records){
  v.turns.push(r.g.turn);v.firstWins+=+(r.g.winner===0);v.draws+=+r.g.draw;
  v.wins+=+(p!==q&&r.g.winner!==null&&r.styles?.[r.g.winner]===p);
  v.attacks+=r.attacks;v.hits+=r.hits;v.counters+=r.counters;v.jokersBurned+=r.jokersBurned;
  v.damage+=r.damage;v.bounce+=r.bounce;v.largeHits+=r.largeHits;
  v.littleHits+=r.littleHits;v.matchClears+=r.matchClears;v.pickups+=r.pickups;
  v.drawPhase+=r.drawPhase;v.latePhase+=r.latePhase;
  v.challenged+=r.challengeUsed;v.powerOpportunities+=r.powerOpportunities;
  v.normalOpportunities+=r.regularOpportunities;
 }
 v.turns.sort((a,b)=>a-b);
 const n=v.games;
 return{games:n,draws:v.draws,medianTurns:v.turns[Math.floor(n*.5)],
  p90Turns:v.turns[Math.floor(n*.9)],firstSeatWinPct:fmt(100*(v.firstWins+v.draws*.5)/n),
  ...(p!==q?{firstPolicyWinPct:fmt(100*(v.wins+v.draws*.5)/n)}:{}),
  attacksPerGame:fmt(v.attacks/n),jokersBurnedWithoutAttackPerGame:fmt(v.jokersBurned/n),successfulHitPerGame:fmt(v.hits/n),
  counterPerGame:fmt(v.counters/n),
  largeHit4PlusPerGame:fmt(v.largeHits/n),
  wastedHit0Or1PerGame:fmt(v.littleHits/n),
  meanCardsOnHit:fmt(v.damage/Math.max(1,v.hits)),
  meanCardsOnCounter:fmt(v.bounce/Math.max(1,v.counters)),
  conventionalPickupPerGame:fmt(v.pickups/n),
  matchingClearPerGame:fmt(v.matchClears/n),
  playActionsWithJokerOptionPct:fmt(100*v.powerOpportunities/Math.max(1,v.drawPhase+v.latePhase)),
  postStockActionSharePct:fmt(100*v.latePhase/Math.max(1,v.drawPhase+v.latePhase))};
}
function compare(mode,p,q){
 const records=[];
 for(let i=1;i<=seeds;i++)for(const flip of [0,1]){
  const styles=flip?[q,p]:[p,q],seed=(base+i*71)>>>0;
  records.push({...run(P,mode,styles,seed),styles});
 }
 return{mode,strategies:[p,q],seatPairs:seeds,...summarize(records,p,q)};
}
function symmetric(mode,policy){
 const records=[];
 for(let i=1;i<=seeds;i++)
  records.push(run(P,mode,[policy,policy],(base+i*71)>>>0));
 return{mode,policy,...summarize(records,policy,policy)};
}
function baseline(policy){
 const records=[];
 for(let i=1;i<=seeds;i++)
  records.push(run(Original,'quick',[policy,policy],(base+i*71)>>>0));
 return{mode:'original-quick',policy,...summarize(records,policy,policy)};
}
const report={
 experiment:'2 Jokers / 32-card physical CORE pack. Full pile threat with three counter variants',
 inputs:{seeds,base,seatSwapsForPolicyMatchups:true},
 baseline:[baseline('strategic'),baseline('random')],
 variants:P.MODES.flatMap(mode=>[symmetric(mode,'timing'),symmetric(mode,'greedy'),symmetric(mode,'random')]),
 policyMatchups:P.MODES.flatMap(mode=>[
  compare(mode,'timing','random'),compare(mode,'timing','greedy'),
  compare(mode,'timing','hoard')]),
 limitations:[
  'Winner share against naive opponents is not evidence of human skill or fun.',
  'No counter scheme removes the luck of who is dealt a Joker or specific matching rank.',
  'The rank-counter variant requires a sideways Joker with the target card always visible.',
  'The two Jokers REPLACE two normal CORE cards and must not be appended to the deck.',
  'A Joker played on an empty pile is burned without stealing a turn; this allows a final Joker to finish without a zero-stakes attack.',
  'No multiplayer retail readiness, visual QA, originality clearance or manufacturing feasibility is claimed.'
 ]
};
console.log(JSON.stringify(report,null,2));
