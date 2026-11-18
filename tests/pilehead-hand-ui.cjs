'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..'),read=x=>fs.readFileSync(path.join(root,x),'utf8');
const fx=read('dist/pilehead/immersive.js'),css=read('dist/pilehead/immersive.css'),
 local=read('dist/pilehead/app.js'),online=read('dist/pilehead/online.js');
let checks=0;const check=(n,fn)=>{fn();checks++;console.log('PASS '+n)};
const env={
 window:{addEventListener(){}},document:{querySelector(){return null}},
 matchMedia(){return{matches:false}},localStorage:{getItem(){return null}},
 console:{error(){},warn(){}},setTimeout(){},clearTimeout(){}
};
new vm.Script(fx).runInNewContext(env);
const layout=env.window.PileheadTableFX.handLayout;
check('fan measures cards and fits 8 on a narrow phone without horizontal page movement',()=>{
 const x=layout(8,320,72,true);assert.equal(x.fits,true);
 assert.ok(x.span<=296,'8 cards should fit within the 296px usable rail');
 assert.ok(x.overlap<0,'cards form a real overlapping fan');
});
check('a pickup of 20 cards scrolls independently instead of becoming unreadably narrow',()=>{
 const x=layout(20,320,72,true);assert.equal(x.fits,false);
 assert.ok(x.span>296);assert.ok(x.overlap<=-30);
});
check('small hands spread across the fan before larger hands start overlapping',()=>{
 const a=layout(3,350,82,true);
 assert.ok(a.fits&&a.overlap>-20);
 const b=layout(4,350,82,true);
 assert.ok(b.fits&&b.overlap>-20);
});
check('mobile controls are contextual and table height comes from cards',()=>{
 for(const source of [local,online]){
  assert.match(source,/function tableActions\(/);
  assert.match(source,/class="toolbar table-actions"/);
  assert.match(source,/data-do="clear-selection"/);
  assert.match(source,/table-action-prompt/);
 }
 assert.match(css,/PHONE TABLE · NOVEMBER 2026/);
 assert.match(css,/grid-template-rows:auto auto auto auto/);
 assert.match(css,/\.hand-controls/);
 assert.match(fx,/matchMedia\('\(max-width:700px\)'\)\.matches/);
});
check('special-card explanation and latest move appear before the action rail',()=>{
 for(const source of [local,online]){
  const game=source.slice(source.indexOf('function gameView(){')>=0?source.indexOf('function gameView(){'):source.indexOf('function playView(){'));
  assert.ok(game.indexOf('(selectedEffect()||lastEffect())+tableActions(')>=0);
 }
 assert.match(css,/selected action-card explanation takes priority/);
});
check('tablet and desktop keep larger card faces while arranging groups',()=>{
 assert.equal(layout(6,720,106,false).fits,true);
 assert.ok(layout(15,720,106,false).span>=106);
});
check('all tabletop rows and action rails explicitly constrain grid min-content width',()=>{
 assert.match(css,/grid-template-columns:minmax\(0,1fr\)/);
 assert.match(css,/body\.pilehead-playing \.table\{[\s\S]*?min-width:0/);
 assert.match(css,/body\.pilehead-playing \.table \.hand-area\{[\s\S]*?max-width:100%/);
 assert.match(css,/overflow-x:auto/);assert.match(css,/overflow-x:clip/);
 assert.match(css,/grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
});
check('large hand rail has scroll arrows and scroll position survives card rerenders',()=>{
 assert.match(fx,/data-hand-scroll/);assert.match(fx,/handScroll=row\.scrollLeft/);
 assert.match(fx,/row\.scrollLeft=handScroll/);
 assert.match(fx,/\.scrollBy\(/);
 assert.match(css,/\.hand-scroll-arrow/);
});
check('multi-special selection works locally and in online rooms, including card drag',()=>{
 for(const code of [local,online]){
  assert.match(code,/function sameFace\(/);
  assert.match(code,/function selectMatching\(/);
  assert.match(code,/sameFace\(/);
  assert.match(code,/className='drag-count'/);
  assert.doesNotThrow(()=>new vm.Script(code));
 }
});
check('QA controls are folded away without taking tabletop toolbar width',()=>{
 assert.match(local,/<details class="playtest-tools">/);
 assert.match(local,/data-do="export"/);
 assert.match(css,/\.playtest-tools/);
});
check('physical feedback stays accessible and respects reduced motion',()=>{
 assert.match(css,/\.card-row\.hand \.card\.selected/);
 assert.match(css,/prefers-reduced-motion:reduce/);
 assert.match(fx,/aria-label/);
 assert.match(local,/aria-pressed/);
 assert.match(online,/aria-pressed/);
});

check('the final CSS disables idle transform tweening and touch hover jitter',()=>{
 const i=css.lastIndexOf('HAND STABILITY / NOV 2026');
 assert.ok(i>=0);
 const layer=css.slice(i);
 assert.ok(layer.includes('transition-property:box-shadow,filter!important'));
 assert.ok(layer.includes('animation:none!important'));
 assert.ok(layer.includes('(hover:none), (pointer:coarse)'));
 assert.ok(layer.includes(':hover:not(:active)'));
 assert.ok(i>css.indexOf('animation:ph-paper-pick'));
});
console.log('PILEHEAD hand UI: '+checks+' groups passed');
