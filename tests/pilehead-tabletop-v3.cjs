'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const previous=read('dist/pilehead/3d-beta.html');
const classic=read('dist/pilehead/index.html');
const preview=read('dist/pilehead/tabletop-studio.html');
const css=read('dist/pilehead/tabletop-v3.css');
const js=read('dist/pilehead/tabletop-v3.js');
const build=read('scripts/build-vercel.mjs');
const renderer=read('dist/pilehead/3d-beta.js');
new vm.Script(js,{filename:'tabletop-v3.js'});

for(const item of ['tabletop-studio.html','tabletop-v3.css','tabletop-v3.js']){
 assert(build.includes("'"+item+"'"),'Render build must publish '+item);
 assert(!classic.includes(item),'Classic must not load the preview');
 assert(!previous.includes(item),'existing beta must remain unchanged');
}
for(const script of ['engine.js','app.js','online.js','deck-theme.js','3d-beta.js']){
 assert(preview.includes('src="'+script) || preview.includes('src="'+script+'?'), 'preview must reuse '+script);
}
assert(preview.includes('class="stack-3d-beta stack-tabletop-v3"'));
assert(preview.includes('href="tabletop-v3.css?v=studio-1"'));
assert(preview.includes('src="tabletop-v3.js?v=studio-1"'));
assert(!preview.includes('href="3d-beta-mobile.css'), 'preview must not inherit former beta patches');
assert(!preview.includes('href="3d-beta-v2.css'), 'preview must not inherit former beta patches');
assert(!preview.includes('href="3d-beta.css'), 'preview must not inherit former beta patches');
assert(!preview.includes('src="3d-beta-v2.js'), 'preview must not run former beta DOM adapter');
assert(preview.includes('href="index.html">Classic simulator</a>'));
assert(js.includes("location.search"), 'room switching must retain query');
assert(js.includes("table.closest('.online-layout')||app"), 'online root must be supported');
assert(js.includes('MutationObserver'), 'new game view must survive canonical re-render');
assert(js.includes("relocate(action,controls)"), 'real game actions must be used');
assert(js.includes("relocate(table,room)"), 'real table must be used');
assert(!js.includes('fetch('), 'preview may not make duplicate game API requests');
assert(!js.includes('PileheadEngine.'), 'preview must not implement rules');

for(const required of ['.v3-shell','.v3-topline','.v3-room','.v3-info','.v3-controls',
 '.opponents','.table-center','.zone.your-up','.hand-area',
 'grid-template-rows:minmax(154px','grid-template-rows:126px 170px 138px 156px',
 'pointer-events:none!important','env(safe-area-inset-bottom)','prefers-reduced-motion']){
 assert(css.includes(required),'missing deliberate scene contract '+required);
}
assert(css.includes('stack-3d-ready'), 'DOM cards hidden only once WebGL is ready');
assert(css.includes('stack-3d-ready .v3-room .table::before'), 'CSS wood must fall back after WebGL failure');
assert(renderer.includes('function proceduralWood()'), 'studio requires a genuine textured tabletop');
assert(renderer.includes('new THREE.PlaneGeometry(1,1)'), 'wood surface must be Three.js geometry');
assert(renderer.includes('function sizePhysicalTable(w,h)'), 'physical tabletop must resize to canvas');
assert(renderer.includes("body.classList.contains('stack-tabletop-v3')"), 'wood geometry must not affect old beta');
assert(renderer.includes('physicalTableTexture?.dispose()'), 'table texture must be disposed');
assert(css.includes('@media(max-width:760px)'), 'mobile is not a desktop viewport crop');
const depth=[...css].reduce((n,c)=>n+(c==='{')-(c==='}'),0);
assert.equal(depth,0,'CSS braces must balance');
console.log('PASS standalone tabletop scene: opt-in, independent styles, real rules/multiplayer, mobile and fallback');
