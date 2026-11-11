'use strict';
/* Deterministic diagnostic only. Two different heuristic policies, rotated seats. */
const E=require('./engine.js');
const argv=process.argv,idx=argv.indexOf('--pairs'),pairs=idx<0?250:Number(argv[idx+1]);
if(!Number.isInteger(pairs)||pairs<1||pairs>10000)throw Error('Invalid pairs');
const results={games:0,completed:0,draws:0,firstSeatWins:0,thoughtfulWins:0,basicWins:0,
 turns:[],allTurns:0,legalAlternatives:0,differentArrowAlternatives:0,pickups:0,matchClears:0};
for(let seed=1;seed<=pairs;seed++)for(const flip of [0,1]){
 const policies=flip?['basic','thoughtful']:['thoughtful','basic'];
 const g=E.create({seed:seed*29+777,players:2});
 while(!E.finished(g)){
  const seat=E.active(g),legal=E.legal(g,seat);
  results.allTurns++;
  results.legalAlternatives+=+(legal.length>=2);
  results.differentArrowAlternatives+=+
   (new Set(legal.map(m=>m.type==='play'?g.people[seat].hand[m.index].arrow:m.type)).size>=2);
  const e=E.play(g,seat,E.choose(g,seat,policies[seat]));
  results.pickups+=+(e.action==='take');results.matchClears+=+(e.reason==='match');
 }
 results.games++;results.completed+=+(g.winner!==null);results.draws+=+g.draw;
 results.firstSeatWins+=+(g.winner===0);
 if(g.winner!==null)results[policies[g.winner]==='thoughtful'?'thoughtfulWins':'basicWins']++;
 results.turns.push(g.turn);
}
results.turns.sort((a,b)=>a-b);
const pct=n=>Number((n/results.games*100).toFixed(1));
const report={games:results.games,completed:results.completed,draws:results.draws,
 medianTurns:results.turns[Math.floor(results.turns.length*.5)],
 p90Turns:results.turns[Math.floor(results.turns.length*.9)],
 maxTurns:results.turns.at(-1),
 firstSeatWinShare:pct(results.firstSeatWins+results.draws*.5),
 thoughtfulVsBasicWinShare:pct(results.thoughtfulWins+results.draws*.5),
 turnsWithMultipleLegalMoves:Number((results.legalAlternatives/results.allTurns*100).toFixed(1)),
 turnsWithDifferentArrowChoices:Number((results.differentArrowAlternatives/results.allTurns*100).toFixed(1)),
 pickupsPerMatch:Number((results.pickups/results.games).toFixed(1)),
 matchedClearsPerMatch:Number((results.matchClears/results.games).toFixed(1)),
 caveats:['Both bots are simple handmade heuristics. Win share does not establish strategic skill.',
  'Simulated turns are not real minutes or evidence of enjoyment.',
  'No independent blind tests or physical proof have been performed.']};
console.log(JSON.stringify(report,null,2));
