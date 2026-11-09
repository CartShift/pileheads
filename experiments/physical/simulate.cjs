'use strict';
const fs=require('node:fs');
const path=require('node:path');
const E=require('./engine.cjs');
const parseIntFlag=(name,fallback)=>{
  const at=process.argv.indexOf(name);
  if(at<0)return fallback;
  const n=Number(process.argv[at+1]);
  const max=name==='--seed'?4294967295:name==='--games'?100000:name==='--deck'?10000:100;
  if(!Number.isInteger(n)||n<1||n>max)throw Error('Invalid '+name);
  return n;
};
const games=parseIntFlag('--games',300);
const seed=parseIntFlag('--seed',620000);
const deckSize=parseIntFlag('--deck',144);
const turnsPerPlayer=parseIntFlag('--turns',8);
const results=[];
for(const players of [2,3,4]){
 for(const pattern of ['triples','aabb']){
  for(const edgeChoice of [false,true]){
   const gamesRun=[];
   for(let i=0;i<games;i++){
    const strategies=['random','greedy','lookahead','greedy'];
    gamesRun.push(E.runGame({players,pattern,edgeChoice,seed:seed+i,deckSize,turnsPerPlayer,
      policies:strategies.map((_,k)=>strategies[(k+i)%4])}));
   }
   results.push({players,pattern,edgeChoice,...E.summarize(gamesRun)});
  }
 }
}
const metadata={
  version:'experimental-physical-v1',source:'independent simulated game model, NOT production Sites or real player results',
  gamesPerArm:games,seed,deckSize,turnsPerPlayer,
  physicalRule:'top-card safe refill with bounded visible rejection and forced-card fallback',
  matchPriority:'all triples, then non-overlapping left-to-right exact AABB',
  specials:'Wild and Swap NOT modeled; keep separate until physical representation approved',
  comparisons:'paired shuffle seeds and rotating bot seats, but outcomes and stock diverge by ruleset',
  caveats:'No human enjoyment evidence. Left/right choice increases action space mechanically. Results conditional on early-ending stock.'
};
const result={metadata,results};
if(process.argv.includes('--output')){
 const dir=path.join(__dirname,'results');fs.mkdirSync(dir,{recursive:true});
 const base='physical-'+deckSize+'-'+games+'x-generated';
 fs.writeFileSync(path.join(dir,base+'.json'),JSON.stringify(result,null,2)+'\n');
 const fields=['players','pattern','edgeChoice','games','turns','completionRate','noAvailableScoreRate','actualZeroScoreRate','chainRate','multiOutcomeRate','pointsPerTurn','rejectedPerGame','reshufflePerGame','forcedPerGame'];
 fs.writeFileSync(path.join(dir,base+'.csv'),fields.join(',')+'\n'+results.map(r=>fields.map(f=>r[f]).join(',')).join('\n')+'\n');
}
console.log(JSON.stringify(result,null,2));
