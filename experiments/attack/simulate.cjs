'use strict';
/* Bot comparison for SPARK Attack. Run with:
 * node experiments/attack/simulate.cjs --games 24 --seed 171000 --output
 */
const E=require('./engine.js'),fs=require('node:fs'),path=require('node:path');
function integerFlag(name,otherwise,max){
 const at=process.argv.indexOf(name);
 if(at===-1)return otherwise;
 const number=Number(process.argv[at+1]);
 if(!Number.isInteger(number)||number<1||number>max)throw Error('Invalid '+name);
 return number;
}
const games=integerFlag('--games',24,10000),seed=integerFlag('--seed',171000,4294967295);
const out=[];
for(const hand of [7,9,11,13])for(const mode of ['attack','chains','no-penalty']){
 const runs=[];
 for(let i=0;i<games;i++){
  const policies=i%2?['greedy','planner']:['planner','greedy'];
  runs.push(E.run({seed:seed+i,mode,initialHand:hand,deckSize:144,turnLimit:240},policies));
 }
 const sorted=runs.map(r=>r.turns).sort((a,b)=>a-b);
 const sum=key=>runs.reduce((n,r)=>n+r[key],0);
 const t=sum('turns')||1;
 out.push({
  hand,mode,games,completed:runs.filter(r=>r.endedBy==='winner').length,
  medianTurns:sorted[Math.floor(sorted.length/2)],p90Turns:sorted[Math.min(sorted.length-1,Math.ceil(sorted.length*.9)-1)],
  avgTurns:t/games,zeroTurnRate:sum('noScore')/t,chainTurnRate:sum('chains')/t,
  distinctOutcomeProxy:sum('distinct')/t,alternativeScoringRate:sum('meaningful')/t,
  attacksPerGame:sum('attacks')/games,
  avgMaxHand:sum('maxHand')/games,
  bonusesPerGame:sum('bonusUsed')/games,bonusAttacksPerGame:sum('bonusAttacks')/games,
  rejectedRefillPerGame:sum('rejections')/games,
  reasons:Object.fromEntries([...new Set(runs.map(r=>r.endedBy))].map(key=>[key,runs.filter(r=>r.endedBy===key).length]))
 });
}
const results={metadata:{
 id:'spark-attack-merge-momentum-v0.2',kind:'seeded-bot-simulations',
 seed,gamesPerVariant:games,players:2,deckSize:144,rowSize:9,colors:4,
 playerPolicies:'planner versus greedy, seat order alternates',maxTurns:240,
 rules:['attack','chains','no-penalty'],initialHands:[7,9,11,13],
 caveats:['This is NOT human preference or actual duration in minutes.',
  'One full turn includes one placement and at most one optional bonus placement.',
  'Alternate scoring outcomes are a rough action-state proxy, not measured fun.',
  'Bots do not have access to hidden stock or the other player hand.',
  'The four-color/144-card top-of-deck safe-refill procedure is experimental.']
 },results:out};
if(process.argv.includes('--output')){
 const dir=path.join(__dirname,'results');fs.mkdirSync(dir,{recursive:true});
 const name='attack-'+games+'x-'+seed;
 fs.writeFileSync(path.join(dir,name+'.json'),JSON.stringify(results,null,2)+'\n');
 const keys=['hand','mode','games','completed','medianTurns','p90Turns','avgTurns','zeroTurnRate','chainTurnRate','attacksPerGame','bonusesPerGame','bonusAttacksPerGame','avgMaxHand','rejectedRefillPerGame'];
 fs.writeFileSync(path.join(dir,name+'.csv'),keys.join(',')+'\n'+out.map(row=>keys.map(k=>row[k]).join(',')).join('\n')+'\n');
}
console.log(JSON.stringify(results,null,2));
