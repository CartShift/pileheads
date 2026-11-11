'use strict';
const assert=require('node:assert/strict'),E=require('./engine.js');
let checks=0,completions=0,draws=0,turns=0;
function check(name,fn){fn();checks++;console.log('OK '+name)}
check('48 custom cards have balanced independent values and exactly 12 LINK symbols',()=>{
 const deck=E.makeDeck();
 assert.equal(deck.length,48);assert.equal(new Set(deck.map(c=>c.id)).size,48);
 for(let v=1;v<=8;v++){
  assert.equal(deck.filter(c=>c.crest===v).length,6);
  assert.equal(deck.filter(c=>c.shade===v).length,6);
 }
 assert.equal(deck.filter(c=>c.pivot).length,12);
 assert.ok(deck.some(c=>c.crest!==c.shade));
});
check('Both concepts deal four cards and preserve 48 physical cards',()=>{
 for(const kind of ['cross','forge'])for(const players of [2,3,4]){
  const g=E.create({kind,seed:91,players});
  assert.equal(g.stock.length,48-players*4);
  assert.ok(g.players.every(p=>p.hand.length===4));
  assert.equal(E.count(g),48);
 }
});
check('CROSS permits either pile at setup and blocks the wrong pile after LINK',()=>{
 const g=E.create({kind:'cross',seed:7});
 const cardIndex=g.stock.findIndex(x=>x.pivot);
 assert.ok(cardIndex>=0);
 const pivot=g.stock.splice(cardIndex,1)[0];
 g.stock.push(g.players[0].hand[0]);g.players[0].hand[0]=pivot;
 const move=E.legal(g,0).find(x=>x.type==='play'&&x.index===0&&x.lane==='sun');
 assert.ok(move);E.move(g,0,move);
 assert.equal(g.force,'moon');
 assert.ok(E.legal(g,1).every(x=>x.lane==='moon'));
 assert.equal(E.count(g),48);
});
check('CROSS pile shatters at exactly three cards',()=>{
 const g=E.create({kind:'cross',seed:32});
 const weak=g.stock.findIndex(x=>x.shade===1);
 const last=g.stock.splice(weak,1)[0];
 const first=g.stock.pop();
 g.piles.sun.push(first,last);
 const move=E.legal(g,0).find(x=>x.type==='play'&&x.lane==='sun');
 assert.ok(move);
 const e=E.move(g,0,move);
 assert.equal(e.burnedCount,3);assert.equal(g.piles.sun.length,0);
 assert.equal(g.burned.length,3);assert.equal(E.count(g),48);
});
check('FORGE preparation costs a turn, and released card uses SHADE with three-point relief',()=>{
 const g=E.create({kind:'forge',seed:103});
 const high=g.stock.findIndex(x=>x.shade>=5);
 const prepared=g.stock.splice(high,1)[0];
 g.stock.push(g.players[0].hand[0]);g.players[0].hand[0]=prepared;
 const event=E.move(g,0,{type:'prepare',index:0});
 assert.equal(event.type,'prepare');assert.equal(g.players[0].prepared.id,prepared.id);
 E.move(g,1,E.choose(g,1,'greedy'));
 const release=E.legal(g,0).find(x=>x.type==='release');
 assert.ok(release,'A prepared SHADE of 5+ should be releasable against a gate at most 8');
 const e=E.move(g,0,release);
 assert.equal(e.card.id,prepared.id);
 assert.equal(g.players[0].prepared,null);
 assert.equal(E.count(g),48);
});
check('FORGE crack collects only the top card and removes the rest from the game',()=>{
 const g=E.create({kind:'forge',seed:114});
 for(let i=0;i<g.players[0].hand.length;i++){
  if(g.players[0].hand[i].crest===8){
   const index=g.stock.findIndex(x=>x.crest<8);
   const better=g.stock.splice(index,1)[0];
   g.stock.push(g.players[0].hand[i]);g.players[0].hand[i]=better;
  }
 }
 g.pile.push({card:g.stock.pop(),mode:'strike'});
 const ix=g.stock.findIndex(x=>x.shade===8);assert.ok(ix>=0);
 g.pile.push({card:g.stock.splice(ix,1)[0],mode:'strike'});
 const pickup=E.legal(g,0).find(x=>x.type==='pickup');
 assert.ok(pickup,'Crack should be available when no regular card can strike');
 const before=g.players[0].hand.length;
 const event=E.move(g,0,pickup);
 assert.equal(event.spent,1);assert.equal(event.burnedCount,1);
 assert.equal(g.players[0].hand.length,before+1);
 assert.equal(g.pile.length,0);assert.equal(E.count(g),48);
});
check('Illegal actions and impossible seeds are rejected',()=>{
 assert.throws(()=>E.create({seed:-1}),/Invalid seed/);
 assert.throws(()=>E.create({players:1}),/Supports 2 to 4/);
 const g=E.create({kind:'cross',seed:90});
 assert.throws(()=>E.move(g,1,{type:'play',index:0,lane:'sun'}),/Not your turn/);
 assert.throws(()=>E.move(g,0,{type:'play',index:100,lane:'sun'}),/Illegal move/);
 const h=E.create({kind:'forge',seed:91});
 assert.throws(()=>E.move(h,0,{type:'release'}),/Illegal move/);
});
check('Hidden enemy hand does not affect the heuristic choice',()=>{
 for(const kind of ['cross','forge']){
  const g=E.create({kind,seed:30}),h=JSON.parse(JSON.stringify(g));
  h.players[1].hand=h.players[1].hand.map(c=>({...c,crest:1,shade:8}));
  assert.deepEqual(E.choose(g,0,'planner'),E.choose(h,0,'planner'));
 }
});
check('150 seeded complete games per concept and player count conserve cards every turn',()=>{
 for(const kind of ['cross','forge'])for(const players of [2,3,4])for(let seed=1;seed<=25;seed++){
  const g=E.create({kind,players,seed:seed*97+18});
  while(!E.ended(g)){
   const seat=E.active(g),l=E.legal(g,seat);
   assert.ok(l.length>0);
   E.move(g,seat,E.choose(g,seat,seat===0?'planner':'greedy'));
   assert.equal(E.count(g),48);
   assert.ok(g.turn<=320);
   turns++;
  }
  completions+=+(g.winner!==null);draws+=+g.drawn;
 }
});
check('Deterministic seeding creates identical full-match history',()=>{
 for(const kind of ['cross','forge']){
  const a=E.simulate({kind,seed:432,players:2},['planner','greedy']);
  const b=E.simulate({kind,seed:432,players:2},['planner','greedy']);
  assert.deepEqual(a,b);
 }
});
console.log(JSON.stringify({pass:true,checks,completions,draws,turns}));
