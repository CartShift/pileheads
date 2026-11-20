'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const root = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const classic = read('dist/pilehead/index.html');
const beta = read('dist/pilehead/3d-beta.html');
const renderer = read('dist/pilehead/3d-beta.js');
const css = read('dist/pilehead/3d-beta.css');
const builder = read('scripts/build-vercel.mjs');

// A new opt-in page must not change the default simulator or normal multiplayer URLs.
assert(!classic.includes('3d-beta.js'), 'classic must not load experimental renderer');
assert(!classic.includes('3d-beta.css'), 'classic must not load experimental theme');
assert(beta.includes('class="stack-3d-beta"'), '3D beta must be opt-in');
for (const script of ['engine.js','deck-art.js','deck-raster.js','deck-theme.js','immersive.js','app.js','online.js','3d-beta.js']) {
  assert(beta.includes('src="' + script + '"'), 'beta missing canonical game script ' + script);
}
for (const p of ['3d-beta.html','3d-beta.js','3d-beta.css']) {
  assert(builder.includes("'" + p + "'"), 'Render build missing ' + p);
}
assert(beta.includes('href="index.html">Classic simulator</a>'), 'classic fallback link required');
assert(beta.includes('href="?online=1"'), 'online mode must remain available');
assert(beta.includes('id="app"'), 'beta must mount the canonical game');
assert(beta.includes('href="3d-beta.css"'), 'beta must load isolated CSS');
assert(!/data-do="draw"/.test(beta), 'manual draw is not a STACK action');

// The WebGL renderer is purely presentational. All actions must still flow
// through the original semantic buttons and server-authoritative code.
new vm.Script(renderer, {filename:'3d-beta.js'});
assert(css.includes('pointer-events:none!important'), 'WebGL must not intercept game actions');
assert(renderer.includes('MutationObserver'), 'renderer must handle authoritative rerenders');
assert(renderer.includes('WebGLRenderer'), 'actual Three.js renderer required');
assert(renderer.includes('CanvasTexture'), 'actual game artwork must be used');
assert(renderer.includes('stack-characters.webp'), 'character theme must use the production sprite');
assert(renderer.includes('stack-sheet.webp'), 'original theme must use the production sprite');
assert(renderer.includes('stack-back.webp'), 'production card back required');
assert(renderer.includes("const faceNames = Array.from({length: 10}"), '10 numeric faces required');
assert(renderer.includes("['reset', 'ghost', 'under', 'skip', 'burn', 'dump']"), 'all six special faces required');
assert(renderer.includes("fallback("), 'WebGL fallback required');
assert(css.includes('body.stack-3d-beta.stack-3d-ready'), 'classic DOM cards hidden only once 3D is ready');
assert(css.includes('pointer-events:none!important'), '3D canvas should never capture touch input');
console.log('PASS: 3D beta is additive, syntax-valid, buildable, and preserves semantic game controls');
