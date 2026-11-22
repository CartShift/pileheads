import fs from 'node:fs';
import path from 'node:path';

// Preserve the existing Classic homepage and game. Publish ONLY the static
// Next.js export into the already-built, same-origin Render static root.
const root = path.resolve('vercel-static');
const source = path.resolve('apps/web/out');
const classicHome = fs.readFileSync(path.join(root, 'index.html'));
for (const route of ['play', 'stack']) {
  if (!fs.statSync(path.join(source, route + '.html')).isFile()) {
    throw new Error('Next export missing required route: ' + route);
  }
}
if (!fs.existsSync(path.join(source, '_next'))) {
  throw new Error('Next export missing fingerprinted assets');
}
for (const name of fs.readdirSync(source)) {
  // Root Classic stays the default until rollout, and canonical deck assets
  // are already published by build-vercel.mjs. Never overwrite either.
  if (['index.html', 'index.txt', 'pilehead'].includes(name)) continue;
  const from = path.join(source, name);
  const to = path.join(root, name);
  const stats = fs.statSync(from);
  if (stats.isDirectory()) {
    fs.cpSync(from, to, {recursive: true, force: true});
  } else {
    fs.copyFileSync(from, to);
  }
}
const publishedHome = fs.readFileSync(path.join(root, 'index.html'));
if (!classicHome.equals(publishedHome)) throw new Error('Classic homepage was changed');
console.log('Published Next.js /play and /stack alongside the unchanged Classic game');
