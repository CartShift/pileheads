'use strict';
// Reproducible 4-player physical deck-size stress test. No production imports.
const fs=require('node:fs');
const path=require('node:path');
const E=require('./engine.cjs');
function arg(name,defaultValue,max){
 const i=process.argv.indexOf(name);
 if(i<0)return defaultValue;
 const n=Number(process.argv[i+1]);
 if(!Number.isInteger(n)||n<1||n>max)throw Error('Invalid '+name);
 return n;
}
const games=arg('--games',125,100000),seed=arg('--seed',811000,4294967295);
const rows=[];
for(const cards of [120,132,144,156,168,180]){
 for(const turns of [6,8]){
  const runs=Array.from({length:games},(_,i)=>E.runGame({
   players:4,deckSize:cards,pattern:'aabb',edgeChoice:false,
   turnsPerPlayer:turns,seed:seed+i,policies:['random','greedy','lookahead','greedy']
  }));
  rows.push({cards,turns,games,completed:runs.filter(r=>r.completed).length,
   meanRejects:runs.reduce((s,r)=>s+r.stock.rejected,0)/games,
   meanReshuffles:runs.reduce((s,r)=>s+r.stock.reshuffles,0)/games,
   forcedGames:runs.filter(r=>r.stock.forced>0).length});
 }
}
const data={kind:'independent-physical-deck-capacity',source:'simulation only, no human evidence',
 settings:{games,seed,players:4,patterns:'triples then exact AABB',edge:'forced-right',roundCounts:[6,8],
  deckSizes:[120,132,144,156,168,180]},rows};
if(process.argv.includes('--output')){
 const dir=path.join(__dirname,'results');fs.mkdirSync(dir,{recursive:true});
 const b='capacity-'+games+'x-generated';
 fs.writeFileSync(path.join(dir,b+'.json'),JSON.stringify(data,null,2)+'\n');
 const cols=['cards','turns','games','completed','meanRejects','meanReshuffles','forcedGames'];
 fs.writeFileSync(path.join(dir,b+'.csv'),cols.join(',')+'\n'+rows.map(r=>cols.map(k=>r[k]).join(',')).join('\n')+'\n');
}
console.log(JSON.stringify(data,null,2));
