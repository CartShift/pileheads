'use strict';
// Explicit migration check, not every CI run: requires the baseline Git object.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'..');
const baseline=process.argv[2]||'ea5d940148d7d8b7f3fec71b4372c0c57e043dd7';
const previous=execFileSync('git',['show',baseline+':dist/pilehead/engine.js'],{cwd:root,encoding:'utf8'});
const fixedDate={now:()=>1000};
const scope=vm.createContext({Date:fixedDate});
vm.runInContext(previous,scope);
const A=scope.PileheadEngine;
const B=require('../packages/game-engine').createEngine({now:()=>1000});
const browser=vm.createContext({});
vm.runInContext(fs.readFileSync(path.join(root,'dist/pilehead/engine.js'),'utf8'),browser);
const C=browser.PileheadEngine.createEngine({now:()=>1000});
const eq=(a,b,msg)=>assert.equal(JSON.stringify(a),JSON.stringify(b),msg);
let games=0,finished=0,actions=0,saves=0,interruptions=0,dumps=0,blind=0;
for(const players of [2,3,4,5])for(const seed of [0,1,42,123,20261113,987654])for(const endgameRule of ['classic','final-duel']){
 let a=A.create({players,seed,endgameRule}),b=B.create({players,seed,endgameRule}),c=C.create({players,seed,endgameRule});
 for(let i=0;i<players;i++){A.autoSetup(a,i);B.autoSetup(b,i);C.autoSetup(c,i);}
 A.start(a);B.start(b);C.start(c);eq(a,b,'start package');eq(b,c,'start browser');
 for(let i=0;i<700&&a.phase==='play';i++){
  let ea,eb,ec;
  if(a.pendingDump){const s=a.pendingDump.seat,t=A.botDumpTarget(a,s);ea=A.resolveDump(a,s,t);eb=B.resolveDump(b,s,t);ec=C.resolveDump(c,s,t);dumps++;}
  else{
   const s=a.turn,style=['greedy','saver','random'][s%3];
   const snap=a.people.map(p=>[p.seat,A.followUpOptions(a,p.seat)[0]]).find(x=>x[1]);
   const slam=a.people.map(p=>[p.seat,A.slamOptions(a,p.seat)[0]]).find(x=>x[1]);
   if(snap&&i%3===0){ea=A.move(a,snap[0],snap[1]);eb=B.move(b,snap[0],snap[1]);ec=C.move(c,snap[0],snap[1]);interruptions++;}
   else if(slam&&i%5===0){ea=A.move(a,slam[0],slam[1]);eb=B.move(b,slam[0],slam[1]);ec=C.move(c,slam[0],slam[1]);interruptions++;}
   else{const ma=A.choose(a,s,style),mb=B.choose(b,s,style),mc=C.choose(c,s,style);eq(ma,mb,'bot package');eq(mb,mc,'bot browser');ea=A.move(a,s,ma);eb=B.move(b,s,mb);ec=C.move(c,s,mc);}
  }
  eq(ea,eb,'event package');eq(eb,ec,'event browser');eq(a,b,'state package');eq(b,c,'state browser');actions++;
  if(ea.reason==='dump')dumps++;if(ea.source==='down')blind++;
  if(i%17===0){b=B.restore(B.serialize(b));c=C.restore(C.serialize(c));eq(a,b,'snapshot package');eq(b,c,'snapshot browser');saves++;}
 }
 A.invariant(a);B.invariant(b);C.invariant(c);games++;if(a.phase==='over')finished++;
}
assert.equal(games,48);assert.equal(finished,games);
require('./sync-game-engine.cjs').sync({check:true});
console.log(JSON.stringify({baseline,games,finished,actions,saves,interruptions,dumps,blind}));
