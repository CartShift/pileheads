'use strict';
/* Synthetic reproducible design comparisons, not proof of human enjoyment.
 * Run: node experiments/zigzag/simulate.cjs --seeds 1000 --seed 20261111
 * Uses separate seat-rotated matches per seed for different bot policies.
 */
const Z=require('./engine.js'),Original=require('../one/engine.js');
function arg(flag,defaultValue,max){
 const k=process.argv.indexOf(flag);if(k<0)return defaultValue;
 const n=Number(process.argv[k+1]);
 if(!Number.isInteger(n)||n<1||n>max)throw Error('Invalid '+flag);
 return n;
}
const seeds=arg('--seeds',1000,10000),seedBase=arg('--seed',20261111,4294967295);
const pct=(n,d)=>Number((100*n/d).toFixed(1)),mean=(n,d)=>Number((n/d).toFixed(1));
function run(engine,type,policies,seed){
 const g=type==='zigzag'?engine.create({seed}):engine.create({seed,mode:'quick',players:2});
 let opportunities=0,chainTurns=0,endgame=0,pickups=0,matched=0,allTurns=0,
  arrowChoiceTurns=0,firstCardAlternatives=0;
 while(!engine.finished(g)){
  const seat=engine.active(g),moves=engine.legal(g,seat);
  if(!moves.length)throw Error('No legal moves while unfinished');
  opportunities+=+moves.some(m=>m.indices?.length===2);
  firstCardAlternatives+=+(new Set(moves.filter(m=>m.type==='play')
   .map(m=>type==='zigzag'?m.indices[0]:m.index)).size>=2);
  arrowChoiceTurns+=+(new Set(moves.filter(m=>m.type==='play')
   .map(m=>type==='zigzag'?g.people[seat].hand[m.indices.at(-1)].arrow:g.people[seat].hand[m.index].arrow)).size>=2);
  const chosen=engine.choose(g,seat,policies[seat]);
  const event=engine.play(g,seat,chosen);
  chainTurns+=+(event.cards?.length===2);
  pickups+=+(event.action==='take');
  matched+=+(event.reason==='match');
  endgame+=+(g.stock.length===0);
  allTurns++;
  if(engine.count(g)!==48)throw Error('Physical card conservation failed');
 }
 return{g,opportunities,chainTurns,endgame,pickups,matched,allTurns,arrowChoiceTurns,firstCardAlternatives};
}
function summarize(records){
 const st={n:records.length,seat0:0,winsA:0,draws:0,turns:[],options:0,chains:0,afterStock:0,
  pickups:0,matches:0,total:0,arrows:0,firstCardAlternatives:0};
 for(const r of records){
  st.seat0+=+(r.g.winner===0);st.draws+=+r.g.draw;
  st.winsA+=+(r.policyA!==undefined&&r.policies[r.g.winner]===r.policyA&&r.g.winner!==null);
  st.turns.push(r.g.turn);st.options+=r.opportunities;st.chains+=r.chainTurns;
  st.afterStock+=r.endgame;st.pickups+=r.pickups;st.matches+=r.matched;
  st.total+=r.allTurns;st.arrows+=r.arrowChoiceTurns;
  st.firstCardAlternatives+=r.firstCardAlternatives;
 }
 st.turns.sort((a,b)=>a-b);
 return{games:st.n,draws:st.draws,medianTurns:st.turns[Math.floor(st.n*.5)],
  p90Turns:st.turns[Math.floor(st.n*.9)],firstSeatWinPct:pct(st.seat0+st.draws*.5,st.n),
  zigzagOpportunityTurnsPct:pct(st.options,st.total),
  actualTwoCardTurnsPct:pct(st.chains,st.total),
  turnsWithDifferentArrowFinishPct:pct(st.arrows,st.total),
  turnsWithDifferentFirstCardsPct:pct(st.firstCardAlternatives,st.total),
  postStockTurnSharePct:pct(st.afterStock,st.total),
  pickupsPerGame:mean(st.pickups,st.n),matchedClearsPerGame:mean(st.matches,st.n),
  ...(records[0]?.policyA!==undefined?{firstPolicyWinPct:pct(st.winsA+st.draws*.5,st.n)}:{})};
}
function symmetric(engine,type,policy){
 const records=[];
 for(let i=1;i<=seeds;i++)records.push(run(engine,type,[policy,policy],(seedBase+i*71)>>>0));
 return{type,policy,...summarize(records)};
}
function duel(policyA,policyB){
 const records=[];
 for(let i=1;i<=seeds;i++)for(const swap of [0,1]){
  const policies=swap?[policyB,policyA]:[policyA,policyB],
   r=run(Z,'zigzag',policies,(seedBase+i*71)>>>0);
  records.push({...r,policies,policyA});
 }
 return{policies:[policyA,policyB],seedPairs:seeds,...summarize(records)};
}
const data={
 experiment:'ZIGZAG optional opposite-arrow second card, maximum two cards per turn',
 input:{seeds,seedBase,seatRotation:true,activeCoreCards:32,originalCustomPackCards:48},
 original:[
  symmetric(Original,'original','strategic'),
  symmetric(Original,'original','basic'),
  symmetric(Original,'original','random')
 ],
 zigzag:[
  symmetric(Z,'zigzag','strategic'),
  symmetric(Z,'zigzag','greedy'),
  symmetric(Z,'zigzag','random'),
  symmetric(Z,'zigzag','single')
 ],
 policyTests:[
  duel('strategic','greedy'),
  duel('strategic','single'),
  duel('strategic','random'),
  duel('greedy','single')
 ],
 caveats:[
  'Computer policy differences are not proof of real human strategic depth or replay desire.',
  'Strategic is a simple heuristic: cards played plus arrow flexibility according to deck stage.',
  'All games within a seed pair share initial chance and are statistically correlated.',
  'A two-card sequence is offered only when its second card follows the first and reverses its arrow.',
  'Playing a matching rank immediately clears and ends the turn, so such a first card cannot chain.',
  'The test engine is deliberately isolated from classic ONE and production SPARK.'
 ]
};
console.log(JSON.stringify(data,null,2));
