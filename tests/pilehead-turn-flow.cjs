'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const E=require('../dist/pilehead/engine.js');
let passed=0;
function test(name,fn){fn();passed++;console.log('PASS '+name)}
function fixture(){
 const g=E.create({seed:1001,players:3});E.start(g);g.turn=0;
 const p=g.people[0];
 g.ashes.push(...p.hand.splice(0),...p.up.splice(0),...p.down.splice(0),...g.stock.splice(0));
 const i=g.ashes.findIndex(c=>c.rank===2);p.down.push(g.ashes.splice(i,1)[0]);
 return g;
}
function place(g,target,filter){
 const reserved=[g.people[0].hand,g.people[0].up,g.people[0].down];
 for(const area of [g.ashes,...g.people.flatMap(p=>[p.hand,p.up,p.down])]){
  if(area===target||reserved.includes(area))continue;
  const i=area.findIndex(filter);
  if(i>=0){const card=area.splice(i,1)[0];target.push(card);return card}
 }
 throw Error('Fixture card unavailable');
}
test('last two matching hand cards can combine with face-up',()=>{
 const g=fixture(),p=g.people[0];
 place(g,p.hand,c=>c.rank===7);place(g,p.hand,c=>c.rank===7);
 place(g,p.up,c=>c.rank===7);
 const combo=E.options(g,0).find(o=>o.ids.length===3&&o.ids.includes(p.up[0].id));
 assert.ok(combo);const ev=E.move(g,0,combo);
 assert.equal(ev.bridgeCount,1);assert.equal(ev.count,3);E.invariant(g);
});
test('mixed four of a kind SLAM interrupts and burns',()=>{
 const g=fixture(),p=g.people[0];
 for(let i=0;i<2;i++)place(g,p.hand,c=>c.rank===7);
 for(let i=0;i<2;i++)place(g,p.up,c=>c.rank===7);
 place(g,g.pile,c=>c.rank===3);g.turn=1;
 const slam=E.slamOptions(g,0)[0];
 assert.equal(slam?.ids.length,4);
 const ev=E.move(g,0,slam);
 assert.equal(ev.bridgeCount,2);assert.equal(ev.reason,'slam');
 assert.equal(ev.burned,true);assert.equal(g.turn,0);E.invariant(g);
});
test('one hand plus one up card can finish an exposed pair for SLAM',()=>{
 const g=fixture(),p=g.people[0];
 place(g,p.hand,c=>c.rank===5);place(g,p.up,c=>c.rank===5);
 place(g,g.pile,c=>c.rank===5);place(g,g.pile,c=>c.rank===5);
 g.slamOpen=true;g.turn=1;
 const slam=E.slamOptions(g,0)[0];
 assert.equal(slam?.ids.length,2);
 const ev=E.move(g,0,slam);
 assert.equal(ev.burned,true);assert.equal(ev.bridgeCount,1);
 assert.equal(ev.burnedCount,4);E.invariant(g);
});
test('identical action cards bridge, but take effect once',()=>{
 const g=fixture(),p=g.people[0];
 place(g,p.hand,c=>c.action==='ghost');place(g,p.up,c=>c.action==='ghost');
 const combo=E.options(g,0).find(o=>o.ids.length===2&&o.ids.includes(p.up[0].id));
 assert.ok(combo);const ev=E.move(g,0,combo);
 assert.equal(ev.bridgeCount,1);assert.equal(ev.action,'ghost');E.invariant(g);
});
test('stock and mixed hands prevent premature bridge',()=>{
 const g=fixture(),p=g.people[0];
 place(g,p.hand,c=>c.rank===7);place(g,p.hand,c=>c.rank===6);
 place(g,p.up,c=>c.rank===7);
 assert.equal(E.finalHandBridge(g,0),null);
 assert.ok(!E.options(g,0).some(o=>o.ids.includes(p.up[0].id)));
 E.invariant(g);
});
test('selected starter wins the first-turn lottery',()=>{
 const g=E.create({players:3,seed:33});
 g.starterSeat=2;g.starterReason='winner';E.start(g);
 assert.equal(g.turn,2);assert.equal(g.starterReason,'winner');assert.ok(g.startedAt);
});
test('SNAP opportunity is not time limited, and ends on the next action',()=>{
 const g=fixture(),p=g.people[0];
 place(g,p.hand,c=>c.rank===5);place(g,g.pile,c=>c.rank===5);
 g.followUp={seat:0,rank:5,ids:[p.hand[0].id],expiresAt:Date.now()-10};
 assert.equal(E.followUpOptions(g,0).length,1,'SNAP remains available without a deadline');
 const normal=E.options(g,0)[0];
 assert.ok(normal,'next player remains free to act');
 E.move(g,0,normal);
 assert.equal(E.followUpOptions(g,0).length,0,'normal move ends the earlier opportunity');
 E.invariant(g);
});
test('UI has a time-gate repaint and a shared visible lottery',()=>{
 const read=s=>fs.readFileSync(path.resolve(__dirname,'..',s),'utf8');
 const online=read('dist/pilehead/online.js'),api=read('api/pilehead.js');
 assert.match(online,/timeGateChanged/);assert.match(online,/transitionTimer=setTimeout/);
 assert.doesNotMatch(api,/snapUntil:g\.followUp/);
 assert.match(api,/blindReveal:g\.blindReveal\?\.expiresAt>Date\.now\(\)/);
 for(const file of ['dist/pilehead/app.js','dist/pilehead/online.js','dist/pilehead/immersive.js'])
  assert.match(read(file),/starterHTML/);
 assert.match(read('dist/pilehead/stack-brand.css'),/stack-starter-roll/);
});
console.log('STACK turn flow: '+passed+' cases passed');
