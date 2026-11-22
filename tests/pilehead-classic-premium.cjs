'use strict';
/* Verify the local-only premium layer is complete, safe and published. */
const assert=require('node:assert/strict'),fs=require('node:fs');
const vm=require('node:vm');
const read=p=>fs.readFileSync(p,'utf8');
const app=read('dist/pilehead/app.js'),html=read('dist/pilehead/index.html');
const css=read('dist/pilehead/classic-premium.css'),manifest=read('scripts/build-vercel.mjs');
const online=read('dist/pilehead/online.js');
assert.doesNotThrow(()=>new vm.Script(app),'Classic app remains valid JavaScript');
assert.match(app,/has\('online'\)\|\|new URLSearchParams\(location\.search\)\.has\('room'\)\)return;/);
assert.match(app,/document\.body\.classList\.add\('stack-classic'\)/);
assert.match(html,/href="classic-premium\.css"/,'Classic CSS loads after other theme layers');
assert.match(manifest,/'classic-premium\.css'/,'Render publishes the Classic UI layer');
assert.doesNotMatch(online,/stack-classic/,'Classic UX code must not modify online UI');
for(const token of ['.stack-classic-progress','.stack-progress-step.is-current',
 '.stack-classic-preview','.stack-classic-dialog','.stack-classic-hotkeys',
 '.table.is-active-turn','.table .opponent.current','.toolbar.table-actions'])
 assert(css.includes(token),'Missing designed state '+token);
assert.match(css,/prefers-reduced-motion:reduce/);
assert.match(css,/max-width:700px/);
assert.match(css,/body\.stack-classic\.pilehead-playing/);
assert.match(app,/function layerProgress\(\)/);
assert.match(app,/function selectedPreview\(\)/);
assert.match(app,/E\.options\(g,viewSeat\(\)\)\.some/,'selection preview uses engine options');
assert.match(app,/const candidate=structuredClone\(g\)/,'local attempted moves are atomic');
assert.match(app,/E\.move\(candidate,seat,choice\);g=candidate/,'commit only after success');
assert.match(app,/mode==='bots'&&seat===0\?structuredClone\(g\):null/,'Undo limited to solo');
assert.match(app,/E\.invariant\(x\.undoState\)/,'undo snapshot verified on restore');
assert.match(app,/data-do="undo"/);
assert.match(app,/data-do="cancel-new"/);
assert.match(app,/data-do="confirm-new"/);
assert.match(app,/function queueBot\(\)\{\n if\(!g\|\|g\.phase!=='play'\|\|mode!=='bots'\|\|restartPrompt\)/,'restart confirmation pauses bots');
assert.doesNotMatch(app,/confirm\('Start a new game/,'native confirm replaced with styled modal');
console.log('PASS STACK Classic premium UX: scoped styles, visual states, action safety, Undo, keyboard and reset');
