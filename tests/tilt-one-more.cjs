'use strict';
/* Offline isolated ONE MORE rules, no CI setup required. */
const A=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const E=require('../dist/tilt-lab/one-more-engine.js');
let checks=0;function check(name,fn){fn();checks++;console.log('PASS '+name)}
check('48 unique cards, correct rank/arrow distribution and empty physical opening',()=>{
 const d=E.deck();A.equal(d.length,48);A.equal(new Set(d.map(x=>x.id)).size,48);
 for(let n=1;n<=8;n)for(const arrow of ['up','down'])A.equal(d.filter(c=>c.n===n&&c.arrow===arrow).length,3);
 for(let n=2;n<=4;n++){
  const g=E.start({players:n,seed:7});E.check(g);
  A.equal(g.pile.length,0);A.equal(g.stock.length,48-n*4);A.equal(E.legal(g).filter(x=>x.type==='play').length,4);
 }
});
check('the arrow on the PREVIOUS card, not your hand card, sets legal numbers',()=>{
 A.equal(E.valid({n:5,arrow:'up'},{n:4,arrow:'up'}),false);
 A.equal(E.valid({n:5,arrow:'up'},{n:5,arrow:'down'}),true);
 A.equal(E.valid({n:5,arrow:'down'},{n:6,arrow:'down'}),false);
 A.equal(E.valid({n:5,arrow:'down'},{n:3,arrow:'up'}),true);
});
check('matching clears pile; no bonus offered after a clear',()=>{
 let found=false;
 for(let seed=1;seed<5000&&!found;seed++){
  const g=E.start({seed});E.play(g,{type:'play',index:0}); // free opening, may or may not leave a choice
  if(g.phase==='choice')E.play(g,{type:'stop'});
  const current=g.current,last=E.top(g);if(!last)continue;
  const possible=E.legal(g).find(m=>m.type==='play'&&g.people[current].hand[m.index].n===last.n);
  if(!possible)continue;E.play(g,possible);A.equal(g.pile.length,0);A.equal(g.stats.clears,1);A.equal(g.phase,'play');E.check(g);found=true;
 }
 A.ok(found);
});
check('ONE MORE is exactly one extra legal different-rank card; safe stop is distinct',()=>{
 let found=false;
 for(let seed=1;seed<600&&!found;seed++){
  const g=E.start({seed}),h=g.people[0].hand;
  for(let first=0;first<h.length&&!found;first++){
   const f=JSON.parse(JSON.stringify(g));E.play(f,{type:'play',index:first});
   if(f.phase!=='choice')continue;
   const extra=E.legal(f).find(m=>m.type==='extra');if(!extra)continue;
   const before=JSON.stringify(f.stats);E.legal(f);A.equal(JSON.stringify(f.stats),before);
   const safe=JSON.parse(JSON.stringify(f));E.play(safe,{type:'stop'});A.equal(safe.stats.stops,1);A.equal(safe.current,1);
   E.play(f,extra);A.equal(f.pending.rank,E.top(f).n);A.equal(f.current,1);
   A.equal(f.stats.extra,1);A.equal(E.legal(f).some(m=>m.type==='extra'),false);E.check(f);found=true;
  }
 }
 A.ok(found);
});
check('a same-number response bounces the entire pile, ignoring arrow',()=>{
 let found=false;
 for(let seed=1;seed<10000&&!found;seed++){
  const g=E.start({seed});for(const first of E.legal(g).filter(x=>x.type==='play')){
   const c=JSON.parse(JSON.stringify(g));E.play(c,first);
   for(const extra of E.legal(c).filter(x=>x.type==='extra')){
    const copy=JSON.parse(JSON.stringify(c));E.play(copy,extra);
    const bounce=E.legal(copy).find(x=>x.type==='bounce');if(!bounce)continue;
    const length=copy.pile.length,attacker=copy.people[0].hand.length;
    E.play(copy,bounce);A.equal(copy.people[0].hand.length,attacker+length);
    A.equal(copy.pile.length,0);A.equal(copy.pending,null);A.equal(copy.stats.bounces,1);E.check(copy);found=true;break;
   }if(found)break;
  }
 }
 A.ok(found);
});
check('the responder can decline a bounce simply by playing a different card',()=>{
 let found=false;
 for(let seed=1;seed<3000&&!found;seed++){
  const g=E.start({seed});for(const first of E.legal(g).filter(x=>x.type==='play')){
   const c=JSON.parse(JSON.stringify(g));E.play(c,first);
   for(const extra of E.legal(c).filter(x=>x.type==='extra')){
    const x=JSON.parse(JSON.stringify(c));E.play(x,extra);
    const reply=E.legal(x).find(m=>m.type==='play');if(!reply)continue;
    E.play(x,reply);A.equal(x.pending,null);A.equal(x.stats.accepted,1);E.check(x);found=true;break;
   }if(found)break;
  }
 }
 A.ok(found);
});
check('the standalone prototype never modifies the original TILT engine or legacy save',()=>{
 const src=fs.readFileSync(path.join(__dirname,'../dist/tilt-lab/one-more-engine.js'),'utf8');
 A.doesNotMatch(src,/localStorage|spark-simple-v04|joker-lab/);
 const html=fs.readFileSync(path.join(__dirname,'../dist/tilt-lab/index.html'),'utf8');
 const js=fs.readFileSync(path.join(__dirname,'../dist/tilt-lab/one-more-app.js'),'utf8');
 for(const m of js.matchAll(/\$\('([A-Za-z0-9_-]+)'\)/g))A.ok(html.includes('id="'+m[1]+'"'),'Missing '+m[1]);
 A.doesNotMatch(html,/TWIN PILES/);
 A.match(html,/one-more-engine\.js/);
 const print=fs.readFileSync(path.join(__dirname,'../dist/tilt-lab/one-more-print.html'),'utf8');
 A.match(print,/page<6/);A.match(print,/EMPTY center pile/);A.doesNotMatch(print,/TWIN PILES/);
});
check('2–4 player simulations finish without stalls and conserve exactly 48 cards',()=>{
 const summary={};
 for(let players=2;players<=4;players++){
  let turns=0,draws=0,offers=0,extra=0;
  for(let seed=1;seed<=800;seed++){
   const g=E.simulate({seed,players});E.check(g);
   A.ok(g.winner!==null||g.draw);A.ok(g.turn<=240);
   turns+=g.turn;draws+=Number(g.draw);offers+=g.stats.offers;extra+=g.stats.extra;
  }
  summary[players]={games:800,draws,averageTurns:+(turns/800).toFixed(1),extra,offers};
  A.equal(draws,0);
 }
 console.log(JSON.stringify(summary));
});
console.log(JSON.stringify({pass:true,checks}));
