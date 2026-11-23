'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const file = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');
const removed = [
  "dist/pilehead/3d-beta.html",
  "dist/pilehead/3d-beta.css",
  "dist/pilehead/3d-beta.js",
  "dist/pilehead/3d-beta-v2.css",
  "dist/pilehead/3d-beta-v2.js",
  "dist/pilehead/3d-beta-mobile.css",
  "dist/pilehead/tabletop-studio.html",
  "dist/pilehead/tabletop-v3.css",
  "dist/pilehead/tabletop-v3.js",
  "dist/pilehead/tabletop-v4.css",
  "tests/pilehead-three-beta.cjs",
  "tests/pilehead-three-cinematic.cjs",
  "tests/pilehead-three-mobile.cjs",
  "tests/pilehead-tabletop-v3.cjs",
  "tests/stack-three-mobile-browser.cjs",
  "tests/tabletop-studio-browser.cjs",
  "docs/stack-3d-beta.md"
];
for (const relative of removed) {
  assert.equal(fs.existsSync(path.join(root, relative)), false, 'Retired Three.js file still tracked: ' + relative);
}
for (const relative of ['dist/pilehead/index.html', 'README.md', 'scripts/build-vercel.mjs']) {
  assert.doesNotMatch(file(relative), /3d-beta|tabletop-studio|tabletop-v3|tabletop-v4|three\.js/i, relative + ' still links the retired beta');
}
const classic = file('dist/pilehead/index.html');
for (const name of ['engine.js', 'app.js', 'online.js', 'deck-theme.js']) {
  assert.ok(classic.includes('src="' + name + '"'), 'Classic gameplay script missing: ' + name);
}
const manifest = file('scripts/build-vercel.mjs');
assert.ok(manifest.includes("'index.html'"), 'Classic entry missing from deployment');
console.log('PASS: Three.js experiments removed, Classic remains in deployment');
