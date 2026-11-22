'use strict';
const assert=require('node:assert/strict');
const E=require('../dist/pilehead/engine.js');
const test=(name,fn)=>{fn();console.log('PASS '+name)};
function fixture({players=3,active=players,stockEmpty=true,pileCount=3,legacy=false}={}){
 const g=E.create({players,seed:20261122});
 for(const p of g.people)E.autoSetup(g,p.seat);
 E.start(g);
 if(stockEmpty)g.people[1].hand.push(...g.stock.splice(0));
 if(pileCount)g.pile.push(...g.people[1].hand.splice(0,pileCount));
 for(let s=active;s<players;s++){
  const p=g.people[s];
  g.ashes.push(...p.hand.splice(0),...p.up.splice(0),...p.down.splice(0));
  p.out=true;g.finishedOrder.push(s);
 }
 if(legacy){g.version='pilehead-1.6.0';delete g.endgameRule}
 E.invariant(g);return g;
}
function force(g,dest,index,match){
 if(match(dest[index]))return dest[index];
 const zones=[g.stock,g.pile,g.ashes,...g.people.flatMap(p=>[p.hand,p.up,p.down])];
 for(const zone of zones){
  const found=zone.findIndex(match);
  if(found>=0){[dest[index],zone[found]]=[zone[found],dest[index]];return dest[index]}
 }
 throw Error('Missing test card');
}
test('v1.7 gives the existing 54-card deck a new ruleset, preserving old decks',()=>{
 assert.equal(E.VERSION,'pilehead-1.7.0');
 assert.equal(E.deck().length,54);
 assert.equal(E.deck('pilehead-1.6.0').length,54);
 assert.equal(E.deck('pilehead-1.5.0').length,52);
 assert.equal(E.create({players:2}).endgameRule,'final-duel');
});
test('stock and three-player stage keep all normal pickups intact',()=>{
 for(const g of [fixture({players:3}),fixture({players:2,stockEmpty:false})]){
  assert.equal(E.finalDuelActive(g),false);
  const top=g.pile.at(-1).id,old=g.ashes.length;
  const result=E.move(g,0,{type:'take'});
  assert.equal(result.erodedCount,0);
  assert.equal(result.takenCount,result.count);
  assert.equal(g.ashes.length,old);
  assert(g.people[0].hand.some(c=>c.id===top));
  E.invariant(g);
 }
});
test('in Final Duel, ordinary take burns exactly the visible top card',()=>{
 const g=fixture({players:3,active:2}),top=g.pile.at(-1).id,ashes=g.ashes.length;
 assert.equal(E.finalDuelActive(g),true);
 const ev=E.move(g,0,{type:'take'});
 assert.equal(ev.erodedCount,1);
 assert.equal(ev.takenCount,ev.count-1);
 assert.equal(g.ashes.length,ashes+1);
 assert(g.ashes.some(c=>c.id===top));
 assert(!g.people[0].hand.some(c=>c.id===top));
 E.invariant(g);
});
test('legacy v1.6 54-card rounds cannot silently activate Final Duel',()=>{
 const g=fixture({players:2,legacy:true}),top=g.pile.at(-1).id;
 assert.equal(E.finalDuelActive(g),false);
 const ev=E.move(g,0,{type:'take'});
 assert.equal(ev.erodedCount,0);
 assert(g.people[0].hand.some(c=>c.id===top));
 E.invariant(g);
});
test('direct DUMP transfers the remaining pile and erodes only the top card',()=>{
 const g=fixture({players:2,pileCount:3}),card=force(g,g.people[0].hand,0,c=>c.action==='dump');
 const top=g.pile.at(-1).id,before=g.pile.length;
 const ev=E.move(g,0,{type:'play',source:'hand',ids:[card.id],target:1});
 assert.equal(ev.erodedCount,1);
 assert.equal(ev.takenCount,before-1);
 assert(g.ashes.some(c=>c.id===top));
 E.invariant(g);
});
test('pending blind DUMP follows two-stage rules without accidental early erosion',()=>{
 const g=fixture({players:3,pileCount:3}),p=g.people[0];
 const dump=force(g,p.down,0,c=>c.action==='dump');
 g.people[1].hand.push(...p.hand.splice(0),...p.up.splice(0),...p.down.splice(1));
 assert.equal(E.stage(g,0),'down');
 const ev=E.move(g,0,{type:'play',source:'down',ids:[dump.id]});
 assert.equal(ev.type,'dump-pending');
 const picked=E.resolveDump(g,0,1);
 assert.equal(picked.erodedCount,0,'three active players may not erode');
 E.invariant(g);
});
test('failed final blind card burns and immediately finishes the player',()=>{
 const g=fixture({players:2,pileCount:0}),p=g.people[0];
 const bad=force(g,p.down,0,c=>c.kind==='number'&&c.rank<10);
 g.people[1].hand.push(...p.hand.splice(0),...p.up.splice(0),...p.down.splice(1));
 g.limit={type:'min',value:10};g.turn=0;
 const ev=E.move(g,0,{type:'play',source:'down',ids:[bad.id]});
 assert.equal(ev.type,'blind-fail');
 assert.equal(ev.erodedCount,1);
 assert.equal(ev.takenCount,0);
 assert(g.people[0].out);
 assert.equal(g.phase,'over');
 assert(g.ashes.some(c=>c.id===bad.id));
 E.invariant(g);
});
test('seeded endgames consistently finish while preserving all 54 IDs',()=>{
 let completed=0;
 for(const players of [2,3,4,5])for(let i=0;i<40;i++){
  const g=E.create({seed:(20261122+i*37)>>>0,players});
  for(const p of g.people)E.autoSetup(g,p.seat);
  E.start(g);
  for(let n=0;n<1800&&g.phase==='play';n++){
   if(g.pendingDump)E.resolveDump(g,g.pendingDump.seat,E.botDumpTarget(g,g.pendingDump.seat));
   else E.move(g,g.turn,E.choose(g,g.turn,['greedy','saver','random'][g.turn%3]));
  }
  E.invariant(g);
  if(g.phase==='over')completed++;
 }
 assert(completed>=158,'Final Duel should complete almost all deterministic rounds: '+completed+'/160');
});
console.log('PASS STACK Final Duel: versioning, 3 pickup paths, blind finish, legacy protection and seeded termination');
