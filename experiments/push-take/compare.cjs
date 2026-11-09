'use strict';
/**
 * Matched-seed comparison using the ACTUAL Simple+ v5 engine.
 * No dependency on Site, online rooms, or the earlier physical-deck sandbox.
 */
const E=require('../../dist/engine-v5.js');
const fs=require('node:fs');
const path=require('node:path');
const getInt=(flag,def,max)=>{const i=process.argv.indexOf(flag);if(i<0)return def;const n=Number(process.argv[i+1]);if(!Number.isInteger(n)||n<1||n>max)throw Error('Invalid '+flag);return n};
const gamesPerArm=getInt('--games',400,100000);
const seed=getInt('--seed',91001,4294967295);
const arms=[
 {id:'B-full',mode:'B',restrict:false,label:'Existing 10-gap Extended'},
 {id:'B-nine',mode:'B',restrict:true,label:'Extended, same 9 gaps as D'},
 {id:'D-take',mode:'D',restrict:false,label:'Push & Take, 9 gaps'}
];
const results=[];
for(const players of [2,3])for(const arm of arms){
 let turns=0,zero=0,positive=0,chains=0,scoringAvailable=0,distinct=0,noScoreStates=0,nextAfterZero=0,nextCanScore=0,takes=0,abilityUses=0;
 const byPolicy={};
 for(let j=0;j<gamesPerArm;j++){
  const strategies=Array.from({length:players},(_,seat)=>['random','greedy','lookahead'][(seat+j)%3]);
  const g=E.create(players-1,arm.mode,seed+j,strategies),priorZero=Array(players).fill(false);
  for(let round=0;round<8;round++)for(let i=0;i<players;i++){
   const options=E.options(g,i).filter(o=>!arm.restrict||o.move.pos<g.rowSize);
   const opportunity=E.analyze(g,i,options);
   const move=E.choose(g,i,strategies[i],options);
   const outcome=E.act(g,i,move,opportunity);
   turns++;zero+=outcome.score===0;positive+=outcome.score;chains+=outcome.waves>1;
   scoringAvailable+=opportunity.scoringMoves>0;distinct+=opportunity.distinctScoring;
   noScoreStates+=new Set(options.filter(o=>o.result.score===0).map(o=>o.result.board.join('')+'|'+(o.result.takenColor||'')+'|'+o.move.kind)).size;
   takes+=!!outcome.takenColor;abilityUses+=outcome.kind==='wild'||outcome.swapUsed;
   if(priorZero[i]){nextAfterZero++;nextCanScore+=opportunity.scoringMoves>0}
   priorZero[i]=outcome.score===0;
   const stat=byPolicy[strategies[i]]??={appearances:0,turns:0,points:0,wins:0};
   stat.turns++;stat.points+=outcome.score;
   if(g.board.length!==9||g.players[i].hand.length!==3)throw Error('Invariant violated: '+arm.id);
  }
  const best=Math.max(...g.players.map(p=>p.points));
  const winners=g.players.map((p,i)=>p.points===best?i:-1).filter(i=>i>=0);
  strategies.forEach((strategy,i)=>{
    byPolicy[strategy].appearances++;
    if(winners.includes(i))byPolicy[strategy].wins+=1/winners.length;
  });
 }
 const div=(x,d)=>d?x/d:null;
 results.push({
  arm:arm.id,players,games:gamesPerArm,turns,
  zeroRate:div(zero,turns),scoringOpportunityRate:div(scoringAvailable,turns),
  distinctScoringPerTurn:div(distinct,turns),distinctNonScoreStatesPerTurn:div(noScoreStates,turns),
  chainRate:div(chains,turns),nextScoringOpportunityAfterZero:div(nextCanScore,nextAfterZero),
  pointsPerTurn:div(positive,turns),takesPerGame:div(takes,gamesPerArm),
  specialUsesPerGame:div(abilityUses,gamesPerArm),
  strategies:Object.fromEntries(Object.entries(byPolicy).map(([name,v])=>[name,{games:v.appearances,winShare:div(v.wins,v.appearances),pointsPerTurn:div(v.points,v.turns)}]))
 });
}
const report={metadata:{kind:'spark-push-take-engine-comparison',rules:'Simple+ v5 vs experimental D',gamesPerArm,seed,players:[2,3],roundsPerPlayer:8,hand:3,colors:3,rows:9,
 controls:['B-full (10 gaps)','B-nine (9 gaps)','D-take (9 gaps)'],
 policyMix:'random / greedy / limited-lookahead, seats rotated each game',
 botBudget:'D lookahead evaluates up to 18 immediate candidates; B evaluates 4. Skill comparisons are exploratory, not perfectly equal-budget.',
 measurement:'nextScoringOpportunityAfterZero is tested at the player next turn, after opponents move. No user enjoyability can be inferred.',
 cautions:['Same opening seed but different rule outcomes consume different deck cards','Specials included; bot use may not resemble humans','360-card digital deck and selective refill, NOT a printed physical deck','Scoring choice counts approximate tactical distinctness, not subjective excitement']},
 results};
if(process.argv.includes('--output')){
 const dir=path.join(__dirname,'results');fs.mkdirSync(dir,{recursive:true});
 const base='comparison-'+gamesPerArm+'x';
 fs.writeFileSync(path.join(dir,base+'.json'),JSON.stringify(report,null,2)+'\n');
 const cols=['arm','players','games','turns','zeroRate','scoringOpportunityRate','distinctScoringPerTurn','chainRate','nextScoringOpportunityAfterZero','pointsPerTurn','takesPerGame'];
 fs.writeFileSync(path.join(dir,base+'.csv'),cols.join(',')+'\n'+results.map(r=>cols.map(k=>r[k]).join(',')).join('\n')+'\n');
}
console.log(JSON.stringify(report,null,2));
