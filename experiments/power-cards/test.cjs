'use strict';
const assert=require('node:assert/strict'),P=require('./engine.js');
let checks=0,complete=0;
function check(label,fn){fn();checks++;console.log('PASS '+label)}
function put(g,seat,index,predicate){
 const i=g.stock.findIndex(predicate);assert.ok(i>=0,'fixture card missing in stock');
 const incoming=g.stock[i],outgoing=g.people[seat].hand[index];
 g.people[seat].hand[index]=incoming;g.stock[i]=outgoing;return incoming;
}
check('Two one-use Jokers replace two CORE cards, with stable opaque card identities',()=>{
 const all=P.deck(),core=all.filter(c=>c.id%3!==2),extra=all.filter(c=>c.id%3===2);
 assert.equal(all.length,48);assert.equal(core.length,32);assert.equal(extra.length,16);
 assert.equal(core.filter(c=>c.kind==='joker').length,2);
 assert.equal(extra.filter(c=>c.kind==='joker').length,0);
 assert.equal(new Set(all.map(c=>c.id)).size,48);
 for(const mode of P.MODES){
  const g=P.create({seed:1,mode});
  assert.equal(g.stock.length,24);assert.equal(g.people[0].hand.length,4);
  assert.equal(g.aside.length,16);assert.equal(P.count(g),48);
 }
});
check('Joker on an empty pile is discarded, with NO attack or stolen turn',()=>{
 for(const mode of P.MODES){
  const g=P.create({seed:44,mode});
  put(g,0,0,c=>c.kind==='joker');
  const joker=g.people[0].hand[0].id,opponentHand=g.people[1].hand.length;
  const e=P.play(g,0,{type:'play',index:0});
  assert.equal(e.reason,'jokerBurned');
  assert.equal(g.pending,null);
  assert.equal(g.pile.length,0);
  assert.equal(g.winner,null);
  assert.equal(P.active(g),1,'The defender gets a normal turn');
  assert.equal(g.people[1].hand.length,opponentHand);
  assert.ok(g.ashes.some(c=>c.id===joker),'Joker must be consumed');
  assert.equal(P.count(g),48);
 }
});
check('Discarding the last Joker on an empty pile ends the game normally',()=>{
 const g=P.create({seed:47,mode:'match'});
 put(g,0,0,c=>c.kind==='joker');
 g.ashes.push(...g.people[0].hand.splice(1));
 g.ashes.push(...g.stock.splice(0));
 assert.equal(P.count(g),48);
 const e=P.play(g,0,{type:'play',index:0});
 assert.equal(e.reason,'jokerBurned');assert.equal(g.winner,0);
 assert.equal(g.pending,null);assert.equal(P.count(g),48);
});
check('A Joker can be played on any visible pile direction',()=>{
 const g=P.create({seed:12,mode:'match'});
 put(g,0,0,c=>c.kind==='joker');
 const i=P.legal(g,0).find(x=>x.type==='play'&&x.index===0);
 assert.ok(i);
 P.play(g,0,i);
 assert.equal(g.pending.to,1);assert.equal(P.active(g),1);
 assert.equal(g.pending.targetRank,null);
 assert.equal(P.count(g),48);
});
check('Rank challenge stays visible and a matching reply sends the entire pile back',()=>{
 const g=P.create({seed:101,mode:'match'}),target=put(g,0,0,c=>c.n===5&&c.kind!=='joker');
 put(g,0,1,c=>c.kind==='joker');
 put(g,1,0,c=>c.n===5&&c.id!==target.id&&c.kind!=='joker');
 const top=g.people[0].hand.splice(0,1)[0];g.pile.push(top);
 assert.equal(g.pile.at(-1).n,5);
 P.play(g,0,{type:'play',index:0});
 assert.equal(g.pending.targetRank,5);
 const options=P.legal(g,1);
 assert.ok(options.some(x=>x.type==='counter'&&x.index===0));
 assert.ok(options.some(x=>x.type==='takeAll'));
 const handBefore=g.people[0].hand.length;
 const e=P.play(g,1,{type:'counter',index:0});
 assert.equal(e.reason,'jokerBlocked');
 assert.equal(e.taken,1);assert.equal(g.people[0].hand.length,handBefore+1);
 assert.equal(g.pending,null);assert.equal(g.pile.length,0);
 assert.equal(P.active(g),1,'Defender takes the next lead after reflecting');
 assert.equal(P.count(g),48);
});
check('Unanswered attack transfers the full pile, consumes Joker, and costs defender the turn',()=>{
 const g=P.create({seed:321,mode:'plain'}),joker=put(g,0,0,c=>c.kind==='joker');
 const cards=[g.stock.pop(),g.stock.pop(),g.stock.pop()];
 g.pile.push(...cards);const before=g.people[1].hand.length;
 P.play(g,0,{type:'play',index:0});
 assert.equal(g.pending.card.id,joker.id);
 assert.deepEqual(P.legal(g,1),[{type:'takeAll'}]);
 const e=P.play(g,1,{type:'takeAll'});
 assert.equal(e.reason,'jokerHit');assert.equal(e.taken,3);
 assert.equal(g.people[1].hand.length,before+3);
 assert.equal(g.pile.length,0);assert.ok(g.ashes.some(c=>c.id===joker.id));
 assert.equal(P.active(g),0);
 assert.equal(P.count(g),48);
});
check('Joker-on-Joker counter possible only in duel mode',()=>{
 for(const mode of ['joker','match','plain']){
  const g=P.create({seed:55,mode});
  put(g,0,0,c=>c.kind==='joker');put(g,1,0,c=>c.kind==='joker');
  P.play(g,0,{type:'play',index:0});
  const answers=P.legal(g,1);
  assert.equal(answers.some(x=>x.type==='counter'&&x.index===0),mode==='joker');
  assert.equal(P.count(g),48);
 }
});
check('Matching rank is not a counter to a Joker in plain or duel mode',()=>{
 for(const mode of ['plain','joker']){
  const g=P.create({seed:737,mode});
  const chosen=put(g,0,0,c=>c.n===3);
  put(g,0,1,c=>c.kind==='joker');
  put(g,1,0,c=>c.n===3&&c.id!==chosen.id);
  g.pile.push(g.people[0].hand.splice(0,1)[0]);
  P.play(g,0,{type:'play',index:0});
  assert.equal(P.legal(g,1).some(m=>m.type==='counter'&&m.index===0),false);
 }
});
check('Unchanged basic match, ordinary pickup, and directional legality',()=>{
 const g=P.create({seed:900,mode:'match'});
 const top=put(g,0,0,c=>c.n===7&&c.arrow==='up');
 g.pile.push(g.people[0].hand.splice(0,1)[0]);
 const legal=P.legal(g,0);
 assert.ok(legal.filter(m=>m.type==='play').every(m=>{
  const c=g.people[0].hand[m.index];
  return c.kind==='joker'||c.n>=7;
 }));
 assert.equal(P.count(g),48);
});
check('A last-card Joker attack does not end the game until the victim responds',()=>{
 const g=P.create({seed:707,mode:'plain'});
 put(g,0,0,c=>c.kind==='joker');
 g.ashes.push(...g.people[0].hand.splice(1));
 g.ashes.push(...g.stock.splice(0));
 const rankIndex=g.ashes.findIndex(c=>c.kind!=='joker');
 g.pile.push(...g.ashes.splice(rankIndex,1));
 assert.equal(P.count(g),48);
 const first=P.play(g,0,{type:'play',index:0});
 assert.equal(first.reason,'joker');assert.equal(g.winner,null);
 assert.ok(g.pending,'A pending attack must resolve before victory');
 const attack=P.play(g,1,{type:'takeAll'});
 assert.equal(attack.taken,1);assert.equal(g.winner,0);
 assert.equal(g.pending,null);assert.equal(P.count(g),48);
});
check('A last-card matching counter can win after reflecting a pending Joker',()=>{
 const g=P.create({seed:708,mode:'match'});
 put(g,0,0,c=>c.kind==='joker');
 put(g,1,0,c=>c.n===5&&c.kind!=='joker');
 g.ashes.push(...g.people[0].hand.splice(1));
 g.ashes.push(...g.people[1].hand.splice(1));
 const rank=g.stock.findIndex(c=>c.n===5&&c.kind!=='joker');
 assert.ok(rank>=0);
 g.pile.push(...g.stock.splice(rank,1));
 g.ashes.push(...g.stock.splice(0));
 assert.equal(P.count(g),48);
 P.play(g,0,{type:'play',index:0});
 assert.equal(g.winner,null);assert.equal(g.pending.targetRank,5);
 const result=P.play(g,1,{type:'counter',index:0});
 assert.equal(result.reason,'jokerBlocked');
 assert.equal(g.winner,1);assert.equal(g.pending,null);
 assert.equal(P.count(g),48);
});
check('Never inspect hidden stock or opponent hand when choosing attacks',()=>{
 const a=P.create({seed:20,mode:'match'}),b=JSON.parse(JSON.stringify(a));
 b.people[1].hand=b.people[1].hand.map(c=>({...c,n:8,arrow:'down',id:-c.id-1}));
 b.stock.reverse();
 assert.deepEqual(P.choose(a,0,'timing'),P.choose(b,0,'timing'));
});
check('Full randomized regression: no Joker duplication, hidden pending cards or safety-cap draws',()=>{
 for(const mode of P.MODES)for(let i=1;i<=850;i++){
  const g=P.create({seed:20261111+i*133,mode});
  const policies=['timing','greedy','hoard','random'];
  while(!P.finished(g)){
   const active=P.active(g);
   P.play(g,active,P.choose(g,active,policies[(i+active)%policies.length]));
   assert.equal(P.count(g),48);
   assert.ok(g.turn<=P.MAX_TURNS);
  }
  assert.equal(g.draw,false,'Unexpected unresolved or repeated-loop game');
  assert.equal(g.pending,null);
  complete++;
 }
});
check('Identical seed, mode and policy reproduce the entire sequence',()=>{
 for(const mode of P.MODES){
  const a=P.simulate({mode,seed:414141},['timing','greedy']);
  const b=P.simulate({mode,seed:414141},['timing','greedy']);
  assert.deepEqual(a,b);
 }
});
console.log(JSON.stringify({pass:true,checks,completedMatches:complete}));
