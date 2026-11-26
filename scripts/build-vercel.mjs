import fs from 'node:fs';
import path from 'node:path';
import engineBundle from './sync-game-engine.cjs';
engineBundle.sync({check:true});

// Only publish assets used by the current STACK game. The /api/pilehead
// Render serves the resulting files through scripts/render-server.cjs;
// the historical Vercel builder name remains for compatibility.
const root = path.resolve('dist');
const output = path.resolve('vercel-static');
const game = path.join(root, 'pilehead');
const assets = [
  'endgame-lab.html', 'endgame-lab.css', 'endgame-lab-engine.js', 'endgame-lab-app.js', 'online-polish.css', 'ux-clarity.css', 'ux-clarity.js', 'live.css', 'live.js', 'engine.js',
  'immersive.css', 'immersive.js', 'deck-art.css', 'deck-art.js',
  'deck-raster.css', 'deck-raster.js', 'stack-brand.css',
  'deck-theme.js', 'deck-theme.css',
  'gallery.html', 'print.html', 'playtest.html',
  'assets/stack-sheet.webp', 'assets/stack-back.webp', 'assets/stack-characters.webp', 'assets/stack-characters-v2.webp', 'assets/stack-back-v2.webp',
  ...['play','burn','snap','dump','reset','ghost','under','skip','victory'].map(name => 'assets/sound-v2/' + name + '.mp3')
];

fs.rmSync(output, { recursive: true, force: true });
fs.mkdirSync(path.join(output, 'pilehead'), { recursive: true });
for (const asset of assets) {
  const source = path.join(game, asset);
  const destination = path.join(output, 'pilehead', asset);
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.copyFileSync(source, destination);
}
// The Next export supplies the only public homepage.
// Publish the same canonical design system in standalone and integrated builds.
const brandDir = path.resolve('apps/web/public/stack-media');
fs.mkdirSync(path.join(output,'stack-media'),{recursive:true});
for(const name of ['stack-design-system.css','stack-home-logo-web.webp','barlow-condensed-black-italic.ttf','barlow-OFL.txt','print-grain.svg']) fs.copyFileSync(path.join(brandDir,name),path.join(output,'stack-media',name));
console.log('Built STACK static site: ' + assets.length + ' shared game assets');
