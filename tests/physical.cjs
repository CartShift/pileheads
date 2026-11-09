'use strict';
const assert=require('node:assert/strict');
const E=require('../experiments/physical/engine.cjs');
let checks=0;
function check(title,fn){fn();checks++;console.log('OK '+title)}
check('baseline triple and AABB priorities',()=>{
  assert.equal(E.matches(['P','P','O','O'],'triples').length,0);
  assert.equal(E.matches(['P','P','O','O'],'aabb')[0].type,'aabb');
  assert.equal(E.matches(['P','P','P','O','O'],'aabb')[0].type,'triple');
  assert.deepEqual(E.matches(['P','P','O','O','P','P','O','O'],'aabb').map(g=>g.indices),[[0,1,2,3],[4,5,6,7]]);
});
check('exact boundary of four-card two-pair pattern',()=>{
  assert.equal(E.matches(['P','P','O','O','O'],'aabb')[0].type,'triple');
  assert.equal(E.matches(['P','P','P','O','O'],'aabb').length,1);
  assert.equal(E.matches(['P','P','O','O','B'],'aabb').length,1);
});
check('score equals removed cards, including multi-wave combo',()=>{
  const r=E.resolve(['P','P','O','O','P','B','B','O','B'],'O',4,'triples');
  assert.ok(r.waves>=2);
  assert.equal(r.points,r.steps.reduce((n,s)=>n+s.removed.length,0));
});
check('every insertion gap is evaluated, including both ends',()=>{
  const s=E.stateFor({players:2,seed:55});
  const options=E.legalOptions(s,0);
  for(let i=0;i<=9;i++)assert.ok(options.some(x=>x.pos===i));
});
check('edge-choice only adds alternatives to non-scoring moves',()=>{
  const a=E.stateFor({players:2,seed:12,edgeChoice:false});
  const b=E.stateFor({players:2,seed:12,edgeChoice:true});
  assert.ok(E.legalOptions(b,0).length>=E.legalOptions(a,0).length);
  assert.ok(E.legalOptions(b,0).filter(o=>o.edge==='left').every(o=>o.result.points===0));
});
check('cards are conserved and play order and stock are bounded',()=>{
  for(const players of [2,3,4])for(const pattern of ['triples','aabb']){
    const s=E.stateFor({players,seed:901+players,pattern,edgeChoice:true,deckSize:144});
    assert.equal(E.conservation(s),144);
    assert.equal(s.row.length,9);
    for(let k=0;k<players*8&&!s.earlyStop;k++){
      const current=s.turn%players,move=E.choose(s,current,k%2?'greedy':'lookahead');
      const obs=E.play(s,current,move);
      assert.equal(E.conservation(s),144);
      assert.equal(s.players.reduce((n,p)=>n+p.score,0),
        s.players.reduce((n,p)=>n+p.captured.length,0));
      assert.equal(obs.points,obs.waves===0?0:obs.points);
      if(!s.earlyStop)assert.equal(s.row.length,9);
    }
  }
});
check('deterministic seeded replay',()=>{
  const c={players:4,seed:7,pattern:'aabb',edgeChoice:true,deckSize:144};
  assert.deepEqual(E.runGame(c),E.runGame(c));
});
check('too-small finite stock terminates rather than looping',()=>{
  for(let seed=1;seed<=10;seed++){
    const result=E.runGame({players:4,seed,deckSize:24,pattern:'aabb'});
    assert.ok(result.completed||result.earlyStop);
    assert.ok(result.turns<=32);
  }
});
check('invalid moves are rejected',()=>{
  const s=E.stateFor({players:2,seed:2});
  assert.throws(()=>E.play(s,1,{cardIndex:0,pos:0,edge:'right'}),/Out of turn/);
  assert.throws(()=>E.play(s,0,{cardIndex:10,pos:0,edge:'right'}),/Illegal move/);
});
console.log('Passed '+checks+' physical simulator checks.');
