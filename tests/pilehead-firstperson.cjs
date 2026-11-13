'use strict';
/* Source-level contract tests for shared PILEHEAD first-person renderer.
 * Visual quality still requires actual browser and device review. */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.join(__dirname,'..');
const read=name=>fs.readFileSync(path.join(root,name),'utf8');
const html=read('dist/pilehead/index.html');
const css=read('dist/pilehead/immersive.css');
const fx=read('dist/pilehead/immersive.js');
const solo=read('dist/pilehead/app.js');
const online=read('dist/pilehead/online.js');
const sites=read('scripts/build.mjs');
const vercel=read('scripts/build-vercel.mjs');
let checks=0;
function check(name,fn){fn();checks++;console.log('PASS '+name)}
check('new style and FX scripts load before both renderers',()=>{
 assert.match(html,/href="immersive\.css"/);
 assert.match(html,/<script src="engine\.js"><\/script><script src="immersive\.js"><\/script><script src="app\.js"><\/script><script src="online\.js"><\/script>/);
});
check('first-person seat layout and physical rendering rules are present',()=>{
 assert.match(css,/body\.pilehead-playing \.table\s*\{[^}]*display:grid/s);
 assert.match(css,/body\.pilehead-playing \.table \.opponents/);
 assert.match(css,/body\.pilehead-playing \.table \.hand-area/);
 assert.match(css,/body\.pilehead-playing \.table \.card-row\.hand/);
 assert.match(css,/body\.pilehead-playing \.table \.stack\[data-play-target\]/);
 assert.match(css,/\.pilehead-physical-fx/);
 assert.match(css,/\.pilehead-cue/);
});
check('responsive touch, compact landscape and reduced-motion layout',()=>{
 assert.match(css,/@media \(max-width:700px\)/);
 assert.match(css,/@media \(max-width:380px\)/);
 assert.match(css,/@media \(max-height:560px\) and \(orientation:landscape\)/);
 assert.match(css,/@media \(prefers-reduced-motion:reduce\)/);
 assert.match(css,/overflow-x:auto/);
});
check('first-person presentation is independent of game engine and optional audio',()=>{
 for(const [name,src] of [['fx',fx],['solo',solo],['online',online]]){
  assert.doesNotThrow(()=>new vm.Script(src,{filename:name+'.js'}));
 }
 assert.doesNotMatch(fx,/\bPileheadEngine\.move\b/);
 assert.match(fx,/localStorage\.getItem\(STORE\)==='on'/);
 assert.match(fx,/prefers-reduced-motion/);
 assert.match(fx,/aria-pressed/);
 assert.match(fx,/fullscreenElement/);
});
check('both game modes reuse same scene and preserve existing game logic',()=>{
 assert.match(solo,/PileheadTableFX\?\.sync/);
 assert.match(online,/PileheadTableFX\?\.sync/);
 assert.match(solo,/data-seat/);
 assert.match(online,/data-seat/);
 assert.match(solo,/E\.move/);
 assert.match(online,/api\/pilehead/);
});
check('production and Sites builds contain both scene assets',()=>{
 for(const src of [vercel,sites]){
  assert.match(src,/immersive\.css/);
  assert.match(src,/immersive\.js/);
 }
});
check('CSS braces and strings balance',()=>{
 const normalized=css.replace(/\/\*[\s\S]*?\*\//g,'');
 let depth=0,quote=null,escaped=false;
 for(const ch of normalized){
  if(quote){if(escaped){escaped=false;continue}if(ch==='\\'){escaped=true;continue}if(ch===quote)quote=null;continue}
  if(ch==='"'||ch==="'"){quote=ch;continue}
  if(ch==='{')depth++;
  else if(ch==='}'){depth--;assert.ok(depth>=0,'Unexpected closing brace')}
 }
 assert.equal(quote,null,'Unclosed CSS quote');assert.equal(depth,0,'CSS block imbalance');
});
console.log(checks+' PILEHEAD first-person UI contract groups passed');
