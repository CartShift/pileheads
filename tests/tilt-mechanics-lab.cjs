'use strict';
/* Run locally: node tests/tilt-mechanics-lab.cjs
   No CI is added: this is a private, experimentally evolving playtest. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const E=require('../dist/tilt-lab/engine.js');
let checks=0;function test(name,fn){fn();checks++;console.log('PASS',name)}
test('48 physical cards, six copies of each rank, unique IDs and deterministic seeds',()=>{
 const d=E.deck();assert.equal(d.length,48);assert.equal(new Set(d.map(c=>c.id)).size,48);
 for(let n=1;n<=8;n++)assert.equal(d.filter(c=>c.n===n).length,6);
 const a=E.start({mode:'chain',seed:45}),b=E.start({mode:'chain',seed:45});
 assert.deepEqual(a,b);assert.equal(a.piles.length,1);assert.equal(a.people[0].hand.length,4);E.check(a);
});
test('two independent physical experiments, 2-4 seats, and invalid variants rejected',()=>{
 for(let players=2;players<=4;players++)for(const mode of E.MODES){
  const g=E.start({mode,players,seed:players});assert.equal(g.people.length,players);
  assert.equal(g.piles.length,mode==='chain'?1:2);E.check(g);
 }
 assert.throws(()=>E.start({mode:'unknown'}));
});
test('chain first play is staged, stopping grants directional control, and each action conserves cards',()=>{
 let found=false;
 for(let seed=1;seed<250;seed++){
  const g=E.start({mode:'chain',seed}),m=E.legal(g).find(x=>x.type==='play'&&g.people[0].hand[x.index].n!==E.top(g).n);
  if(!m)continue;E.play(g,m);
  assert.equal(g.phase,'extend');assert.equal(g.current,0);E.check(g);
  const choices=E.legal(g).filter(x=>x.type==='stop');assert.equal(choices.length,2);
  E.play(g,{type:'stop',arrow:'up'});assert.equal(g.current,1);assert.equal(E.face(E.top(g)),'up');E.check(g);found=true;break;
 }
 assert.equal(found,true);
});
test('a physical chain creates a counter window, and the next player can either accept or counter',()=>{
 let found=false,foundCounter=false;
 for(let seed=1;seed<1800;seed++){
  const g=E.start({mode:'chain',seed}),hand=g.people[0].hand,t=E.top(g);
  const first=E.legal(g).filter(x=>x.type==='play'&&hand[x.index].n!==t.n);
  for(const move of first){
   const copy=JSON.parse(JSON.stringify(g));E.play(copy,move);
   const ext=E.legal(copy).find(x=>x.type==='extend');if(!ext)continue;
   E.play(copy,ext);E.play(copy,{type:'stop'});
   assert.equal(copy.phase,'counter');assert.equal(copy.current,1);assert.equal(copy.pending.count,2);E.check(copy);
   const counter=E.legal(copy).find(x=>x.type==='counter');
   if(counter){const before=copy.stats.counter;E.play(copy,counter);assert.equal(copy.pending,null);assert.equal(copy.stats.counter,before+1);assert.equal(copy.current,0);E.check(copy);foundCounter=true}
   else{E.play(copy,{type:'accept'});assert.equal(copy.phase,'play');assert.equal(copy.current,1);E.check(copy)}
   found=true;break;
  }
  if(foundCounter)break;
 }
 assert.ok(found,'No press scenario found');assert.ok(foundCounter,'No matching counter scenario found');
});
test('twin pile collision clears both piles and discards a bonus card',()=>{
 let found=false;
 for(let seed=1;seed<1000;seed++){
  const g=E.start({mode:'twin',seed});
  const hit=E.legal(g).find(m=>m.type==='play'&&E.top(g,1-m.lane).n===g.people[0].hand[m.index].n);
  if(!hit)continue;E.play(g,hit);
  assert.equal(g.stats.collision,1);assert.equal(g.piles[0].length,0);assert.equal(g.piles[1].length,0);
  assert.equal(g.phase,'bonus');const option=E.legal(g).find(x=>x.type==='burnBonus');
  assert.ok(option);E.play(g,option);assert.equal(g.phase,'play');E.check(g);found=true;break;
 }
 assert.ok(found,'No first-turn collision found');
});
test('all production TILT paths stay isolated from this experimental engine',()=>{
 const engine=fs.readFileSync(path.join(__dirname,'../dist/tilt-lab/engine.js'),'utf8');
 assert.doesNotMatch(engine,/localStorage|spark-simple-v04|tilt-joker-lab/);
 const html=fs.readFileSync(path.join(__dirname,'../dist/tilt-lab/index.html'),'utf8');
 const app=fs.readFileSync(path.join(__dirname,'../dist/tilt-lab/app.js'),'utf8');
 for(const match of app.matchAll(/\$\('([A-Za-z0-9_-]+)'\)/g))
  assert.ok(html.includes('id="'+match[1]+'"'),'Missing DOM id '+match[1]);
 const print=fs.readFileSync(path.join(__dirname,'../dist/tilt-lab/print.html'),'utf8');
 assert.match(print,/page<6/);assert.match(print,/n<=8/);assert.match(print,/copy<3/);
});
test('multi-seat AI games terminate with card conservation and no illegal moves',()=>{
 let total=0,draws=0,max=0,press=0,collision=0;
 for(const mode of E.MODES)for(let players=2;players<=4;players++){
  for(let seed=1;seed<=600;seed++){
   const g=E.simulate({mode,players,seed});E.check(g);
   assert.ok(g.winner!==null||g.draw);
   assert.ok(g.turn<=241,'Game went too long');
   total++;if(g.draw)draws++;max=Math.max(max,g.turn);
   press+=g.stats.press;collision+=g.stats.collision;
  }
 }
 console.log(JSON.stringify({total,draws,max,press,collision}));
 assert.ok(draws<total*.05,'Too many stalled games');
 assert.ok(press>0&&collision>0);
});
test('record choice opportunities at decision time, not every render',()=>{
 let chainDecline=false,chainPress=false,declinedCollision=false;
 for(let seed=1;seed<1500;seed++){
  const g=E.start({mode:'chain',seed});
  const first=E.legal(g).filter(m=>m.type==='play'&&g.people[0].hand[m.index].n!==E.top(g).n);
  for(const move of first){
   const clone=JSON.parse(JSON.stringify(g));E.play(clone,move);
   const press=E.legal(clone).find(x=>x.type==='extend');
   if(!press)continue;
   const before=clone.stats.pressOffers;
   E.legal(clone);E.legal(clone);
   assert.equal(clone.stats.pressOffers,before,'Queries must never increment observations');
   const stopped=JSON.parse(JSON.stringify(clone));
   E.play(stopped,{type:'stop',arrow:'up'});
   assert.equal(stopped.stats.pressOffers,1);assert.equal(stopped.stats.pressDeclined,1);
   assert.equal(stopped.stats.pressChosen,0);chainDecline=true;
   E.play(clone,press);
   assert.equal(clone.stats.pressOffers,1);assert.equal(clone.stats.pressChosen,1);
   assert.equal(clone.stats.pressDeclined,0);chainPress=true;break;
  }
  if(chainDecline&&chainPress)break;
 }
 assert.ok(chainDecline&&chainPress);
 for(let seed=1;seed<3000;seed++){
  const g=E.start({mode:'twin',seed});
  const moves=E.legal(g).filter(m=>m.type==='play');
  const collision=moves.filter(m=>E.top(g,1-m.lane).n===g.people[0].hand[m.index].n);
  const other=moves.find(m=>E.top(g,1-m.lane).n!==g.people[0].hand[m.index].n);
  if(!collision.length||!other)continue;
  E.play(g,other);assert.equal(g.stats.collisionOffers,1);
  assert.equal(g.stats.collisionDeclined,1);assert.equal(g.stats.collision,0);
  E.check(g);declinedCollision=true;break;
 }
 assert.ok(declinedCollision);
});
test('physical print layout keeps ranks readable on 180 degree rotation and press cards upright',()=>{
 const print=fs.readFileSync(path.join(__dirname,'../dist/tilt-lab/print.html'),'utf8');
 assert.match(print,/class=\\"rank lower\\"/);
 assert.match(print,/rotate\(180deg\)/);
 assert.match(print,/kept UPRIGHT/);
 const html=fs.readFileSync(path.join(__dirname,'../dist/tilt-lab/index.html'),'utf8');
 const app=fs.readFileSync(path.join(__dirname,'../dist/tilt-lab/app.js'),'utf8');
 assert.match(html,/card\.pressed/);assert.doesNotMatch(html,/card\.sideways/);
 assert.match(app,/card\(c,pressed\?'pressed'/);
 assert.match(html,/id="shuffleSeed"/);
});
console.log(JSON.stringify({pass:true,checks}));
