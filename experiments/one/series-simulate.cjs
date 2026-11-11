'use strict';
/* Repeatable quantitative study of best-of-three and public-information adaptive play.
 * node experiments/one/series-simulate.cjs --sets 700 --seed 20261111
 *
 * Synthetic opponents only. The winner metric measures rules/policy behaviour,
 * not enjoyment, player learning or retail viability.
 */
const E=require('./engine.js'),S=require('./series.js');
function number(name,defaultValue,max){
 const i=process.argv.indexOf(name);
 if(i<0)return defaultValue;
 const n=Number(process.argv[i+1]);
 if(!Number.isInteger(n)||n<1||n>max)throw Error('Invalid '+name);
 return n;
}
const sets=number('--sets',700,10000),seedBase=number('--seed',20261111,4294967295),fmt=x=>Number(x.toFixed(1));
function match(seed,players,policies,mode='classic',firstSeat=0){
 const g=E.create({seed,players,mode,firstSeat});
 while(!E.finished(g)){
  const seat=E.active(g),move=E.choose(g,seat,policies[seat]);
  E.play(g,seat,move);
  if(E.count(g)!==48)throw Error('Card total mismatch');
 }
 return g;
}
function setStudy(policy){
 let wins0=0,played=0,deciders=0,sweeps=0,firstLeadWins=0,rounds=0,draws=0;
 for(let i=1;i<=sets;i++){
  const s=S.create((seedBase+i*61)>>>0);
  while(!s.complete){
   const first=S.firstSeat(s),g=match(S.roundSeed(s),2,[policy,policy],'quick',first);
   if(g.draw){draws++;S.retry(s);continue}
   firstLeadWins+=+(g.winner===first);rounds++;
   S.record(s,g);played++;
   if(!s.complete)S.advance(s);
  }
  wins0+=+(s.wins[0]===2);deciders+=+(s.history.length===3);sweeps+=+(s.history.length===2);
 }
 return{policy,sets,seat0SetWinsPct:fmt(100*wins0/sets),
  avgRounds:fmt(played/sets),decidingThirdRoundPct:fmt(100*deciders/sets),
  straightTwoWinPct:fmt(100*sweeps/sets),
  perRoundLeadWinPct:fmt(100*firstLeadWins/rounds),
  unresolvedRoundRetries:draws};
}
function multiplayerStudy(players,policy,samples){
 let ended=0,draws=0,turns=[],pickups=0;
 for(let i=1;i<=samples;i++){
  const g=match((seedBase+i*71)>>>0,players,Array(players).fill(policy));
  ended+=+(g.winner!==null);draws+=+g.draw;turns.push(g.turn);
  pickups+=g.people.reduce((sum,p)=>sum+p.pickups,0);
 }
 turns.sort((a,b)=>a-b);
 return{players,policy,samples,completed:ended,draws,drawPct:fmt(100*draws/samples),
  medianTurns:turns[Math.floor(samples*.5)],
  p90Turns:turns[Math.floor(samples*.9)],avgPickupMoves:fmt(pickups/samples)};
}
const result={
 currentMode:'Quick 32 CORE cards, four-card hands',
 setFormat:'Best of three, alternating round-one/two lead and previous-round loser leads the decider',
 seedBase,sets,
 series:['strategic','adaptive','basic','random'].map(setStudy),
 multiplayer:[
  multiplayerStudy(3,'strategic',sets),
  multiplayerStudy(3,'adaptive',sets),
  multiplayerStudy(3,'thoughtful',sets),
  multiplayerStudy(4,'adaptive',sets)
 ],
 caveats:[
  'Symmetric policy sessions are controlled simulations, not human tournament evidence.',
  'Best-of-three improves fairness across a full session but cannot erase opening bias in each round.',
  'A 240-turn draw is a failed pacing test. Adaptive bots reduce observed failures but do not prove the multiplayer rules always terminate.',
  'Paired-match and multiplayer samples can share deterministic seeds; treat reported percentages as descriptive estimates, not independent experimental trials.',
  'The underlying card rules remain unchanged in this experiment.'
 ]
};
console.log(JSON.stringify(result,null,2));
