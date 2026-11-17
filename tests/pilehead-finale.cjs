'use strict';
/* Regression coverage for the shared end-of-game presentation.
   No browser or DOM implementation is needed for static safety contracts. */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const src=p=>fs.readFileSync(path.resolve(__dirname,'..',p),'utf8');
const css=src('dist/pilehead/immersive.css');
const online=src('dist/pilehead/online.js'),local=src('dist/pilehead/app.js');
const sandbox={
 window:{addEventListener(){}},
 document:{querySelector(){return null},addEventListener(){}},
 matchMedia:()=>({matches:false}),
 localStorage:{getItem:()=>null},
 console,setTimeout(){},clearTimeout(){}
};
new vm.Script(src('dist/pilehead/immersive.js'),{filename:'immersive.js'}).runInNewContext(sandbox);
const table=sandbox.window.PileheadTableFX;
assert.equal(typeof table.resultHTML,'function');
const args={
 players:['You','Friend'],finishedOrder:[1],loser:0,me:1,
 moves:92,ashes:17,key:'END:92',online:true
};
const winner=table.resultHTML(args),loser=table.resultHTML({...args,me:0});
const localGame=table.resultHTML({...args,online:false});
assert.match(winner,/CONGRATULATIONS!/);
assert.match(loser,/PILEHEAD!/);
assert.match(winner,/END OF ROUND/);
assert.match(winner,/<ol class="result-ranking">/);
assert.match(winner,/Friend/);
assert.match(winner,/92/);
assert.match(winner,/17/);
assert.match(winner,/data-do="dismiss-result"/);
assert.match(localGame,/data-do="rematch"/);
assert.match(winner,/Play again · same room/);
assert.match(winner,/data-do="rematch"/);
assert.match(winner,/Create a different table/);
assert.match(winner,/role="dialog"/);
assert.match(winner,/aria-modal="true"/);
assert.equal((winner.match(/<i style="--left/g)||[]).length,34);
const hostile=table.resultHTML({...args,players:['<img src=x onerror=alert(1)>','Friend']});
assert.doesNotMatch(hostile,/<img src=x onerror/);
assert.match(hostile,/&lt;img src=x onerror/);
assert.equal(table.resultHTML({...args,finishedOrder:[],loser:null}),'');
assert.match(css,/\.pilehead-result-backdrop/);
assert.match(css,/\.result-confetti/);
assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
assert.match(css,/\.pilehead-table-hud/);
assert.match(css,/\.pilehead-focus/);
for(const code of [online,local]){
 assert.match(code,/function tableHUD\(/);
 assert.match(code,/function endScreen\(/);
 assert.match(code,/PileheadTableFX\?\.resultHTML/);
 assert.match(code,/data-do="sort"/);
}
assert.match(src('dist/pilehead/immersive.js'),/pilehead-table-focus-v1/);
console.log('PASS PILEHEAD finale and focus mode: shared screens, XSS, accessibility and motion contracts');
