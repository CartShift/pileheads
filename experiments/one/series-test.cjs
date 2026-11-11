'use strict';
const assert=require('node:assert/strict'),E=require('./engine.js'),S=require('./series.js');
let checks=0,sets=0;
function check(label,fn){fn();checks++;console.log('PASS '+label)}
check('A set is best of three, not a change to the card rules',()=>{
 const s=S.create(20261111);
 assert.equal(s.round,1);assert.deepEqual(s.wins,[0,0]);assert.equal(s.complete,false);
 assert.equal(S.firstSeat(s),1);
 assert.equal(S.roundSeed(s),20261111);
 const e=E.create({mode:'quick',firstSeat:S.firstSeat(s),seed:S.roundSeed(s)});
 assert.equal(E.active(e),1);assert.equal(E.count(e),48);
 assert.equal(e.people[0].hand.length,4);
});
check('Both players get one opening lead across the first two rounds',()=>{
 for(let seed=2;seed<40;seed++){
  const s=S.create(seed),first=S.firstSeat(s);
  const a={winner:seed%2,people:[{},{}],seed,firstSeat:first,turn:40};
  S.record(s,a);
  assert.equal(s.wins[a.winner],1);
  assert.throws(()=>S.record(s,a),/already recorded/);
  const b=S.advance(s);
  assert.equal(b.firstSeat,1-first);
  assert.equal(b.seed,(seed+7919)>>>0);
  assert.equal(s.round,2);
  assert.equal(s.history.length,1);
 }
});
check('Round 3 starts with the loser of round 2',()=>{
 const s=S.create(100);
 S.record(s,{winner:0,people:[{},{}],seed:100,firstSeat:0,turn:39});
 S.advance(s);
 S.record(s,{winner:1,people:[{},{}],seed:8019,firstSeat:1,turn:41});
 assert.deepEqual(s.wins,[1,1]);
 const next=S.advance(s);
 assert.equal(next.firstSeat,0);
 assert.equal(next.seed,15938);
 S.record(s,{winner:0,people:[{},{}],seed:15938,firstSeat:0,turn:38});
 assert.equal(s.complete,true);
 assert.deepEqual(s.wins,[2,1]);
 assert.throws(()=>S.advance(s),/Cannot start/);
});
check('Unexpected game or unresolved game cannot be scored',()=>{
 const s=S.create(11);
 assert.throws(()=>S.record(s,{winner:null,people:[{},{}],seed:11,firstSeat:1}),/unresolved/);
 assert.throws(()=>S.record(s,{winner:0,people:[{},{}],seed:11,firstSeat:0}),/does not belong/);
 assert.throws(()=>S.record(s,{winner:0,people:[{},{}],seed:12,firstSeat:1}),/does not belong/);
});
check('A drawn round can retry a new shuffled seed without losing set score',()=>{
 const s=S.create(11),first=S.firstSeat(s),before=S.roundSeed(s);
 const retry=S.retry(s);
 assert.notEqual(retry.seed,before);
 assert.equal(retry.firstSeat,first);
 assert.equal(s.round,1);assert.deepEqual(s.wins,[0,0]);
 S.record(s,{winner:0,people:[{},{}],seed:retry.seed,firstSeat:first,turn:52});
 assert.deepEqual(s.wins,[1,0]);
 assert.equal(S.advance(s).firstSeat,1-first);
 assert.equal(s.retries,0);
});
check('Old game state with no firstSeat continues to play from seat zero',()=>{
 const old=E.create({mode:'quick',seed:8});
 delete old.firstSeat;
 assert.equal(E.active(old),0);
 E.play(old,0,E.legal(old,0)[0]);
 assert.equal(E.active(old),1);
 assert.equal(E.count(old),48);
});
function runSet(seed,policy){
 const s=S.create(seed),history=[];
 while(!s.complete){
  const g=E.create({mode:'quick',players:2,seed:S.roundSeed(s),firstSeat:S.firstSeat(s)});
  while(!E.finished(g)){
   const seat=E.active(g);
   const m=E.choose(g,seat,policy);
   E.play(g,seat,m);
   assert.equal(E.count(g),48);
  }
  assert.equal(g.draw,false,'Set should not contain incomplete match');
  S.record(s,g);
  history.push({round:s.round,winner:g.winner,firstSeat:g.firstSeat,turns:g.turn});
  if(!s.complete)S.advance(s);
 }
 return{s,history};
}
check('500 complete sets with seeded bots and no duplicated scores',()=>{
 for(let i=1;i<=500;i++){
  const {s,history}=runSet((20261111+i*11)>>>0,['strategic','basic','random'][i%3]);
  assert.ok(history.length===2||history.length===3);
  assert.equal(s.wins.reduce((a,b)=>a+b,0),history.length);
  assert.ok(s.wins.some(x=>x===2));
  assert.equal(s.history.length,history.length);
  assert.equal(history[1].firstSeat,1-history[0].firstSeat);
  if(history.length===3)assert.equal(history[2].firstSeat,1-history[1].winner);
  sets++;
 }
});
check('Series export retains public action history, never private hands or hidden stock',()=>{
 const S2=S.create(12345);
 const g=E.create({seed:S.roundSeed(S2),firstSeat:S.firstSeat(S2),mode:'quick'});
 while(!E.finished(g)){
  const seat=E.active(g);E.play(g,seat,E.choose(g,seat,'adaptive'));
 }
 S.record(S2,g);
 const h=S2.history[0];
 assert.equal(h.events.length,g.turn);
 assert.equal(h.pickups,g.log.filter(e=>e.action==='take').length);
 assert.equal(h.clears,g.log.filter(e=>e.reason==='match').length);
 assert.equal(h.events[0].turn,1);
 const json=JSON.stringify(S2);
 assert.equal(json.includes('"stock":['),false,'Must not store stock card order');
 assert.equal(json.includes('"hand":['),false,'Must not store hidden hands');
 assert.ok(h.events.every(e=>e.card===null||(Number.isInteger(e.card.n)&&['up','down'].includes(e.card.arrow))));
});
console.log(JSON.stringify({pass:true,checks,sets}));
