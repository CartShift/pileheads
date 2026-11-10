/* Run: node experiments/exchange/test.cjs */
'use strict';
const assert=require('node:assert/strict'),E=require('./engine.js');
let checks=0,games=0,turns=0;
function check(label,fn){fn();checks++;console.log('OK '+label)}
check('Three-wave, ten-card collapse, one point per captured card',()=>{
 const r=E.collapse(['O','O','B','B','P','P','P','B','O','O']);
 assert.equal(r.points,10);assert.equal(r.waves.length,3);
 assert.equal(r.points,r.waves.reduce((n,w)=>n+w.removed.length,0));
});
check('Equal immediate scores can leave different hands',()=>{
 const row=['O','B','B','P','O','B','P','P','O'],hand=['B','P','O'];
 const x=E.evaluate(row,hand,'exchange',{index:0,pos:3});
 const y=E.evaluate(row,hand,'exchange',{index:1,pos:8});
 assert.equal(x.points,3);assert.equal(y.points,3);
 assert.equal(x.taken,'P');assert.equal(y.taken,'O');assert.notDeepEqual(x.hand,y.hand);
});
check('Exchange card transfer and card conservation',()=>{
 const g=E.create({seed:18,players:2,action:'exchange'});
 g.row=['O','B','B','P','O','B','P','P','O'];g.players[0].hand=['B','P','O'];
 const r=E.play(g,0,{index:0,pos:3});
 assert.equal(r.exchanged,'P');assert.equal(r.score,3);assert.equal(g.players[0].hand[0],'P');
 assert.equal(g.players[0].score,3);assert.equal(g.players[0].captured.length,3);
 assert.equal(E.cardCount(g),g.deckSize);
});
check('Same-color exchanges, out-of-turn and invalid positions are rejected',()=>{
 const g=E.create({seed:21,players:2,action:'exchange'});
 for(let i=0;i<g.players[0].hand.length;i++)for(let pos=0;pos<g.row.length;pos++){
  if(g.players[0].hand[i]===g.row[pos])assert.equal(E.legal(g,0).some(x=>x.move.index===i&&x.move.pos===pos),false);
 }
 assert.throws(()=>E.play(g,1,{index:0,pos:0}),/Not your turn/);
 assert.throws(()=>E.play(g,0,{index:0,pos:9}),/Illegal action/);
 assert.throws(()=>E.play(g,0,{index:9,pos:0}),/Illegal action/);
});
check('Configurable row, hand and color counts',()=>{
 for(const opts of [{rowSize:9,handSize:3,colorCount:3},{rowSize:9,handSize:3,colorCount:4},{rowSize:7,handSize:2,colorCount:4}]){
  const g=E.create({seed:88,players:4,...opts});assert.equal(g.row.length,opts.rowSize);
  assert.ok(g.players.every(p=>p.hand.length===opts.handSize));assert.equal(g.palette.length,opts.colorCount);
  assert.equal(E.cardCount(g),144);
 }
});
check('Seed reproducibility and hidden-information isolation',()=>{
 const cfg={seed:420,players:3,colorCount:4,rowSize:9,action:'exchange'};
 assert.deepEqual(E.run(cfg),E.run(cfg));
 const g=E.create(cfg),other=JSON.parse(JSON.stringify(g));
 other.stock.reverse();other.players[1].hand=['G','G','G'];other.players[2].hand=['O','O','O'];
 assert.deepEqual(E.choose(g,0,'planner'),E.choose(other,0,'planner'));
});
check('No unclaimed triples, conservation, scores and hand sizes across full games',()=>{
 const arms=[
  {action:'insert',gaps:'nine',colorCount:3,rowSize:9,handSize:3},
  {action:'exchange',colorCount:3,rowSize:9,handSize:3},
  {action:'exchange',colorCount:4,rowSize:9,handSize:3},
  {action:'exchange',colorCount:4,rowSize:7,handSize:2}
 ];
 for(const config of arms)for(const players of [2,3,4])for(let seed=100;seed<120;seed++){
  const g=E.create({seed,players,refillRule:'safe',...config});
  const policies=['planner','greedy','random','greedy'];
  while(!g.blocked&&g.turn<players*g.turnsPerPlayer){
   const seat=g.turn%players,move=E.choose(g,seat,policies[seat]);
   const rec=E.play(g,seat,move);
   turns++;
   assert.equal(E.cardCount(g),g.deckSize);
   assert.equal(g.players.reduce((n,p)=>n+p.score,0),g.players.reduce((n,p)=>n+p.captured.length,0));
   if(!g.blocked){
    assert.equal(g.row.length,config.rowSize);
    assert.equal(E.triples(g.row).length,0,'There should be no free pre-existing triple');
    assert.ok(g.players.every(p=>p.hand.length===config.handSize));
   }
   assert.equal(rec.score,rec.scoredByDecision+rec.scoredFromRefill);
  }
  games++;
 }
});
check('Tiny decks signal bounded exhaustion instead of looping',()=>{
 let blocked=0;
 for(let seed=1;seed<=40;seed++){
  const r=E.run({seed,players:4,deckSize:36,colorCount:4,rowSize:9,action:'exchange'});
  assert.ok(r.turns<=32);if(!r.completed)blocked++;
 }
 assert.ok(blocked>0);
});
console.log(JSON.stringify({checks,completeGameRuns:games,turns}));
