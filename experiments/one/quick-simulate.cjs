'use strict';
/* Compare TWO versions of ONE using the exact same turn rules.
 * Classic: 48 cards (3 of each rank/arrow), 3 in hand.
 * Quick: balanced 32 CORE cards (2 of each rank/arrow), 4 in hand.
 *
 * Run: node experiments/one/quick-simulate.cjs --seeds 750 --seed 20261111
 * Results are deterministic, seat-rotated and synthetic, not human evidence.
 */
const E=require('./engine.js');
function parse(flag,def,max){
 const at=process.argv.indexOf(flag);if(at<0)return def;
 const n=Number(process.argv[at+1]);
 if(!Number.isInteger(n)||n<1||n>max)throw Error('Invalid '+flag);
 return n;
}
const seeds=parse('--seeds',750,10000),base=parse('--seed',20261111,4294967295);
const fmt=(n)=>Number(n.toFixed(1));
function run(mode,policies,seed){
 const g=E.create({seed,players:2,mode}),stats={turns:0,afterStock:0,stockEndAt:null,
  pickups:0,matches:0,forced:0,arrowOptions:0,choices:0};
 while(!E.finished(g)){
  const seat=E.active(g),moves=E.legal(g,seat);
  stats.choices++;
  stats.forced+=+(moves.length===1);
  stats.arrowOptions+=+(new Set(moves.filter(m=>m.type==='play').map(m=>g.people[seat].hand[m.index].arrow)).size>=2);
  const e=E.play(g,seat,E.choose(g,seat,policies[seat]));
  stats.pickups+=+(e.action==='take');stats.matches+=+(e.reason==='match');
  if(stats.stockEndAt===null&&!g.stock.length)stats.stockEndAt=g.turn;
  stats.turns++;
  if(E.count(g)!==48)throw Error('Physical card count drift');
 }
 stats.afterStock=stats.stockEndAt===null?0:g.turn-stats.stockEndAt;
 return{game:g,stats};
}
function compare(mode,first,second){
 const results={games:0,completed:0,draws:0,firstPolicyWins:0,firstSeatWins:0,
  turns:[],afterStock:0,forced:0,arrowOptions:0,choices:0,pickups:0,matches:0};
 for(let i=1;i<=seeds;i++)for(const rotate of [0,1]){
  const policies=rotate?[second,first]:[first,second],seed=(base+i*89)>>>0,
    r=run(mode,policies,seed),g=r.game,s=r.stats;
  results.games++;results.completed+=+(g.winner!==null);results.draws+=+g.draw;
  results.firstPolicyWins+=+(g.winner!==null&&policies[g.winner]===first);
  results.firstSeatWins+=+(g.winner===0);
  results.turns.push(s.turns);results.afterStock+=s.afterStock;results.forced+=s.forced;
  results.arrowOptions+=s.arrowOptions;results.choices+=s.choices;
  results.pickups+=s.pickups;results.matches+=s.matches;
 }
 results.turns.sort((a,b)=>a-b);
 const n=results.games,total=results.turns.reduce((a,b)=>a+b,0);
 return{mode,policies:[first,second],games:n,completed:results.completed,draws:results.draws,
  strategyWinPct:fmt(100*(results.firstPolicyWins+results.draws*.5)/n),
  firstSeatWinPct:fmt(100*(results.firstSeatWins+results.draws*.5)/n),
  medianTurns:results.turns[Math.floor(n*.5)],p90Turns:results.turns[Math.floor(n*.9)],
  endgameTurnSharePct:fmt(100*results.afterStock/total),
  forcedTurnsPct:fmt(100*results.forced/results.choices),
  turnsWithArrowChoicePct:fmt(100*results.arrowOptions/results.choices),
  pickupsPerMatch:fmt(results.pickups/n),matchedClearsPerMatch:fmt(results.matches/n)};
}
function symmetry(mode,policy){
 const res={wins:[0,0],games:0,draws:0};
 for(let i=1;i<=seeds;i++){
  const g=run(mode,[policy,policy],(base+i*89)>>>0).game;
  res.games++;if(g.winner!==null)res.wins[g.winner]++;else res.draws++;
 }
 return{mode,policy,games:res.games,draws:res.draws,
  seat0WinSharePct:fmt(100*(res.wins[0]+res.draws*.5)/res.games),
  seat1WinSharePct:fmt(100*(res.wins[1]+res.draws*.5)/res.games)};
}
const comparisons=[];
for(const mode of ['classic','quick']){
 comparisons.push(compare(mode,'strategic','random'));
 comparisons.push(compare(mode,'strategic','basic'));
 comparisons.push(compare(mode,'strategic','thoughtful'));
}
const symmetric=[
 symmetry('classic','strategic'),
 symmetry('quick','strategic'),
 symmetry('classic','random'),
 symmetry('quick','random')
];
console.log(JSON.stringify({
 experiment:'TILT ONE classic versus balanced 32-card four-hand quick',
 input:{seeds,base,pairedSeatRotation:true},
 comparison:comparisons,symmetric,
 caveats:[
  'The 32 CORE cards are purposefully balanced: two copies of each rank/arrow combination.',
  'The 16 EXTRA cards are set aside before the two-player quick game, not randomly removed.',
  'Bot policy win share estimates strategic leverage, not human enjoyment.',
  'Seat-swapped matches from the same seed are correlated, not fully independent samples.',
  'First-seat advantage remains a design concern; 3–4-player quick mode is unsupported.',
  'Do not replace the classic rules without human A/B preference and physical playtests.'
 ]
},null,2));
