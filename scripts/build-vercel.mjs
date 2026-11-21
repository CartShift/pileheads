import fs from 'node:fs';
import path from 'node:path';

// Only publish assets used by the current STACK game. The /api/pilehead
// Render serves the resulting files through scripts/render-server.cjs;
// the historical Vercel builder name remains for compatibility.
const root = path.resolve('dist');
const output = path.resolve('vercel-static');
const game = path.join(root, 'pilehead');
const assets = [
  'index.html', '3d-beta.html', '3d-beta.css', '3d-beta.js', '3d-beta-v2.css', '3d-beta-v2.js', '3d-beta-mobile.css', 'tabletop-studio.html', 'tabletop-v3.css', 'tabletop-v4.css', 'tabletop-v3.js', 'app.js', 'online.js', 'online-polish.css', 'ux-clarity.css', 'ux-clarity.js', 'live.css', 'live.js', 'engine.js',
  'immersive.css', 'immersive.js', 'deck-art.css', 'deck-art.js',
  'deck-raster.css', 'deck-raster.js', 'stack-brand.css',
  'deck-theme.js', 'deck-theme.css',
  'gallery.html', 'print.html', 'playtest.html',
  'assets/stack-sheet.webp', 'assets/stack-back.webp', 'assets/stack-characters.webp'
];

fs.rmSync(output, { recursive: true, force: true });
fs.mkdirSync(path.join(output, 'pilehead'), { recursive: true });
for (const asset of assets) {
  const source = path.join(game, asset);
  const destination = path.join(output, 'pilehead', asset);
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.copyFileSync(source, destination);
}
fs.copyFileSync(path.join(root, 'index.html'), path.join(output, 'index.html'));
console.log('Built STACK static site: ' + assets.length + ' game assets + root redirect');
