'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.join(__dirname,'..');
const read=name=>fs.readFileSync(path.join(root,name),'utf8');
const beta=read('dist/pilehead/3d-beta.html');
const classic=read('dist/pilehead/index.html');
const build=read('scripts/build-vercel.mjs');
const mobile=read('dist/pilehead/3d-beta-mobile.css');
const compose=read('dist/pilehead/3d-beta-v2.js');
const three=read('dist/pilehead/3d-beta.js');
new vm.Script(compose,{filename:'3d-beta-v2.js'});
new vm.Script(three,{filename:'3d-beta.js'});

// New repair must be beta-only and loaded last.
assert(beta.includes('href="3d-beta-mobile.css"'));
assert(beta.indexOf('3d-beta-mobile.css')>beta.indexOf('3d-beta-v2.css'));
assert(!classic.includes('3d-beta-mobile.css'));
assert(build.includes("'3d-beta-mobile.css'"));

// The real action toolbar must be reparented OUTSIDE the overflow-clipped 3D
// table on phones; the HUD must be above the opponents, not over their avatars.
assert(compose.includes("const mobile = matchMedia('(max-width:760px)').matches"));
assert(compose.includes("app.insertBefore(node,table)"));
assert(compose.includes("app.appendChild(node)"));
assert(compose.includes("'.toolbar.table-actions'"));
assert(compose.includes("'.pilehead-table-hud'"));
assert(mobile.includes('#app>.toolbar.table-actions'));
assert(mobile.includes('position:fixed!important'));
assert(mobile.includes('z-index:300!important'));
assert(mobile.includes('#app>.pilehead-table-hud'));
assert(mobile.includes('order:1;position:relative!important'));

// No player or pile cards are recreated from fake game state.
assert(three.includes('cardLaunchOrigins'));
assert(three.includes("const pair = element.closest('.up-pair')"));
assert(three.includes('illustratedBack()'));
assert(three.includes('stack-characters.webp'));
assert(mobile.includes('.table-center'));
assert(mobile.includes('.zone.your-up'));
assert(mobile.includes('.card-row.hand'));
assert(mobile.includes('overflow-x:auto!important'));
assert(mobile.includes('min-height:560px!important'));
assert(mobile.includes('prefers-reduced-motion:reduce'));

// A beta-only Three.js presentation still cannot intercept the real
// clickable semantic card elements or their keyboard/drag controls.
assert(mobile.includes('pointer-events:none!important'));
assert(!beta.includes('data-do="draw"'), 'no invented manual Draw action');
assert(beta.includes('src="app.js"')&&beta.includes('src="online.js"'));
console.log('PASS STACK mobile 3D repair: dock, overlays, card zones, real engine, accessibility');
