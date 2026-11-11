'use strict';
/* Deterministic, inspectable ONE game-design diagnostics.
 *
 * Run: node experiments/one/strategy-simulate.cjs --seeds 800 --seed 20261111
 * No live site, user accounts, RNG seeding outside the pure game engine,
 * telemetry or external services are required.
 *
 * The 'strategic' and 'thoughtful' agents differ only in public information
 * reasoning. They do NOT inspect hidden opponent hands or unexposed deck order.
 * All samples are synthetic. They cannot predict human enjoyment.
 */
const E=require('./engine.js');
function argument(flag,fallback,max){
 const at=process.argv.indexOf(flag);
 if(at<0)return fallback;
 const value=Number(process.argv[at+1]);
 if(!Number.isInteger(value)||value<1||value>max)throw Error('Invalid '+flag);
 return value;
}
const seedCount=argument('--seeds',800,10000);
const baseSeed=argument('--seed',20261111,4294967295);
const fmt=(v)=>Number(v.toFixed(1));
const value=(n,d)=>d?fmt(100*n/d):null;
function run(policies,seed){
 const g=E.create({seed,players:policies.length});
 let legalMoves=0,alternatives=0,arrowAlternatives=0,takes=0,matched=0,lateTakes=0,
  turnsAfterStock=0,stockEmptyAt=null,earlyHandLead=null;
 while(!E.finished(g)){
  const seat=E.active(g),moves=E.legal(g,seat);
  if(!moves.length)throw Error('Living game has no legal move');
  legalMoves++;
  alternatives+=+(moves.length>=2);
  arrowAlternatives+=+(new Set(moves.filter(m=>m.type==='play').map(m=>g.people[seat].hand[m.index].arrow)).size>=2);
  const chosen=E.choose(g,seat,policies[seat]);
  const event=E.play(g,seat,chosen);
  takes+=+(event.action==='take');matched+=+(event.reason==='match');
  if(stockEmptyAt!==null){turnsAfterStock++;lateTakes+=+(event.action==='take')}
  if(stockEmptyAt===null&&!g.stock.length){
   stockEmptyAt=g.turn;
   const counts=g.people.map(p=>p.hand.length),lowest=Math.min(...counts);
   const contenders=counts.filter(n=>n===lowest).length;
   earlyHandLead=contenders===1?counts.indexOf(lowest):null;
  }
  if(E.count(g)!==E.DECK_SIZE)throw Error('Card conservation failed');
 }
 return{g,legalMoves,alternatives,arrowAlternatives,takes,matched,
  lateTakes,turnsAfterStock,earlyHandLead};
}
function metrics(){
 return{games:0,draws:0,turns:[],wins:[],taking:0,matching:0,all:0,alternatives:0,arrows:0,
  lateTakes:0,lateTurns:0,stockLeads:0,stockLeadWins:0}
}
function record(m,result){
 const {g}=result;
 m.games++;m.draws+=+g.draw;m.turns.push(g.turn);
 if(g.winner!==null)m.wins[g.winner]=(m.wins[g.winner]||0)+1;
 m.taking+=result.takes;m.matching+=result.matched;
 m.all+=result.legalMoves;m.alternatives+=result.alternatives;
 m.arrows+=result.arrowAlternatives;
 m.lateTakes+=result.lateTakes;m.lateTurns+=result.turnsAfterStock;
 if(result.earlyHandLead!==null){
  m.stockLeads++;
  m.stockLeadWins+=+(g.winner===result.earlyHandLead);
 }
}
function summarize(m){
 m.turns.sort((a,b)=>a-b);
 return{games:m.games,completed:m.games-m.draws,draws:m.draws,
  medianTurns:m.turns[Math.floor(m.games*.5)],p90Turns:m.turns[Math.floor(m.games*.9)],
  maxTurns:m.turns.at(-1),
  legalAlternativeTurnsPct:value(m.alternatives,m.all),
  distinctArrowChoiceTurnsPct:value(m.arrows,m.all),
  pickupsPerMatch:fmt(m.taking/m.games),
  matchedClearsPerMatch:fmt(m.matching/m.games),
  endgamePickupPct:value(m.lateTakes,m.lateTurns),
  stockEndLeaderWinPct:value(m.stockLeadWins,m.stockLeads)};
}
function compare(first,second){
 const result=metrics();let wins=0;
 for(let i=1;i<=seedCount;i++)for(let rotate=0;rotate<2;rotate++){
  const policies=rotate?[second,first]:[first,second],
   seed=(baseSeed+i*71)>>>0,played=run(policies,seed);
  record(result,played);
  wins+=+(played.g.winner!==null&&policies[played.g.winner]===first);
 }
 return{policies:[first,second],...summarize(result),
  firstPolicyWinSharePct:value(wins+result.draws*.5,result.games),
  // NOTE: the seat-rotated games at the same seed are correlated observations;
  // n=2*seedCount is NOT 2*seedCount fully independent random trials.
  seatPairs:seedCount};
}
function symmetry(players,policy){
 const result=metrics();
 for(let i=1;i<=seedCount;i++)
  record(result,run(Array(players).fill(policy),(baseSeed+i*71)>>>0));
 return{players,policy,...summarize(result),
  winSharePct:result.wins.map(n=>value(n,result.games)),
  firstSeatWinSharePct:value((result.wins[0]||0)+result.draws/players,result.games)};
}
const headToHead=[
 compare('strategic','random'),
 compare('strategic','basic'),
 compare('strategic','thoughtful'),
 compare('thoughtful','random'),
 compare('basic','random')
];
const symmetrical=[];
for(const players of [2,3,4])for(const policy of ['random','basic','thoughtful','strategic'])
 symmetrical.push(symmetry(players,policy));
console.log(JSON.stringify({
  prototype:'TILT ONE v0.1',deckCards:E.DECK_SIZE,
  input:{seedCount,baseSeed,seatRotation:true},headToHead,symmetrical,
  interpretation:[
   'Strategic is a simple hand-conservation heuristic, not a solved optimal agent.',
   'The opponent card values and the unseen draw stock are not used by its policy.',
   'Matchup win share and actual human strategic depth are different measurements.',
   'Turn-limit draws count as failures: the engine cannot currently guarantee 3-player termination.',
   'Do not turn the bot-simulation findings into a retail-readiness claim.'
  ]
},null,2));
