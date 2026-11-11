'use strict';
/* Usage: node experiments/game-lab/simulate.cjs --games 200 --seed 20261111
 * Two policies (planner, greedy), every seed played in both seat orders.
 * Heuristics are not human strategy and cannot measure fun.
 */
const E=require('./engine.js');
function arg(name,def){
 const at=process.argv.indexOf(name);
 if(at<0)return def;
 const n=Number(process.argv[at+1]);
 if(!Number.isInteger(n)||n<1||n>10000)throw Error('Invalid '+name);
 return n;
}
const n=arg('--games',200),base=arg('--seed',20261111);
const results=[];
for(const kind of ['claim','signal']){
 const a={matchups:n*2,completed:0,plannerWins:0,greedyWins:0,draws:0,seat0Wins:0,
   rounds:0,scoringTurns:0,claims:0,largeClaims:0,bankAvailableButPressed:0,collisions:0,collisionTies:0,uncontestedPrizes:0,scoreMargin:0};
 for(let seed=0;seed<n;seed++)for(let rotate=0;rotate<2;rotate++){
  const policies=rotate?['greedy','planner']:['planner','greedy'],config={seed:base+seed*31};
  const r=kind==='claim'?E.runClaim(config,policies):E.runSignal(config,policies),g=r.game;
  a.completed+=+r.summary.completed;
  a.scoreMargin+=Math.abs(g.players[0].score-g.players[1].score);
  const winner=g.players[0].score===g.players[1].score?-1:g.players[0].score>g.players[1].score?0:1;
  if(winner<0)a.draws++;else{a.seat0Wins+=+(winner===0);a[policies[winner]==='planner'?'plannerWins':'greedyWins']++}
  if(kind==='claim'){
   a.rounds+=g.turn;a.scoringTurns+=g.log.filter(e=>e.scoreChanges.some(x=>x>0)).length;
   a.claims+=g.log.filter(e=>e.bank).length;a.largeClaims+=g.log.filter(e=>e.bank?.cards>=5).length;
  }else{
   a.rounds+=g.round;
   a.collisions+=r.summary.collisions;a.collisionTies+=r.summary.ties;
   a.uncontestedPrizes+=r.summary.uncontested;
  }
 }
 const games=a.matchups;
 results.push({kind,games,completed:a.completed,plannerWinShare:Number(((a.plannerWins+a.draws*.5)/games*100).toFixed(1)),
  firstSeatWinShare:Number(((a.seat0Wins+a.draws*.5)/games*100).toFixed(1)),
  drawRate:Number((a.draws/games*100).toFixed(1)),
  meanFinalScoreGap:Number((a.scoreMargin/games).toFixed(2)),
  ...(kind==='claim'?{scoringTurnRate:Number((a.scoringTurns/a.rounds*100).toFixed(1)),
    claimsPerMatch:Number((a.claims/games).toFixed(2)),bigBankClaimsPerMatch:Number((a.largeClaims/games).toFixed(2))}:
    {collisionsPerMatch:Number((a.collisions/games).toFixed(2)),
     tiedContestsPerMatch:Number((a.collisionTies/games).toFixed(2)),
     uncontestedPrizesPerMatch:Number((a.uncontestedPrizes/games).toFixed(2))})});
}
console.log(JSON.stringify({version:'spark-game-design-lab-v0.1',baseSeed:base,pairsPerKind:n,result:results,
 caveats:['Planner and greedy are deliberately non-equivalent heuristic bots.',
  'Win shares reflect those particular bots under two seat orders, not human strategy or fairness.',
  'Scoring-turn rate does not measure meaningful choices in a setup/claim game.',
  'Neither concept has passed independent human playtesting, tabletop feasibility or originality review.']},null,2));
