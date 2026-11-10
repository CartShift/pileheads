/* Reproducible research runner for SPARK Exchange / Insert. No Site imports. */
'use strict';
const E=require('./engine.js');
const fs=require('node:fs'),path=require('node:path');
function numberFlag(name,otherwise,max=50000){
 const index=process.argv.indexOf(name);
 if(index<0)return otherwise;
 const n=Number(process.argv[index+1]);
 if(!Number.isInteger(n)||n<1||n>max)throw Error('Invalid '+name);
 return n;
}
const games=numberFlag('--games',140,20000);
const seed=numberFlag('--seed',752001,4294967295);
const players=numberFlag('--players',3,4);
if(players<2)throw Error('At least two players are required');
const rules=['safe','cascade'];
const RULESETS=[
 {id:'insert-9-3-3',action:'insert',gaps:'nine',rowSize:9,handSize:3,colorCount:3},
 {id:'exchange-9-3-3',action:'exchange',rowSize:9,handSize:3,colorCount:3},
 {id:'exchange-7-2-3',action:'exchange',rowSize:7,handSize:2,colorCount:3},
 {id:'exchange-7-2-4',action:'exchange',rowSize:7,handSize:2,colorCount:4},
 {id:'exchange-8-2-4',action:'exchange',rowSize:8,handSize:2,colorCount:4},
 {id:'exchange-7-3-4',action:'exchange',rowSize:7,handSize:3,colorCount:4},
 {id:'exchange-9-3-4',action:'exchange',rowSize:9,handSize:3,colorCount:4}
];
const chosen=process.argv.includes('--all-refills')?rules:['safe'];
const rows=[];
for(const rule of chosen)for(const variant of RULESETS){
 const runs=[],wins={random:0,greedy:0,planner:0},played={random:0,greedy:0,planner:0};
 for(let i=0;i<games;i++){
  const base=['planner','greedy','random'];
  const policies=Array.from({length:players},(_,seat)=>base[(seat+i)%3]);
  const r=E.run({seed:seed+i,players,deckSize:144,turnsPerPlayer:8,refillRule:rule,...variant},policies);
  runs.push(r);
  policies.forEach((policy,seat)=>{
   played[policy]++;
   if(r.winners.includes(seat))wins[policy]+=1/r.winners.length;
  });
 }
 const total=runs.reduce((s,r)=>s+r.turns,0);
 const sum=k=>runs.reduce((s,r)=>s+r[k],0);
 const points=runs.reduce((s,r)=>s+r.scores.reduce((a,b)=>a+b,0),0);
 rows.push({...variant,refillRule:rule,players,games,completed:runs.filter(x=>x.completed).length,
  turns:total,zeroRate:sum('zero')/total,availableRate:sum('scoringAvailable')/total,
  chainRate:sum('chains')/total,distinctScoring:sum('distinct')/total,
  meaningfulTradeoffProxy:sum('tradeoffs')/total,
  distinctNoScoreStates:sum('noScoreAlternatives')/total,
  averagePointsPerTurn:points/total,
  luckPointShare:sum('refillLuckPoints')/Math.max(1,points),
  rejectionPerGame:sum('rejected')/games,
  repeatedStates:sum('repeats'),
  wins:Object.fromEntries(Object.keys(wins).map(k=>[k,{wins:wins[k],games:played[k],winShare:wins[k]/played[k]}]))
 });
}
const report={
 metadata:{
  kind:'spark-exchange-exploration',engineVersion:'exchange-lab-0.2',
  gamesPerVariant:games,seedStart:seed,players,
  drawDeck:'balanced finite 144-card physical-style deck; exact setup is seeded and shared',
  scoring:'only contiguous three-or-more equal cards count, exactly one point per captured card',
  refillRules:chosen,botStrategies:['random','immediate greedy','planner heuristic, no hidden-deck access'],
  variants:'insert and exchange, varied board/hand/color counts; no special abilities',
  caveats:['bot outcomes are not enjoyment or validated market demand',
    'greedy and planner represent specific heuristics, not human skill',
    'matched starts diverge after moves and draws',
    'meaningfulTradeoffProxy is a model-generated heuristic, not a psychological measurement',
    'safe top-card rejection is physically feasible but must still pass deck exhaustion and human-handling tests']
 },rows
};
if(process.argv.includes('--output')){
 const dir=path.join(__dirname,'results');fs.mkdirSync(dir,{recursive:true});
 const name='experiment-'+games+'x-'+players+'players-'+seed;
 fs.writeFileSync(path.join(dir,name+'.json'),JSON.stringify(report,null,2)+'\n');
 const keys=['id','refillRule','players','games','completed','zeroRate','availableRate','chainRate','distinctScoring','meaningfulTradeoffProxy','averagePointsPerTurn','luckPointShare','rejectionPerGame','repeatedStates'];
 fs.writeFileSync(path.join(dir,name+'.csv'),keys.join(',')+'\n'+rows.map(r=>keys.map(k=>r[k]).join(',')).join('\n')+'\n');
}
console.log(JSON.stringify(report,null,2));
