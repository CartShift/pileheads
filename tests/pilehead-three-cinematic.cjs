'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const root=path.join(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const classic=read('dist/pilehead/index.html');
const beta=read('dist/pilehead/3d-beta.html');
const old3d=read('dist/pilehead/3d-beta.js');
const v2=read('dist/pilehead/3d-beta-v2.js');
const style=read('dist/pilehead/3d-beta-v2.css');
const build=read('scripts/build-vercel.mjs');

for(const name of ['3d-beta.js','3d-beta-v2.js'])new vm.Script(read('dist/pilehead/'+name),{filename:name});
for(const name of ['3d-beta-v2.css','3d-beta-v2.js']) {
 assert(beta.includes(name), 'beta HTML must load '+name);
 assert(build.includes("'"+name+"'"), 'Render manifest must publish '+name);
 assert(!classic.includes(name), 'classic must not load '+name);
}
assert(beta.indexOf('3d-beta-v2.css')>beta.indexOf('3d-beta.css'),'cinematic stylesheet must follow base beta');
assert(beta.indexOf('3d-beta-v2.js')>beta.indexOf('3d-beta.js'),'cinematic adapter must run after Three renderer');
assert(v2.includes('MutationObserver'), 'must handle authoritative game rerenders');
for(const selector of ['.pitch','.pilehead-table-hud','.toolbar.table-actions','.move-history','.online-room-tools']) {
 assert(v2.includes(selector), 'missing live table component '+selector);
}
assert(v2.includes("const app = document.getElementById('app')"), 'must attach to the original game');
assert(!v2.includes('fetch('), 'cinematic adapter must not bypass multiplayer server');
assert(!v2.includes("PileheadEngine.move("), 'cinematic adapter must not touch game rules');
for(const selector of ['.stack-beta-side-intro','.stack-beta-me','.opponents','.table-center','.zone.your-up','.hand-area','.table-actions','.move-history']) {
 assert(style.includes(selector), 'missing core game-room layout '+selector);
}
assert(style.includes('@media(max-width:760px)'), 'responsive small-screen layout is required');
assert(style.includes('prefers-reduced-motion'), 'must respect reduced motion');
assert(style.includes('.stack-beta-three-canvas'), 'existing WebGL layer must be preserved');
assert(style.includes('pointer-events:none'), '3D overlays must not intercept game taps');
assert(old3d.includes('cardLaunchOrigins'), 'Three scene must preserve meshes across turns');
assert(old3d.includes("const pair = element.closest('.up-pair')"), 'all three face-down cards need separate mesh identities');
console.log('PASS STACK cinematic 3D beta: opt-in, real engine, visuals, mobile, gesture and fallbacks');
