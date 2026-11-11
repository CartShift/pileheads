'use strict';
/* Reproducible exploratory policy matchup. Not a human fun test.
 * Usage: node experiments/duel/simulate.cjs [--seeds 120] [--seed 210000]
 */
const E=require('./engine.js');
function flag(name,otherwise){
 const i=process.argv.indexOf(name);
 if(i<0)return otherwise;
 const v=Number(process.argv[i+1]);
 if(!Number.isSafeInteger(v)||v<1||v>5000)throw Error('Invalid '+name);
 return v;
}
const count=flag('--seeds',120),base=flag('--seed',210000),out=[];
for(const information of ['open','hidden']){
 let won=0,lost=0,tied=0,complete=0,tradeoffs=0,turns=0,scoreAvailable=0,scoringTurns=0;
 const lengths=[],margins=[];
 for(let i=0;i<count;i++)for(const rotate of [false,true]){
  const strong=information==='open'?'counter':'planner';
  const policies=rotate?['greedy',strong]:[strong,'greedy'];
  const result=E.run({seed:base+i*29,information,colorCount:4,players:2,
   turnsPerPlayer:10,handSize:3,rowSize:9,action:'exchange',refillRule:'safe'},policies);
  if(result.completed)complete++;
  const seat=rotate?1:0;
  const mine=result.scores[seat],other=result.scores[1-seat];
  margins.push(mine-other);
  if(mine>other)won++;else if(mine<other)lost++;else tied++;
  tradeoffs+=result.tradeoffs;turns+=result.decisions;
  scoreAvailable+=result.scoringAvailable;scoringTurns+=result.decisionScoring;
  lengths.push(result.turns);
 }
 out.push({information,games:count*2,complete,won,lost,tied,policy:information==='open'?'counter':'planner',
  strongerPolicyWinShare:Number(((won+tied*.5)/(count*2)*100).toFixed(1)),
  averageScoreMargin:Number((margins.reduce((a,b)=>a+b,0)/margins.length).toFixed(2)),
  meanTurns:Number((lengths.reduce((a,b)=>a+b,0)/lengths.length).toFixed(1)),
  heuristicTradeoffsRate:Number((tradeoffs/Math.max(1,turns)*100).toFixed(1)),
  scoringOpportunityRate:Number((scoreAvailable/Math.max(1,turns)*100).toFixed(1)),
  actualScoringTurnRate:Number((scoringTurns/Math.max(1,turns)*100).toFixed(1))
 });
}
console.log(JSON.stringify({experiment:'spark-duel-v0.1',seedBase:base,seedsPerInformation:count,summary:out,
 caveats:['Open counter bot can read only the publicly visible opponent hand, not the stock.',
  'Hidden planner uses the existing approximate unknown-opponent policy.',
  'Opposing bots do not use identical planning algorithms: skill gap is NOT evidence of human win probabilities.',
  'Only human blind playtests can establish strategic fun and commercial potential.']},null,2));
