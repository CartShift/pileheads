import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {pathToFileURL} from 'node:url';

// Only public, immutable game resources. Never add API, account, room or checkout paths.
export const OFFLINE_ASSETS=[
 '/stack-offline.html','/pilehead/index.html',
 ...['app.js','online.js','online-polish.css','classic-premium.css','classic-clean.css','table-feedback.css','ux-clarity.css','ux-clarity.js','live.css','live.js','engine.js','immersive.css','immersive.js','deck-art.css','deck-art.js','deck-raster.css','deck-raster.js','stack-brand.css','deck-theme.js','deck-theme.css','assets/stack-sheet.webp','assets/stack-back.webp','assets/stack-characters.webp'].map(p=>'/pilehead/'+p)
];
export function workerSource(version){
 return `'use strict';
const CACHE='stack-offline-${version}';
const ASSETS=${JSON.stringify(OFFLINE_ASSETS)};
const paths=new Set(ASSETS);
self.addEventListener('install',event=>{
 event.waitUntil((async()=>{
  const cache=await caches.open(CACHE);
  try{await cache.addAll(ASSETS.map(path=>new Request(path,{credentials:'omit',cache:'reload'})));}
  catch(error){await caches.delete(CACHE);throw error;}
 })());
});
self.addEventListener('activate',event=>{
 event.waitUntil((async()=>{
  for(const key of await caches.keys())if(key.startsWith('stack-offline-')&&key!==CACHE)await caches.delete(key);
  await self.clients.claim();
 })());
});
self.addEventListener('fetch',event=>{
 const req=event.request,url=new URL(req.url);
 if(req.method!=='GET'||url.origin!==self.location.origin||url.search)return;
 if(paths.has(url.pathname)){
  event.respondWith((async()=>{const cache=await caches.open(CACHE);return await cache.match(url.pathname)||fetch(req);})());
 }else if(req.mode==='navigate'&&['/','/stack','/stack/','/play','/play/'].includes(url.pathname)){
  event.respondWith(fetch(req).catch(async()=>{const cache=await caches.open(CACHE);return await cache.match('/stack-offline.html')||Response.error();}));
 }
});
`;
}
export function buildOffline(root){
 const digest=crypto.createHash('sha256');
 for(const url of OFFLINE_ASSETS){const p=path.join(root,url.slice(1));const bytes=fs.readFileSync(p);if(!bytes.length)throw Error('Empty offline asset: '+url);digest.update(url);digest.update(bytes);}
 digest.update(workerSource('template'));
 const version=digest.digest('hex').slice(0,20);
 fs.writeFileSync(path.join(root,'stack-sw.js'),workerSource(version));
 return version;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href)console.log('STACK offline assets version '+buildOffline(path.resolve('vercel-static')));
