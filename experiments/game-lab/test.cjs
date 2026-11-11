'use strict';
/* SPARK Game Lab deterministic engine tests, no CI requirement. */
const assert=require('node:assert/strict'),E=require('./engine.js');
let checks=0,fullGames=0,turns=0;
function test(name,fn){fn();checks++;console.log('OK '+name)}
test('72 Claim cards: 3 colors × 3 ranks × eight each; 2-4 players',()=>{
 for(const n of [2,3,4]){
  const g=E.createClaim({seed:10,players:n});
  const all=[...g.stock,...g.players.flatMap(p=>p.hand)];
  assert.equal(all.length,72);assert.equal(new Set(all.map(x=>x.id)).size,72);
  assert.ok(g.players.every(p=>p.hand.length===4));
  for(const c of ['O','B','P'])for(const v of [1,2,3])
   assert.equal(all.filter(x=>x.c===c&&x.v===v).length,8);
  assert.equal(E.cardCount(g),72);
 }
});
test('Claim forced-play / optional-bank choices are legal only after projected placement',()=>{
 const g=E.createClaim({seed:123});
 const start=E.claimLegal(g,0);
 assert.equal(start.length,4);assert.ok(start.every(x=>x.type==='play'&&x.bank===null));
 assert.throws(()=>E.playClaim(g,0,{type:'play',index:0,bank:'O'}),/Illegal Claim/);
 assert.throws(()=>E.playClaim(g,1,{type:'play',index:0,bank:null}),/Wrong seat/);
 const r=E.playClaim(g,0,start[0]);assert.equal(r.type,'play');
 assert.equal(g.players[0].hand.length,4);assert.equal(E.cardCount(g),72);
});
test('Claim lane strength tie and majority are determined by printed ranks',()=>{
 const dummy={id:1,c:'O',v:3};
 const lane=[{owner:0,card:dummy},{owner:1,card:{id:2,c:'O',v:1}},
   {owner:1,card:{id:3,c:'O',v:2}}];
 assert.equal(E.strength(lane,0),3);assert.equal(E.strength(lane,1),3);
 assert.equal(E.leader(lane,2),null);
 lane.push({owner:0,card:{id:4,c:'O',v:1}});
 assert.equal(E.leader(lane,2),0);
});
function shiftCard(g,c,v){
 const i=g.stock.findIndex(x=>x.c===c&&x.v===v);
 assert.ok(i>=0,'Need card '+c+v);
 return g.stock.splice(i,1)[0];
}
test('Claim banking 5 cards awards doubled 10 points and transfers only physical cards',()=>{
 const g=E.createClaim({seed:234});
 const handIndex=g.players[0].hand.findIndex(x=>x.c==='O');
 if(handIndex<0){
  const ix=g.players[0].hand.findIndex(()=>true);
  g.stock.push(g.players[0].hand[ix]);
  g.players[0].hand[ix]=shiftCard(g,'O',2);
 }
 const ix=g.players[0].hand.findIndex(x=>x.c==='O');
 for(const v of [3,3,2,1])g.lanes.O.push({owner:0,card:shiftCard(g,'O',v)});
 const legal=E.claimLegal(g,0).find(m=>m.index===ix&&m.bank==='O');
 assert.ok(legal);
 const event=E.playClaim(g,0,legal);
 assert.equal(event.bank.cards,5);assert.equal(event.bank.points,10);
 assert.equal(g.players[0].score,10);assert.equal(g.players[0].captured.length,5);
 assert.equal(g.lanes.O.length,0);assert.equal(E.cardCount(g),72);
});
test('Claim seventh card overload automatically resolves and preserves cards',()=>{
 const g=E.createClaim({seed:345});
 const color=g.players[0].hand[0].c;
 for(const v of [3,3,2,1,1,1])g.lanes[color].push({owner:0,card:shiftCard(g,color,v)});
 const legal=E.claimLegal(g,0).find(m=>m.index===0&&m.bank===null);
 const event=E.playClaim(g,0,legal);
 assert.equal(event.trigger.reason,'overload');assert.equal(event.trigger.cards,7);
 assert.equal(event.trigger.points,14);assert.equal(g.players[0].score,14);
 assert.equal(E.cardCount(g),72);
});
test('Signal has 60 cards, 10 rounds, rank 1-5, 3 of each color/value',()=>{
 const g=E.createSignal({seed:456});
 const all=[...g.stock,...g.prizes,...g.players.flatMap(p=>p.hand)];
 assert.equal(all.length,60);assert.equal(new Set(all.map(x=>x.id)).size,60);
 for(const c of E.COLORS)for(let v=1;v<=5;v++)assert.equal(all.filter(x=>x.c===c&&x.v===v).length,3);
 assert.equal(g.prizes.length,3);assert.ok(g.players.every(p=>p.hand.length===5));
 assert.equal(E.cardCount(g),60);
});
test('Signal bid is hidden until second player commits; legal actions are 5x3',()=>{
 const g=E.createSignal({seed:567});
 assert.equal(E.signalLegal(g,0).length,15);
 assert.equal(E.signalLegal(g,1).length,0);
 const first=E.playSignal(g,0,{type:'bid',index:0,slot:1});
 assert.equal(first.type,'waiting');assert.equal(g.round,0);
 assert.equal(E.signalSeat(g),1);assert.equal(E.signalLegal(g,1).length,15);
 assert.equal(E.cardCount(g),60);
 assert.throws(()=>E.playSignal(g,0,{type:'bid',index:0,slot:1}),/Wrong seat/);
 const outcome=E.playSignal(g,1,{type:'bid',index:0,slot:2});
 assert.equal(outcome.type,'reveal');assert.equal(g.round,1);assert.equal(outcome.claims.length,3);
 assert.equal(outcome.claims.filter(x=>x.winner!==null).length,2);
 assert.equal(E.cardCount(g),60);
 assert.ok(g.players.every(p=>p.hand.length===5));
});
test('Signal matching bid color grants +2 without changing card rank',()=>{
 assert.equal(E.signalPower({c:'O',v:2},{c:'O',v:5}),4);
 assert.equal(E.signalPower({c:'O',v:2},{c:'B',v:5}),2);
});
test('Signal both bidding on same prize yields a contest and discard on tie',()=>{
 const g=E.createSignal({seed:678});
 E.playSignal(g,0,{type:'bid',index:0,slot:0});
 const e=E.playSignal(g,1,{type:'bid',index:0,slot:0});
 assert.equal(e.claims[0].contested,true);
 const bidders=e.bids.map(b=>E.signalPower(b.card,e.claims[0].prize));
 if(bidders[0]===bidders[1])assert.equal(e.claims[0].winner,null);
 else assert.equal(e.claims[0].winner,bidders[0]>bidders[1]?0:1);
 assert.equal(E.cardCount(g),60);
});
test('Signal bot never reads hidden opponent cards or secret commitment',()=>{
 const g=E.createSignal({seed:789});
 const original=E.signalChoose(g,0,'planner');
 const alt=JSON.parse(JSON.stringify(g));
 alt.players[1].hand=[{id:-1,c:'G',v:5},{id:-2,c:'G',v:5}];
 alt.commits[1]={seat:1,card:{id:-3,c:'O',v:5},slot:2};
 assert.deepEqual(E.signalChoose(g,0,'planner'),E.signalChoose(alt,0,'planner'));
 assert.deepEqual(E.signalChoose(g,0,'greedy'),original.type==='bid'?E.signalChoose(g,0,'greedy'):original);
});
test('All games complete with bounded turns, constant deck and no phantom cards',()=>{
 for(let seed=1;seed<=90;seed++){
  for(const players of [2,3,4]){
   const g=E.createClaim({seed:1000+seed*33,players});
   while(!E.claimDone(g)){
    const seat=g.turn%g.players.length;
    const move=E.claimChoose(g,seat,seat===0?'planner':'greedy');
    E.playClaim(g,seat,move);turns++;
    assert.equal(E.cardCount(g),72);
    assert.ok(g.players.every(x=>x.hand.length===4));
   }
   assert.equal(g.turn,players*g.turnsPerPlayer);fullGames++;
  }
  const g=E.createSignal({seed:2000+seed*33});
  while(!E.signalDone(g)){
   const choiceA=E.signalChoose(g,0,'planner');E.playSignal(g,0,choiceA);
   const choiceB=E.signalChoose(g,1,'greedy');E.playSignal(g,1,choiceB);
   assert.equal(E.cardCount(g),60);turns+=2;
  }
  assert.equal(g.round,10);assert.equal(E.signalLegal(g,0).length,0);
  assert.equal(g.players.reduce((s,p)=>s+p.score,0),g.players.reduce((s,p)=>s+p.captured.reduce((t,c)=>t+c.v,0),0));
  fullGames++;
 }
});
test('A seeded match replays deterministically',()=>{
 const a=E.runClaim({seed:940}),b=E.runClaim({seed:940});
 assert.deepEqual(a,b);
 const c=E.runSignal({seed:941}),d=E.runSignal({seed:941});
 assert.deepEqual(c,d);
});
test('Impossible configuration and invalid actions are rejected',()=>{
 assert.throws(()=>E.createClaim({players:5}),/2-4 players/);
 assert.throws(()=>E.createClaim({seed:-1}),/Invalid seed/);
 assert.throws(()=>E.createSignal({rounds:11}),/3-10/);
 const c=E.createClaim({seed:11});assert.throws(()=>E.playClaim(c,0,{type:'play',index:99}),/Illegal Claim/);
 const s=E.createSignal({seed:12});assert.throws(()=>E.playSignal(s,0,{type:'bid',index:99,slot:0}),/Illegal Signal/);
});
console.log(JSON.stringify({pass:true,checks,fullGames,turns}));
