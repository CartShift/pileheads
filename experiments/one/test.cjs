'use strict';
const assert=require('node:assert/strict'),E=require('./engine.js');
let checks=0,full=0,draws=0,turns=0;
function check(name,fn){fn();checks++;console.log('PASS '+name)}
check('Purpose-built 48 cards: one number, one arrow, balanced distribution',()=>{
 const deck=E.deck();assert.equal(deck.length,48);assert.equal(new Set(deck.map(x=>x.id)).size,48);
 for(let v=1;v<=8;v++){assert.equal(deck.filter(c=>c.n===v&&c.arrow==='up').length,3);
 assert.equal(deck.filter(c=>c.n===v&&c.arrow==='down').length,3)}
 assert.ok(deck.every(c=>Object.keys(c).sort().join(',')==='arrow,id,n'));
});
check('Deal three private cards to 2, 3 and 4 players',()=>{
 for(const people of [2,3,4]){const g=E.create({seed:42,players:people});
  assert.equal(g.stock.length,48-3*people);assert.ok(g.people.every(p=>p.hand.length===3));
  assert.equal(E.count(g),48)}
});
check('A card arrow defines the next playable number, not the arrow on incoming card',()=>{
 assert.equal(E.valid({n:5,arrow:'up'},{n:7,arrow:'down'}),true);
 assert.equal(E.valid({n:5,arrow:'up'},{n:3,arrow:'up'}),false);
 assert.equal(E.valid({n:5,arrow:'down'},{n:3,arrow:'up'}),true);
 assert.equal(E.valid({n:5,arrow:'down'},{n:7,arrow:'down'}),false);
 assert.equal(E.valid({n:5,arrow:'down'},{n:5,arrow:'up'}),true);
 assert.equal(E.valid(undefined,{n:1,arrow:'up'}),true);
});
function fromStock(g,number,arrow){
 const i=g.stock.findIndex(c=>c.n===number&&(arrow===undefined||c.arrow===arrow));
 assert.ok(i>=0,'Missing fixture card '+number+' '+arrow);
 return g.stock.splice(i,1)[0];
}
check('Matching the top rank clears the pile and preserves all cards',()=>{
 const g=E.create({seed:120}),i=0,card=g.people[0].hand[i];
 const top=fromStock(g,card.n,card.arrow);
 g.pile.push(top);const beforeAsh=g.ashes.length;
 const e=E.play(g,0,{type:'play',index:i});
 assert.equal(e.cleared,2);assert.equal(e.reason,'match');assert.equal(g.ashes.length,beforeAsh+2);
 assert.equal(g.pile.length,0);assert.equal(E.count(g),48);
});
check('No playable card forces a one-card pickup and clears remaining pile',()=>{
 const g=E.create({seed:121});
 // Force a rising 8 that cannot be played by this hand, without adding/removing physical cards.
 for(let i=0;i<g.people[0].hand.length;i++)if(g.people[0].hand[i].n===8){
  const r=fromStock(g,1);g.stock.push(g.people[0].hand[i]);g.people[0].hand[i]=r;
 }
 g.pile.push(fromStock(g,2));
 g.pile.push(fromStock(g,8,'up'));
 const opts=E.legal(g,0);assert.deepEqual(opts,[{type:'take'}]);
 const prev=g.people[0].hand.length;
 const e=E.play(g,0,{type:'take'});
 assert.equal(e.taken,1);assert.equal(e.cleared,1);assert.equal(g.pile.length,0);
 assert.equal(g.people[0].hand.length,prev+1);assert.equal(E.count(g),48);
});
check('Cannot voluntarily take cards when a playable card is available',()=>{
 const g=E.create({seed:11});
 assert.throws(()=>E.play(g,0,{type:'take'}),/Illegal action/);
 assert.throws(()=>E.play(g,1,{type:'play',index:0}),/Not your turn/);
 assert.throws(()=>E.play(g,0,{type:'play',index:300}),/Illegal action/);
});
check('Opponent hand stays hidden from thoughtful agent',()=>{
 const a=E.create({seed:13}),b=JSON.parse(JSON.stringify(a));
 b.people[1].hand=b.people[1].hand.map(c=>({...c,n:8,arrow:'down'}));
 assert.deepEqual(E.choose(a,0,'thoughtful'),E.choose(b,0,'thoughtful'));
});
check('Game completion condition requires empty stock and empty hand',()=>{
 const g=E.create({seed:21});
 g.ashes.push(...g.stock.splice(0));
 g.ashes.push(...g.people[0].hand.splice(1));
 g.ashes.push(...g.people[1].hand.splice(0));
 const move=E.legal(g,0).find(x=>x.type==='play');assert.ok(move);
 E.play(g,0,move);assert.equal(g.winner,0);assert.equal(E.finished(g),true);
 assert.equal(E.count(g),48);
 assert.deepEqual(E.legal(g,1),[]);
});
check('Repeated simulations always preserve card totals, terminate or declare bounded draw',()=>{
 for(const players of [2,3,4])for(let i=1;i<=40;i++){
  const g=E.create({players,seed:i*71+2026});
  while(!E.finished(g)){
   const seat=E.active(g),legal=E.legal(g,seat);
   assert.ok(legal.length>0,'Alive player must have a legal move');
   const action=E.choose(g,seat,seat===0?'thoughtful':'basic');
   E.play(g,seat,action);turns++;
   assert.equal(E.count(g),48);
  }
  full+=+(g.winner!==null);draws+=+g.draw;assert.ok(g.turn<=E.MAX_TURNS);
 }
 assert.ok(full>=110,'Excessive games reached safety cap');
});
check('Same seed and policy generate reproducible full histories',()=>{
 for(const n of [2,3]){
  const a=E.simulate({players:n,seed:9876});
  const b=E.simulate({players:n,seed:9876});
  assert.deepEqual(a,b);
 }
});
console.log(JSON.stringify({pass:true,checks,full,draws,turns}));
