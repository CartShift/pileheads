'use strict';
const assert=require('node:assert/strict');
const E=require('../dist/engine-v5.js');
const {runtime}=require('./studio.cjs');

const fixture=['O','B','P','O','B','P','O','B','P'];
const move={kind:'hand',index:0,color:'B',pos:0};

function setup(){
 const g=E.create(1,'D',13);
 g.board=fixture.slice();
 g.players[0].hand=['B','B','B'];
 return g;
}
{
 const g=setup();
 assert.equal(g.board.length,9);
 assert.equal(E.MODES.D.rowSize,9);
 assert.equal(E.options(g,0).some(x=>x.move.pos===9),false,'D has no ineffective far-right gap');
 assert.equal(E.valid(g,0,{...move,pos:9}),false);
 assert.equal(E.valid(g,0,move),true);
 const beforeDeck=g.deck.length,preview=E.preview(g,move);
 assert.equal(preview.score,0);
 assert.equal(preview.takenColor,'P');
 assert.deepEqual(preview.steps.map(s=>s.kind),['placed','take']);
 assert.equal(preview.board.length,9);
 const r=E.act(g,0,move);
 assert.equal(g.players[0].hand.join(''),'BBP');
 assert.equal(g.deck.length,beforeDeck,'no random draw on zero-scoring hand move');
 assert.equal(r.takenColor,'P');
 assert.equal(g.board.length,9);
 assert.equal(r.steps.at(-1).board.length,9);
}
{
 const g=setup(),n=g.deck.length;
 const r=E.act(g,0,{...move,swapPos:2});
 assert.equal(r.score,0);
 assert.equal(r.takenColor,'P');
 assert.equal(g.players[0].swap,0);
 assert.equal(g.deck.length,n);
 assert.deepEqual(r.steps.map(s=>s.kind),['swap','placed','take']);
}
{
 const g=setup(),hand=g.players[0].hand.slice(),n=g.deck.length;
 const r=E.act(g,0,{kind:'wild',color:'B',pos:0});
 assert.equal(r.score,0);
 assert.equal(r.takenColor,null);
 assert.deepEqual(g.players[0].hand,hand,'wild never creates fourth hand card');
 assert.equal(g.deck.length,n);
 assert.equal(g.players[0].wild,0);
 assert.equal(r.steps.at(-1).kind,'discard');
}
{
 const g=E.create(1,'D',14);
 g.board=['O','O','P','B','P','O','B','P','O'];g.players[0].hand=['O','P','B'];
 const n=g.deck.length,r=E.act(g,0,{kind:'hand',index:0,color:'O',pos:1});
 assert.ok(r.score>=3);
 assert.equal(r.takenColor,null);
 assert.equal(g.players[0].hand.length,3);
 assert.ok(g.deck.length<n,'scoring turn still draws a card');
 assert.equal(g.players[0].points,r.frames.flat().length,'one point per captured card');
}
{
 const g=setup(),copy=JSON.parse(JSON.stringify(g));copy.deck.reverse();copy.players[1].hand=['P','P','P'];
 assert.deepEqual(E.choose(g,0,'lookahead'),E.choose(copy,0,'lookahead'),'lookahead cannot inspect hidden stock or opponent hand');
}
let games=0,turns=0,taken=0;
for(const bots of [1,2])for(let seed=1;seed<=25;seed++){
 const g=E.create(bots,'D',seed);
 for(let round=0;round<8;round++)for(let seat=0;seat<g.players.length;seat++){
   const opts=E.options(g,seat),op=E.analyze(g,seat,opts),m=E.choose(g,seat,['random','greedy','lookahead'][seat%3],opts);
   const before=g.deck.length,p=g.players[seat],used=m.kind==='hand';
   const r=E.act(g,seat,m,op);
   assert.equal(g.board.length,9);assert.equal(p.hand.length,3);
   assert.equal(r.score,r.frames.flat().length);
   assert.equal(r.steps.filter(s=>s.kind==='match').reduce((n,s)=>n+s.points,0),r.score);
   if(r.takenColor){taken++;assert.equal(r.score,0);assert.equal(m.kind,'hand');assert.ok(p.hand.includes(r.takenColor));assert.equal(g.deck.length,before)}
   assert.ok(r.pos>=0&&r.pos<=8);
   turns++;
 }
 games++;
}
assert.ok(taken>0,'some games should use Push & Take');

for(const bots of [1,2]){
 const r=runtime('dist/index.html','D');r.api.start(bots,'D');
 for(let round=0;round<8;round++){
  const g=r.api.game,m={kind:'hand',index:0,color:g.players[0].hand[0],pos:0};
  assert.equal(r.api.queueMove(0,m),true);
  assert.equal(r.api.queueMove(0,m),false,'double-commit prevention');
  let guard=0;
  while(!['roundEnd','over'].includes(r.api.game.phase)){
   assert.ok(++guard<75,'UI progression stuck');
   const snapshot=JSON.stringify(r.api.game);
   r.api.game=null;assert.equal(r.api.load(),true);
   assert.equal(JSON.stringify(r.api.game),snapshot,'pending move survives reload');
   r.api.advance();
  }
  assert.equal(r.api.game.board.length,9);
  assert.equal(r.api.game.players[0].hand.length,3);
  if(round<7)r.api.advance();
 }
 assert.equal(r.api.game.over,true);
 assert.equal(r.api.game.log.length,8);
 r.api.setScreen('lab');r.api.render();
 assert.ok(r.nodes.app.innerHTML.includes('Push &amp; Take')||r.nodes.app.innerHTML.includes('Push & Take'));
}
{
 const r=runtime('dist/index.html','D');r.api.start(1,'D');r.api.game.board=fixture.slice();r.api.game.players[0].hand=['B','B','B'];
 assert.ok(r.api.queueMove(0,move));
 assert.deepEqual(Array.from(r.api.game.pending.steps,x=>x.kind),['placed','take']);
 const q=r.api.game.pending,first={id:17,screen:'play',round:0,phase:'resolve',board:q.steps[0].board,pending:{...q,cursor:0},draftSwap:null},
  second={...first,board:q.steps[1].board,pending:{...q,cursor:1}};
 const plan=r.api.transitionPlan(first,second);
 assert.equal(plan.kind,'take');
 assert.deepEqual(Array.from(plan.removed),[9]);
 r.api.advance();r.api.advance();
 assert.equal(r.api.game.players[0].hand.join(''),'BBP');
}
console.log('Push & Take: '+games+' complete engine games, '+turns+' turns, '+taken+' captures; scoring, specials, hidden information, UI completion, reload and take animation mapping passed.');
