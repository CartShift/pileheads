import fs from 'node:fs';
import path from 'node:path';

// Only publish assets used by the current STACK game. The /api/pilehead
// serverless function is discovered separately by Vercel.
const root = path.resolve('dist');
const output = path.resolve('vercel-static');
const game = path.join(root, 'pilehead');
const assets = [
  'index.html', 'app.js', 'online.js', 'engine.js',
  'immersive.css', 'immersive.js', 'deck-art.css', 'deck-art.js',
  'deck-raster.css', 'deck-raster.js', 'stack-brand.css',
  'gallery.html', 'print.html', 'playtest.html',
  'assets/stack-sheet.webp', 'assets/stack-back.webp'
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
