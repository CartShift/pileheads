import fs from 'node:fs';
import path from 'node:path';
import {publishOfflineWorker} from './build-pwa-offline.mjs';

const root = path.resolve('vercel-static');
const source = path.resolve('apps/web/out');
for (const route of ['index','play','stack','how-to-play','deck','profile','quick-play']) {
  if (!fs.statSync(path.join(source, route + '.html')).isFile()) throw new Error('Next export missing required route: ' + route);
}
if (!fs.existsSync(path.join(source, '_next'))) throw new Error('Next export missing fingerprinted assets');
for (const name of fs.readdirSync(source)) {
  fs.cpSync(path.join(source,name),path.join(root,name),{recursive:true,force:true});
}
// Reject accidental reintroduction of the retired tabletop.
for (const name of ['index.html','app.js','online.js','classic-clean.css','classic-premium.css']) {
  if (fs.existsSync(path.join(root,'pilehead',name))) throw new Error('Retired Classic asset published: '+name);
}
if(process.env.NEXT_PUBLIC_PILEHEADS_PWA==='1'&&process.env.NEXT_PUBLIC_PILEHEADS_OFFLINE==='1'){
  const index=publishOfflineWorker(root,path.resolve('scripts/pwa-offline-worker.js'));
  console.log('Published opt-in offline snapshot '+index.version+' ('+index.totalBytes+' bytes)');
}
console.log('Published Next.js as the only tabletop and homepage');
