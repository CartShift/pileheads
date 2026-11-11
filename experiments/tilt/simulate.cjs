'use strict';
/* Reproducible heuristic matchup, no claim of human fun or optimal play.
 * node experiments/tilt/simulate.cjs --seeds 200 --seed 20261111
 */
const E=require('./engine.js');
function arg(flag,def,max){const i=process.argv.indexOf(flag);if(i<0)return def;
 const n=Number(process.argv[i+1]);if(!Number.isInteger(n)||n<1||n>max)throw Error('Invalid '+flag);return n}
const seeds=arg('--seeds',200,2000),base=arg('--seed',20261111,4294967295);
const summary=[];
for(const kind of ['cross','forge']){
 let complete=0,draws=0,plannerWins=0,greedyWins=0,firstWins=0,pickups=0,cracks=0,
   prepare=0,release=0,pivot=0,turns=[];
 for(let i=0;i<seeds;i++)for(const rotation of [0,1]){
  const policies=rotation?['greedy','planner']:['planner','greedy'];
  const r=E.simulate({kind,players:2,seed:(base+i*31)>>>0},policies);
  complete+=+r.stats.completed;draws+=+r.stats.drawn;turns.push(r.stats.turns);
  pickups+=r.stats.pickups.reduce((a,b)=>a+b,0);
  prepare+=r.stats.prepared;release+=r.stats.released;
  cracks+=r.game.log.filter(e=>e.burnedCount).length;
  pivot+=r.game.log.filter(e=>e.forceAfter).length;
  if(r.stats.winner!==null){
   firstWins+=+(r.stats.winner===0);
   if(policies[r.stats.winner]==='planner')plannerWins++;else greedyWins++;
  }
 }
 turns.sort((a,b)=>a-b);
 const games=seeds*2;
 summary.push({kind,games,complete,draws,medianTurns:turns[Math.floor(turns.length*.5)],
  p90Turns:turns[Math.floor(turns.length*.9)],
  plannerWinShare:Number(((plannerWins+draws*.5)/games*100).toFixed(1)),
  firstSeatShare:Number(((firstWins+draws*.5)/games*100).toFixed(1)),
  averagePickups:Number((pickups/games).toFixed(1)),
  averageCracks:Number((cracks/games).toFixed(1)),
  ...(kind==='cross'?{averageLinksPerGame:Number((pivot/games).toFixed(1))}:
      {averagePrepares:Number((prepare/games).toFixed(1)),averageReleases:Number((release/games).toFixed(1))})});
}
console.log(JSON.stringify({version:'tilt-mechanics-lab-v01',baseSeed:base,pairs:seeds,summary,
 caveats:['Planner and greedy are unlike heuristic bots. Their win share is not evidence of real human strategic skill.',
 'Turn-based simulations cannot measure cognitive burden, fun, tension, sales, or actual minutes.',
 'A game ending at 320 turns is a safety-limit draw, not a successful game.',
 'Two candidates share one deck only for early comparison. A retail product needs a single validated ruleset.']},null,2));
