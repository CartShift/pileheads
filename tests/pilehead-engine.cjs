'use strict';
const assert=require('node:assert/strict');
const E=require('../dist/pilehead/engine.js');
let checks=0;
function test(name,fn){fn();checks++;console.log('PASS '+name)}
function zones(g){return[g.stock,g.pile,g.ashes,...g.people.flatMap(p=>[p.hand,p.up,p.down])]}
function extract(g,predicate){for(const z of zones(g)){const i=z.findIndex(predicate);if(i>=0)return z.splice(i,1)[0]}
 throw Error('Fixture card not found')}
function inject(g,seat,source,predicate){const card=extract(g,predicate),arr=g.people[seat][source],old=arr.pop();if(old)g.stock.push(old);arr.push(card);return card}
function opened(players=2,seed=42){const g=E.create({players,seed});E.start(g);return g}

test('52 distinct physical cards: forty numbers and twelve actions',()=>{
 const a=E.deck();assert.equal(a.length,52);assert.equal(new Set(a.map(c=>c.id)).size,52);
 for(let n=1;n<=10;n++)assert.equal(a.filter(c=>c.rank===n).length,4);
 for(const [kind,count]of Object.entries(E.ACTIONS))assert.equal(a.filter(c=>c.action===kind).length,count);
 for(let players=2;players<=5;players++){const g=E.create({players});assert.equal(g.stock.length,52-players*9);assert.equal(E.count(g),52);
  for(const p of g.people)assert.deepEqual([p.hand.length,p.up.length,p.down.length],[3,3,3])}
});
test('reproducible shuffle and legal setup exchange',()=>{
 const a=E.create({players:4,seed:123}),b=E.create({players:4,seed:123});
 assert.deepEqual(a,b);const h=a.people[0].hand[0].id,u=a.people[0].up[0].id;
 E.swap(a,0,h,u);assert.equal(a.people[0].hand[0].id,u);assert.equal(a.people[0].up[0].id,h);
 E.invariant(a);E.start(a);assert.throws(()=>E.swap(a,0,u,h));
});
test('number restrictions, UNDER and GHOST work independently of numeric ranks',()=>{
 const g=opened();g.limit={type:'min',value:9};
 assert.equal(E.isLegal(g,{kind:'number',rank:8}),false);
 assert.equal(E.isLegal(g,{kind:'number',rank:9}),true);
 assert.equal(E.isLegal(g,{kind:'action',action:'under'}),true);
 g.limit={type:'under'};
 assert.equal(E.isLegal(g,{kind:'number',rank:5}),false);
 assert.equal(E.isLegal(g,{kind:'number',rank:4}),true);
 const ghost=inject(g,0,'hand',c=>c.action==='ghost');
 E.move(g,0,{type:'play',source:'hand',ids:[ghost.id]});
 assert.equal(g.limit.type,'under');assert.equal(g.turn,1);E.invariant(g);
});
test('RESET cancels UNDER and BURN clears pile and grants a repeat turn',()=>{
 const g=opened();g.limit={type:'under'};
 const reset=inject(g,0,'hand',c=>c.action==='reset');
 E.move(g,0,{type:'play',source:'hand',ids:[reset.id]});
 assert.equal(g.limit,null);assert.equal(g.turn,1);
 const burn=inject(g,1,'hand',c=>c.action==='burn');
 const event=E.move(g,1,{type:'play',source:'hand',ids:[burn.id]});
 assert.equal(event.burned,true);assert.equal(g.pile.length,0);assert.equal(g.turn,1);E.invariant(g);
});
test('SKIP jumps to player after next, and in two seats grants extra turn',()=>{
 for(const players of [2,3]){const g=opened(players),skip=inject(g,0,'hand',c=>c.action==='skip');
 E.move(g,0,{type:'play',source:'hand',ids:[skip.id]});
 assert.equal(g.turn,players===2?0:2);E.invariant(g)}
});
test('playing matching numbers together can burn four in a row',()=>{
 const g=opened(),four=Array.from({length:4},()=>extract(g,c=>c.rank===6));
 g.pile.push(four[0]);g.stock.push(...g.people[0].hand.splice(0));g.people[0].hand.push(...four.slice(1));
 const out=E.move(g,0,{type:'play',source:'hand',ids:four.slice(1).map(c=>c.id)});
 assert.equal(out.reason,'four');assert.equal(g.pile.length,0);assert.equal(g.ashes.length,4);
 assert.equal(g.turn,0);E.invariant(g);
});
test('out-of-turn SLAM burns a public top run with matching private cards',()=>{
 const g=opened(),four=Array.from({length:4},()=>extract(g,c=>c.rank===5));
 g.pile.push(...four.slice(0,3));const old=g.people[1].hand.pop();if(old)g.stock.push(old);g.people[1].hand.push(four[3]);
 g.slamOpen=true;g.turn=0;
 const slam=E.slamOptions(g,1)[0];assert.ok(slam);
 const event=E.move(g,1,slam);assert.equal(event.reason,'slam');
 assert.equal(g.pile.length,0);assert.equal(g.ashes.length,4);
 assert.equal(g.turn,1);E.invariant(g);
});

test('complete four-of-a-kind from hand can SLAM out of turn without matching pile top',()=>{
 const g=opened(2,307),four=Array.from({length:4},()=>extract(g,c=>c.kind==='number'&&c.rank===8));
 const previous=g.people[1].hand.splice(0);
 g.stock.push(...previous);g.people[1].hand.push(...four);
 g.pile.push(extract(g,c=>c.kind==='number'&&c.rank===2));
 g.slamOpen=false;g.turn=0;
 const option=E.slamOptions(g,1)[0];assert.ok(option);assert.equal(option.ids.length,4);
 const event=E.move(g,1,option);
 assert.equal(event.reason,'slam');assert.equal(event.burned,true);
 assert.equal(g.pile.length,0);assert.equal(g.ashes.length,5);
 assert.equal(g.turn,1);E.invariant(g);
});
test('SLAM cannot use blind cards; action breaks the numeric streak',()=>{
 const g=opened(),four=Array.from({length:4},()=>extract(g,c=>c.rank===2));
 g.pile.push(...four.slice(0,2));
 g.people[1].down.push(...four.slice(2));g.slamOpen=true;
 g.ashes.push(...g.stock.splice(0),...g.people[1].hand.splice(0),...g.people[1].up.splice(0));
 assert.equal(E.stage(g,1),'down');assert.equal(E.slamOptions(g,1).length,0);
 const ghost=extract(g,c=>c.action==='ghost');g.pile.push(ghost);
 assert.equal(E.topRun(g).count,0);E.invariant(g);
});
test('illegal blind flip joins the pile and is picked up to the hand',()=>{
 const g=opened();g.ashes.push(...g.stock.splice(0),...g.people[0].hand.splice(0),...g.people[0].up.splice(0));
 const card=g.people[0].down[0],replacement=extract(g,c=>c.kind==='number'&&c.rank===1);
 g.ashes.push(card);g.people[0].down[0]=replacement;
 g.pile.push(g.ashes.pop());g.limit={type:'min',value:10};
 assert.equal(E.stage(g,0),'down');
 const ev=E.move(g,0,{type:'play',source:'down',ids:[replacement.id]});
 assert.equal(ev.type,'blind-fail');assert.equal(g.people[0].hand.length,2);
 assert.equal(g.pile.length,0);E.invariant(g);
});
test('numeric groups cannot mix ranks, take forbidden when legal',()=>{
 const g=opened(),p=g.people[0];assert.throws(()=>E.move(g,0,{type:'take'}));
 const ids=p.hand.filter(c=>c.kind==='number').slice(0,2).map(c=>c.id);
 if(ids.length===2&&p.hand.find(c=>c.id===ids[0]).rank!==p.hand.find(c=>c.id===ids[1]).rank)
  assert.throws(()=>E.move(g,0,{type:'play',source:'hand',ids}));
 E.invariant(g);
});

test('all ten numbered ranks are ordinary including 10 and not unlimited escape cards',()=>{
 const a=E.deck();assert.equal(a.filter(c=>c.kind==='number').length,40);
 assert.deepEqual(E.ACTIONS,{reset:2,ghost:2,under:2,skip:2,burn:2,dump:2});
 const g=opened(),ten=inject(g,0,'hand',c=>c.kind==='number'&&c.rank===10);
 g.limit={type:'min',value:9};
 const before=g.ashes.length;
 const event=E.move(g,0,{type:'play',source:'hand',ids:[ten.id]});
 assert.equal(event.burned,false);assert.equal(event.reason,'number');
 assert.equal(g.ashes.length,before);assert.equal(g.turn,1);
 assert.equal(g.limit.value,10);assert.equal(E.topRun(g).rank,10);
 g.limit={type:'under'};
 assert.equal(E.isLegal(g,{kind:'number',rank:10}),false);
 assert.equal(E.isLegal(g,{kind:'number',rank:4}),true);
 E.invariant(g);
});
test('BURN is an independent special, removes the entire pile and immediately replays',()=>{
 for(const players of [2,3,5]){
  const g=opened(players,71),burn=inject(g,0,'hand',c=>c.action==='burn');
  const cards=[extract(g,c=>c.rank===7),extract(g,c=>c.rank===8)];
  g.pile.push(...cards);g.limit={type:'min',value:8};
  const prevAsh=g.ashes.length;
  const ev=E.move(g,0,{type:'play',source:'hand',ids:[burn.id]});
  assert.equal(ev.burned,true);assert.equal(ev.reason,'burn');
  assert.equal(g.pile.length,0);assert.equal(g.ashes.length,prevAsh+3);
  assert.equal(g.limit,null);assert.equal(g.turn,0);E.invariant(g);
 }
});
test('DUMP makes the next active player take all cards, then grants the actor another turn',()=>{
 for(const players of [2,3,5]){
  const g=opened(players,93),dump=inject(g,0,'hand',c=>c.action==='dump');
  g.pile.push(extract(g,c=>c.kind==='number'&&c.rank===8),extract(g,c=>c.kind==='number'&&c.rank===9));
  g.limit={type:'min',value:9};g.slamOpen=true;
  const before=g.people[1].hand.length,ashes=g.ashes.length;
  const ev=E.move(g,0,{type:'play',source:'hand',ids:[dump.id]});
  assert.equal(ev.action,'dump');assert.equal(ev.target,1);assert.equal(ev.takenCount,2);
  assert.equal(ev.burned,false);assert.equal(g.people[1].hand.length,before+2);
  assert.ok(!g.people[1].hand.some(c=>c.id===dump.id),'DUMP must burn, never enter the rival hand');
  assert.ok(g.ashes.some(c=>c.id===dump.id),'DUMP is permanently removed');
  assert.equal(g.ashes.length,ashes+1);assert.equal(g.pile.length,0);
  assert.equal(g.limit,null);assert.equal(g.slamOpen,false);
  assert.equal(g.turn,0);E.invariant(g);
 }
});
test('SLAM on a run of tens still burns and grants the interrupter the next turn',()=>{
 const g=opened(3,89),four=Array.from({length:4},()=>extract(g,c=>c.kind==='number'&&c.rank===10));
 g.pile.push(...four.slice(0,3));
 const prior=g.people[2].hand.pop();if(prior)g.stock.push(prior);g.people[2].hand.push(four[3]);
 g.limit={type:'min',value:10};g.slamOpen=true;g.turn=0;
 const slam=E.slamOptions(g,2)[0];assert.ok(slam);
 const ev=E.move(g,2,slam);
 assert.equal(ev.burned,true);assert.equal(ev.reason,'slam');
 assert.equal(g.ashes.length,4);assert.equal(g.pile.length,0);assert.equal(g.turn,2);
 E.invariant(g);
});

test('matching number freshly drawn can SNAP immediately, even when another player is next',()=>{
 const g=opened(2,911);
 const played=inject(g,0,'hand',c=>c.kind==='number'&&c.rank===6);
 const drawn=extract(g,c=>c.kind==='number'&&c.rank===6&&c.id!==played.id);
 g.stock.push(drawn); // force a matching top-deck draw without changing total card count
 const ev=E.move(g,0,{type:'play',source:'hand',ids:[played.id]});
 assert.equal(ev.drawnCount,1);
 assert.equal(g.turn,1);
 const snap=E.followUpOptions(g,0)[0];assert.ok(snap);
 assert.deepEqual(snap.ids,[drawn.id]);
 const follow=E.move(g,0,snap);assert.equal(follow.type,'followup');
 assert.equal(follow.reason,'snap');
 assert.equal(g.turn,1,'next player stays the same after non-burning SNAP');
 assert.equal(g.pile.length,2);
 E.invariant(g);
});
test('matching drawn SNAP is lost when the next player completes a move',()=>{
 const g=opened(2,913);
 const played=inject(g,0,'hand',c=>c.kind==='number'&&c.rank===4);
 g.stock.push(extract(g,c=>c.kind==='number'&&c.rank===4&&c.id!==played.id));
 E.move(g,0,{type:'play',source:'hand',ids:[played.id]});
 const snap=E.followUpOptions(g,0)[0];assert.ok(snap);
 const other=E.options(g,1)[0];assert.ok(other);
 E.move(g,1,other);
 assert.equal(E.followUpOptions(g,0).length,0);
 assert.throws(()=>E.move(g,0,snap),/Illegal follow-up/);
 E.invariant(g);
});
test('last hand number joins matching face-up card after stock empties',()=>{
 const g=opened(2,915);
 g.ashes.push(...g.people[0].hand.splice(0));
 const hand=extract(g,c=>c.kind==='number'&&c.rank===7),up=extract(g,c=>c.kind==='number'&&c.rank===7&&c.id!==hand.id);
 g.people[0].hand.push(hand);g.people[0].up.push(up);g.ashes.push(...g.stock.splice(0));
 const combo=E.options(g,0).find(x=>x.source==='hand'&&x.ids.length===2&&x.ids.includes(hand.id)&&x.ids.includes(up.id));
 assert.ok(combo,'bridge move appears in legal options');
 E.move(g,0,combo);
 assert.ok(!g.people[0].up.some(c=>c.id===up.id),'matched exposed card was played');
 assert.ok(!g.people[0].hand.some(c=>c.id===hand.id));
 E.invariant(g);
});
test('face-up bridge is illegal until stock is completely gone',()=>{
 const g=opened(2,917);
 g.ashes.push(...g.people[0].hand.splice(0));
 const hand=extract(g,c=>c.kind==='number'&&c.rank===7),up=extract(g,c=>c.kind==='number'&&c.rank===7&&c.id!==hand.id);
 g.people[0].hand.push(hand);g.people[0].up.push(up);
 const forbidden={type:'play',source:'hand',ids:[hand.id,up.id]};
 assert.ok(!E.options(g,0).some(x=>x.ids?.includes(up.id)));
 assert.throws(()=>E.move(g,0,forbidden));
 E.invariant(g);
});

test('a freshly drawn matching rank can be SNAPped before the next turn',()=>{
 const g=opened(2,230),rank=6,z=[g.stock,g.pile,g.ashes,...g.people.flatMap(p=>[p.hand,p.up,p.down])];
 const ids=E.deck().filter(c=>c.rank===rank).slice(0,2).map(c=>c.id);
 const put=(a,i,id)=>{const b=z.find(v=>v.some(c=>c.id===id)),j=b.findIndex(c=>c.id===id),old=a[i];a[i]=b[j];b[j]=old};
 put(g.people[0].hand,0,ids[0]);put(g.stock,g.stock.length-1,ids[1]);
 E.move(g,0,{type:'play',source:'hand',ids:[ids[0]]});assert.equal(g.turn,1);
 const snap=E.followUpOptions(g,0)[0];assert.ok(snap);assert.deepEqual(snap.ids,[ids[1]]);
 E.move(g,0,snap);assert.equal(E.topRun(g).count,2);E.invariant(g);
 g.followUp={seat:0,rank,ids:[ids[1]],expiresAt:Date.now()-1};
 assert.equal(E.followUpOptions(g,0).length,0);
});
test('last hand and matching face-up cards can be played together',()=>{
 const g=opened(2,49),p=g.people[0],z=[g.stock,g.pile,g.ashes,...g.people.flatMap(x=>[x.hand,x.up,x.down])];
 const ids=E.deck().filter(c=>c.rank===7).slice(0,2).map(c=>c.id);
 const put=(a,i,id)=>{const b=z.find(v=>v.some(c=>c.id===id)),j=b.findIndex(c=>c.id===id),old=a[i];a[i]=b[j];b[j]=old};
 put(p.hand,0,ids[0]);put(p.up,0,ids[1]);g.ashes.push(...g.stock.splice(0),...p.hand.splice(1));
 E.invariant(g);const combo=E.options(g,0).find(o=>o.ids?.length===2&&ids.every(id=>o.ids.includes(id)));assert.ok(combo);
 const event=E.move(g,0,combo);assert.equal(event.bridgeCount,1);
 assert.equal(p.hand.length,0);assert.ok(!p.up.some(c=>c.id===ids[1]));E.invariant(g);
});
test('seeded bots conserve every card across whole games for 2–5 players',()=>{
 for(let players=2;players<=5;players++)for(let seed=1;seed<=16;seed++){
  const g=E.create({players,seed});g.people.forEach(p=>E.autoSetup(g,p.seat));E.start(g);
  while(g.phase==='play'&&g.moves<1100){if(!E.autoSlam(g))E.move(g,g.turn,E.choose(g,g.turn,['greedy','saver','random'][g.turn%3]));}
  E.invariant(g);
  if(g.phase==='over'){assert.equal(g.people.filter(p=>!p.out).length,1);assert.ok(g.loser!==null)}
 }
});
console.log('PILEHEAD engine: '+checks+' test groups passed');
