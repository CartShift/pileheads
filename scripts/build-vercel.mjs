import fs from 'node:fs';
import path from 'node:path';

// Vercel runs the physical solo playtest without exposing Sites/D1-only rooms.
// This does not alter the original ChatGPT Sites / Cloudflare Worker bundle.
const source=path.resolve('dist');
const target=path.resolve('vercel-static');
const assets=['engine-v5.js','sim-core.js','simulation.worker.js','simulation-results.json','tilt-sim-core.js','tilt-simulation-results.json','pilehead-sim-core.js','pilehead-simulation-results.json','tabletop.css'];
fs.rmSync(target,{recursive:true,force:true});
fs.mkdirSync(target,{recursive:true});
for(const name of assets)fs.copyFileSync(path.join(source,name),path.join(target,name));
fs.mkdirSync(path.join(target,'tilt'),{recursive:true});
for(const name of ['index.html','engine.js','app.js','print.html'])
  fs.copyFileSync(path.join(source,'tilt',name),path.join(target,'tilt',name));
fs.mkdirSync(path.join(target,'pilehead'),{recursive:true});
for(const name of ['index.html','engine.js','app.js','print.html'])
 fs.copyFileSync(path.join(source,'pilehead',name),path.join(target,'pilehead',name));
let html=fs.readFileSync(path.join(source,'index.html'),'utf8');
const removals=[
  ['<link rel="stylesheet" href="online.css">',''],
  ['<script src="online.js"></script>',''],
  [",['friends',t('חברים','Friends')]",''],
  ['PLAYTEST STUDIO','PHYSICAL PLAYTEST · SOLO PREVIEW'],
];
for(const [from,to] of removals){
  if(!html.includes(from))throw new Error(`Expected site token missing: ${from}`);
  html=html.replace(from,to);
}
fs.writeFileSync(path.join(target,'index.html'),html);
console.log('Built Vercel solo playtest (no ChatGPT-auth/D1 rooms or server bundle).');
