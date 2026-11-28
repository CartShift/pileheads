import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

// Only the exported public /play document, fingerprinted Next runtime and
// explicitly approved artwork, type and audio. No account/room route payloads.
const brand = ['stack-design-system.css','stack-home-logo-web.webp','barlow-condensed-black-italic.ttf','print-grain.svg','stack-home-faces-web-mobile.webp','stack-home-explorer-web-mobile.webp'];
const deck = ['stack-characters.webp','stack-back.webp','stack-sheet.webp','stack-characters-v2.webp','stack-back-v2.webp'];
const sounds = ['play','burn','snap','dump','reset','ghost','under','skip','victory'];
export const MAX_BYTES = 64 * 1024 * 1024;
export const PUBLIC_ASSETS = [
  ...brand.map(name=>'/stack-media/'+name),
  ...deck.map(name=>'/pilehead/assets/'+name),
  ...sounds.map(name=>'/pilehead/assets/sound-v2/'+name+'.mp3'),
  ...['stack-characters.webp','stack-back.webp','stack-characters-v2.webp','stack-back-v2.webp'].map(name=>'/pilehead/assets/'+name+'?v=production-rc3'),
  '/stack-media/stack-home-faces-web-mobile.webp?v=production-rc3',
  '/pwa/icon-192.png','/pwa/icon-512.png','/pwa/maskable-512.png','/pwa/apple-touch-icon.png',
  '/pileheads-icon.png','/manifest.webmanifest'
];
const staticPattern=/^\/_next\/static\/[A-Za-z0-9._/-]+\.(?:js|css|woff2?|ttf|webp|png|svg|jpe?g|ico|json)$/;
const hash=data=>crypto.createHash('sha256').update(data).digest('hex');
function files(root,dir){
  return fs.readdirSync(path.join(root,dir),{withFileTypes:true}).flatMap(item=>{
    const relative=dir+'/'+item.name;
    if(item.isDirectory())return files(root,relative);
    if(item.isFile())return [relative];
    throw Error('Unexpected non-file in static export: '+relative);
  });
}
export function buildOfflineIndex(root){
  const next=files(root,'_next/static').map(p=>'/'+p).filter(p=>staticPattern.test(p));
  if(!next.some(p=>p.endsWith('.js'))||!next.some(p=>p.endsWith('.css')))throw Error('Missing Next runtime assets');
  const urls=[...new Set(['/play',...PUBLIC_ASSETS,...next])].sort();
  const entries=urls.map(url=>{
    const filename=url==='/play'?'play.html':url.split('?')[0].slice(1);
    const bytes=fs.readFileSync(path.join(root,filename));
    if(!bytes.length)throw Error('Empty offline asset: '+url);
    return {url,bytes:bytes.length,sha256:hash(bytes)};
  });
  const totalBytes=entries.reduce((n,entry)=>n+entry.bytes,0);
  if(totalBytes>MAX_BYTES)throw Error('Offline download exceeds 64 MiB budget: '+totalBytes);
  return {version:hash(JSON.stringify(entries)),totalBytes,entries};
}
export function publishOfflineWorker(root,template){
  const index=buildOfflineIndex(root);
  // Embed the inventory in the worker itself: no independently stale index,
  // no mutable runtime list. Each response is checked against its build hash.
  const source=fs.readFileSync(template,'utf8');
  if(!source.includes('/*__OFFLINE_INDEX__*/ null'))throw Error('Missing offline index insertion point');
  fs.writeFileSync(path.join(root,'pwa-sw.js'),source.replace('/*__OFFLINE_INDEX__*/ null',JSON.stringify(index)));
  return index;
}

/** A rollback is an ordinary worker update, not forced activation. */
export function retirementSource(unregister){
  return `self.addEventListener("activate",event=>event.waitUntil((async()=>{
    try {
      for(const name of await caches.keys())if(name.startsWith("pileheads-offline-v1-"))await caches.delete(name);
    } catch { /* browser storage may be unavailable */ }
    ${unregister?'await self.registration.unregister();':''}
  })()));\n`;
}
export function publishPwaWorker(root,{pwaEnabled,offlineEnabled,template}){
  if(pwaEnabled&&offlineEnabled)return publishOfflineWorker(root,template);
  const target=path.join(root,'pwa-sw.js');
  const source=pwaEnabled?fs.readFileSync(target,'utf8')+'\n':'"use strict";\n';
  fs.writeFileSync(target,source+retirementSource(!pwaEnabled));
  return null;
}
