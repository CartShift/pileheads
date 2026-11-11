'use strict';
const assert=require('node:assert/strict'),E=require('./engine.js');
let checks=0,completed=0;
function check(label,fn){fn();checks++;console.log('PASS '+label)}
function fromStock(g,predicate){
 const i=g.stock.findIndex(predicate);assert.ok(i>=0,'Fixture card not found');
 return g.stock.splice(i,1)[0];
}
check('Physical 48-card pack has 32 balanced CORE + 16 EXTRA cards',()=>{
 const cards=E.deck();
 assert.equal(cards.length,48);assert.equal(new Set(cards.map(c=>c.id)).size,48);
 for(let n=1;n<=8;n++)for(const arrow of ['up','down']){
  assert.equal(cards.filter(c=>c.n===n&&c.arrow===arrow&&c.id%3!==2).length,2);
  assert.equal(cards.filter(c=>c.n===n&&c.arrow===arrow&&c.id%3===2).length,1);
 }
 const g=E.create({seed:7});
 assert.equal(g.people[0].hand.length,4);assert.equal(g.people[1].hand.length,4);
 assert.equal(g.aside.length,16);assert.equal(g.stock.length,24);
 assert.equal(E.count(g),48);
});
check('Every legal move obeys the arrow and combos have opposite arrows',()=>{
 for(let seed=1;seed<=150;seed++){
  const g=E.create({seed});
  for(let turns=0;turns<20&&!E.finished(g);turns++){
   const seat=E.active(g),hand=g.people[seat].hand,top=g.pile.at(-1),moves=E.legal(g,seat);
   assert.ok(moves.length>0);
   const seen=new Set();
   for(const m of moves){
    if(m.type==='take')continue;
    const indices=m.indices;
    assert.ok(indices.length>=1&&indices.length<=2);
    assert.ok(indices.every(i=>Number.isInteger(i)&&i>=0&&i<hand.length));
    assert.equal(new Set(indices).size,indices.length);
    assert.ok(E.valid(top,hand[indices[0]]));
    if(indices.length===2){
     assert.notEqual(hand[indices[0]].arrow,hand[indices[1]].arrow);
     assert.ok(E.valid(hand[indices[0]],hand[indices[1]]));
     assert.notEqual(top?.n,hand[indices[0]].n,'Matching first card ends turn');
    }
    const signature=indices.join(',');
    assert.ok(!seen.has(signature),'Duplicate legal sequence');seen.add(signature);
   }
   E.play(g,seat,E.choose(g,seat,'strategic'));
  }
 }
});
check('An optional second card uses the selected order, does not create a second turn',()=>{
 let found=null;
 for(let seed=1;seed<=80&&!found;seed++){
  const g=E.create({seed}),pair=E.legal(g,0).find(m=>m.indices?.length===2);
  if(pair)found={g,pair};
 }
 assert.ok(found,'No two-card opportunity in 80 starts');
 const {g,pair}=found,original=pair.indices.map(i=>g.people[0].hand[i]);
 const result=E.play(g,0,pair);
 assert.equal(result.cards.length,2);assert.deepEqual(result.cards,original);
 assert.equal(g.turn,1);assert.equal(E.active(g),1);assert.equal(E.count(g),48);
 assert.equal(g.people[0].hand.length,4);
});
check('Same rank on first card clears immediately and forbids second play',()=>{
 const g=E.create({seed:42});
 const first=g.people[0].hand[0],top=fromStock(g,c=>c.n===first.n);
 g.pile.push(top);
 const actions=E.legal(g,0).filter(m=>m.indices?.[0]===0);
 assert.equal(actions.length,1);
 assert.equal(actions[0].indices.length,1);
 const e=E.play(g,0,actions[0]);
 assert.equal(e.reason,'match');assert.equal(e.cleared,2);
 assert.equal(g.pile.length,0);assert.equal(E.count(g),48);
});
check('Matching number on second card clears after two-card Zigzag',()=>{
 const g=E.create({seed:501});
 const up=fromStock(g,c=>c.n===5&&c.arrow==='up');
 const down=fromStock(g,c=>c.n===5&&c.arrow==='down');
 g.stock.push(g.people[0].hand[0]);g.people[0].hand[0]=up;
 g.stock.push(g.people[0].hand[1]);g.people[0].hand[1]=down;
 const candidate=E.legal(g,0).find(m=>m.indices?.join(',')==='0,1');
 assert.ok(candidate);
 const e=E.play(g,0,candidate);
 assert.equal(e.reason,'match');assert.equal(e.cards.length,2);
 assert.equal(g.pile.length,0);assert.equal(E.count(g),48);
});
check('No valid first card means forced top-card pickup',()=>{
 const g=E.create({seed:77});
 for(let i=0;i<g.people[0].hand.length;i++)if(g.people[0].hand[i].n===8){
  const replacement=fromStock(g,c=>c.n<8);
  g.stock.push(g.people[0].hand[i]);g.people[0].hand[i]=replacement;
 }
 g.pile.push(fromStock(g,c=>c.n===2));
 g.pile.push(fromStock(g,c=>c.n===8&&c.arrow==='up'));
 assert.deepEqual(E.legal(g,0),[{type:'take'}]);
 const before=g.people[0].hand.length,e=E.play(g,0,{type:'take'});
 assert.equal(e.taken,1);assert.equal(e.cleared,1);
 assert.equal(g.people[0].hand.length,before+1);assert.equal(E.count(g),48);
});
check('Invalid sequences and wrong seat are rejected without changing game',()=>{
 const g=E.create({seed:43}),before=JSON.stringify(g);
 assert.throws(()=>E.play(g,1,{type:'play',indices:[0]}),/Not your turn/);
 assert.throws(()=>E.play(g,0,{type:'play',indices:[0,0]}),/Illegal/);
 assert.throws(()=>E.play(g,0,{type:'play',indices:[999]}),/Illegal/);
 assert.equal(JSON.stringify(g),before);
});
check('Strategic agent never reads hidden opponent hands or stock ordering',()=>{
 const a=E.create({seed:55}),b=JSON.parse(JSON.stringify(a));
 b.people[1].hand=b.people[1].hand.map(c=>({...c,n:8,arrow:'down',id:-c.id-1}));
 b.stock.reverse();
 assert.deepEqual(E.choose(a,0,'strategic'),E.choose(b,0,'strategic'));
});
check('3,200 complete matches conserve every card and terminate under tested policies',()=>{
 const policyPairs=[['strategic','strategic'],['strategic','greedy'],
  ['greedy','random'],['single','random']];
 for(let seed=1;seed<=800;seed++)for(const ps of policyPairs){
  const g=E.create({seed:seed*133+20261111});
  while(!E.finished(g)){
   const s=E.active(g),m=E.choose(g,s,ps[s]);
   E.play(g,s,m);assert.equal(E.count(g),48);
  }
  assert.equal(g.draw,false,'Unexpected safety cap draw');
  assert.ok(g.turn<=E.MAX_TURNS);
  completed++;
 }
});
check('Seed and policies reproduce the entire physical game history',()=>{
 const a=E.simulate({seed:1212},['strategic','greedy']);
 const b=E.simulate({seed:1212},['strategic','greedy']);
 assert.deepEqual(a,b);
});
console.log(JSON.stringify({pass:true,checks,completed}));
