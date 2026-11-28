'use strict';
// Reproducible, offline benchmark of the canonical engine, not a balance change.
// Run: node scripts/bench-simulator.cjs [games-per-cohort] [max-steps] [first-seed]
// Default: 80k games across 2–5 seats and both rule variants. Keep out of fast CI.
const E=require('../packages/game-engine').createEngine({now:()=>0});
const policies=['greedy','saver','random'];
const rules=['classic','final-duel'];
const seedFor=(first,index)=>(first+Math.imul(index,2654435761))>>>0;
const progress=g=>[g.stock.length,g.ashes.length,g.finishedOrder.length,
 ...g.people.map(p=>p.up.length+p.down.length)].join(':');
function play({players,seed,starter,rotation,endgameRule,maxSteps}){
 const g=E.create({players,seed,endgameRule});
 for(let seat=0;seat<players;seat++)E.autoSetup(g,seat);
 g.starterSeat=starter;
 E.start(g);
 let steps=0,longestStall=0,stalled=0;
 const events={};
 const style=seat=>policies[(seat+rotation)%policies.length];
 while(g.phase==='play'&&steps<maxSteps){
  const before=progress(g);
  let event;
  // Same priority as the authoritative online bot advance: pending DUMP,
  // then SNAP, SLAM, ordinary turn (including Counter DUMP).
  if(g.pendingDump){
   const seat=g.pendingDump.seat;
   event=E.resolveDump(g,seat,E.botDumpTarget(g,seat));
  } else {
   const snap=g.people.find(p=>E.followUpOptions(g,p.seat).length);
   const slam=snap?null:g.people.find(p=>E.slamOptions(g,p.seat).length);
   if(snap)event=E.move(g,snap.seat,E.followUpOptions(g,snap.seat)[0]);
   else if(slam)event=E.move(g,slam.seat,E.slamOptions(g,slam.seat)[0]);
   else event=E.move(g,g.turn,E.choose(g,g.turn,style(g.turn)));
  }
  E.invariant(g);
  if(event){const label=event.reason||event.type;events[label]=(events[label]||0)+1;}
  steps++;
  stalled=before===progress(g)?stalled+1:0;
  longestStall=Math.max(longestStall,stalled);
  // Online persistence retains 96 events; bot policy reads only the recent 24.
  if(g.events.length>96)g.events.splice(0,g.events.length-96);
 }
 return {seed,starter,rotation,steps,moves:g.moves,finished:g.phase==='over',
  winner:g.finishedOrder[0]??null,loser:g.loser,longestStall,events};
}
const percentile=(sorted,q)=>sorted[Math.max(0,Math.ceil(q*sorted.length)-1)];
function cohort({players,endgameRule,games,maxSteps,firstSeed}){
 const wins=Array(players).fill(0),losses=Array(players).fill(0);
 const starterGames=Array(players).fill(0),starterCompleted=Array(players).fill(0),starterWins=Array(players).fill(0);
 const moves=[],completedMoves=[],capped=[],events={};let longestStall=0;
 for(let i=0;i<games;i++){
  const starter=i%players,rotation=Math.floor(i/players)%policies.length,seed=seedFor(firstSeed,i);
  let r;
  try{r=play({players,seed,starter,rotation,endgameRule,maxSteps});}
  catch(error){throw new Error(JSON.stringify({players,endgameRule,seed,starter,rotation})+': '+error.message,{cause:error});}
  moves.push(r.moves);starterGames[starter]++;
  if(r.finished){
   completedMoves.push(r.moves);starterCompleted[starter]++;
   if(r.winner!==null){wins[r.winner]++;if(r.winner===starter)starterWins[starter]++;}
   if(r.loser!==null)losses[r.loser]++;
  }else capped.push({seed,starter,rotation,moves:r.moves,steps:r.steps});
  longestStall=Math.max(longestStall,r.longestStall);
  for(const [k,v] of Object.entries(r.events))events[k]=(events[k]||0)+v;
 }
 const distribution=a=>{
  if(!a.length)return null;
  a.sort((x,y)=>x-y);
  return {p50:percentile(a,.5),p95:percentile(a,.95),p99:percentile(a,.99),max:a.at(-1),
   mean:a.reduce((sum,n)=>sum+n,0)/a.length};
 };
 return {players,endgameRule,games,completed:completedMoves.length,capped,
  observedMoves:distribution(moves),completedMoves:distribution(completedMoves),
  longestStall,wins,losses,starterGames,starterCompleted,starterWins,events};
}
function run({games=10000,maxSteps=1800,firstSeed=20261128}={}){
 if(!Number.isSafeInteger(games)||games<1||games>100000||
    !Number.isSafeInteger(maxSteps)||maxSteps<1||maxSteps>10000||
    !Number.isInteger(firstSeed)||firstSeed<0||firstSeed>0xffffffff)throw Error('Invalid benchmark arguments');
 const results=[];
 for(const players of [2,3,4,5])for(const endgameRule of rules)
  results.push(cohort({players,endgameRule,games,maxSteps,firstSeed}));
 return {rulesVersion:E.VERSION,gamesPerCohort:games,maxSteps,firstSeed,policies,
  note:'Synthetic deterministic bots with immediate interrupt priority; not human or live network evidence. Capped games are not failures of invariants; completed-only percentiles exclude them.',results};
}
module.exports={run,play};
if(require.main===module){
 const args=process.argv.slice(2);
 if(args.length>3)throw Error('Usage: node scripts/bench-simulator.cjs [games] [maxSteps] [firstSeed]');
 console.log(JSON.stringify(run({games:args[0]===undefined?10000:Number(args[0]),
  maxSteps:args[1]===undefined?1800:Number(args[1]),firstSeed:args[2]===undefined?20261128:Number(args[2])}),null,2));
}
