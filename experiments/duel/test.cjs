'use strict';
const assert=require('node:assert/strict');
const E=require('./engine.js');
let checks=0,games=0,turns=0;
function verify(name,fn){fn();checks++;console.log('OK '+name)}
verify('Open Duel defaults to 2 players, 4 colors, 3 visible hand cards and 10 turns each',()=>{
 const g=E.create({seed:71});
 assert.equal(g.version,'duel-lab-0.1');
 assert.equal(g.information,'open');
 assert.equal(g.action,'exchange');
 assert.equal(g.row.length,9);
 assert.equal(g.palette.length,4);
 assert.equal(g.players.length,2);
 assert.equal(g.turnsPerPlayer,10);
 assert.ok(g.players.every(p=>p.hand.length===3));
 assert.equal(E.cardCount(g),144);
});
verify('An exchange changes the hand and may create multiwave captures',()=>{
 const g=E.create({seed:1,information:'open'});
 const opts=E.legal(g,0);
 assert.ok(opts.length>0);
 assert.ok(opts.every(o=>o.taken!==null&&o.color!==o.taken));
 const m=opts[0],beforeHand=g.players[0].hand.slice(),beforeCount=E.cardCount(g);
 const rec=E.play(g,0,m.move);
 assert.equal(g.turn,1);
 assert.equal(rec.exchanged,m.taken);
 assert.equal(g.players[0].hand[m.move.index],m.taken);
 assert.equal(g.players[0].hand.length,3);
 assert.equal(E.cardCount(g),beforeCount);
 assert.equal(g.players[0].score,g.players[0].captured.length);
 assert.notDeepEqual(g.players[0].hand,beforeHand);
});
verify('Hidden mode does not let bot inspect opponent hand',()=>{
 const g=E.create({seed:400,information:'hidden'});
 const a=JSON.parse(JSON.stringify(g));
 a.players[0].hand=['O','O','O'];
 a.players[0].captured=[];
 assert.deepEqual(E.choose(g,1,'counter'),E.choose(a,1,'counter'));
});
verify('Open mode counter strategy has access to public enemy cards only',()=>{
 let changed=0;
 for(let seed=1;seed<80;seed++){
  const g=E.create({seed,information:'open'});
  const duplicate=JSON.parse(JSON.stringify(g));
  duplicate.players[1].hand=['O','O','O'];
  const a=E.choose(g,0,'counter'),b=E.choose(duplicate,0,'counter');
  if(a.index!==b.index||a.pos!==b.pos)changed++;
 }
 assert.ok(changed>0,'An open-hand policy must respond to opponent colors');
});
verify('Out-of-turn and same-color moves remain illegal',()=>{
 const g=E.create({seed:7,information:'open'});
 assert.throws(()=>E.play(g,1,{index:0,pos:0}),/Not your turn/);
 assert.throws(()=>E.play(g,0,{index:99,pos:0}),/Illegal action/);
 const bad=g.row.findIndex(c=>c===g.players[0].hand[0]);
 assert.ok(bad>=0);
 assert.throws(()=>E.play(g,0,{index:0,pos:bad}),/Illegal action/);
});
verify('Both visibility modes preserve finite stock, score and turn invariants',()=>{
 for(const information of ['open','hidden'])for(let seed=1;seed<=60;seed++){
  const g=E.create({seed:seed*47+999,information});
  while(!g.blocked&&g.turn<20){
   const seat=g.turn%2,options=E.legal(g,seat);
   if(!options.length){g.blocked='no_moves';break}
   const move=E.choose(g,seat,information==='open'?'counter':'planner');
   E.play(g,seat,move);
   turns++;
   assert.equal(E.cardCount(g),144);
   assert.ok(g.players.every(p=>p.hand.length===3));
   assert.equal(g.players.reduce((n,p)=>n+p.score,0),g.players.reduce((n,p)=>n+p.captured.length,0));
   if(!g.blocked)assert.equal(g.row.length,9);
   assert.ok(g.turn<=20);
  }
  assert.equal(g.turn,20,'Ten-turn duel should terminate naturally');
  assert.equal(g.blocked,null);
  games++;
 }
});
verify('Seeded game simulation is deterministic',()=>{
 const config={seed:1987,information:'open',colorCount:4,rowSize:9,handSize:3,turnsPerPlayer:10};
 assert.deepEqual(E.run(config,['counter','greedy']),E.run(config,['counter','greedy']));
});
verify('Reject invalid information settings',()=>{
 assert.throws(()=>E.create({information:'peek'}),/Information mode/);
 assert.throws(()=>E.create({players:3}),/Duel supports/);
});
console.log(JSON.stringify({pass:true,checks,games,turns}));
