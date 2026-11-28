'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const manifest = JSON.parse(fs.readFileSync('apps/web/public/manifest.webmanifest','utf8'));
assert.equal(manifest.id,'/play');
assert.equal(manifest.start_url,'/play');
assert.equal(manifest.scope,'/');
assert.equal(manifest.display,'standalone');
for (const size of ['192x192','512x512']) assert(manifest.icons.some(i=>i.sizes===size&&i.purpose==='any'));
assert(manifest.icons.some(i=>i.purpose==='maskable'&&i.sizes==='512x512'));
const worker = fs.readFileSync('apps/web/public/pwa-sw.js','utf8');
let fetchHandler;
let fail = false;
let calls = 0;
const original = new Response('fresh online page');
vm.runInNewContext(worker, {
  self:{location:{origin:'https://pileheads.com'},addEventListener(type,fn){assert.equal(type,'fetch');fetchHandler=fn;}},
  URL,Response,fetch:async()=>{calls++;if(fail)throw Error('offline');return original;}
});
function request(path, {mode='navigate',method='GET'}={}) {
  let response;
  fetchHandler({request:{url:new URL(path,'https://pileheads.com').href,mode,method},respondWith(p){response=p;}});
  return response;
}
(async()=>{
  assert.equal(await request('/play'),original);
  fail=true;
  const response=await request('/play');
  assert.equal(response.status,503);
  assert.match(await response.text(),/Offline matches are not available yet/);
  assert.equal(response.headers.get('Cache-Control'),'no-store');
  for(const path of ['/api/pilehead','/api/account','/api/account/callback','/api/player','/profile','/play?room=secret','/play?token=secret','https://other.example/play','/_next/static/chunk.js','/manifest.webmanifest'])assert.equal(request(path),undefined,path);
  assert.equal(request('/play',{method:'POST'}),undefined);
  assert.equal(request('/play',{mode:'cors'}),undefined);
  assert.equal(calls,2);
  assert(!/skipWaiting\s*\(|clients\.claim\s*\(|caches\./.test(worker));
  const layout=fs.readFileSync('apps/web/app/layout.tsx','utf8');
  assert.match(layout,/NEXT_PUBLIC_PILEHEADS_PWA === "1"/);
  const component=fs.readFileSync('apps/web/components/pwa-install.tsx','utf8');
  assert.match(component,/NEXT_PUBLIC_PILEHEADS_PWA === "1"/);
  assert.match(component,/beforeinstallprompt/);
  assert.match(component,/standalone/);
  const game=fs.readFileSync('apps/web/components/game-table.tsx','utf8');
  assert.match(game,/!inviteEntry && mode === "home" && <PwaInstall\/>/);
  console.log('PWA manifest, feature gate and network-only worker contract passed');
})().catch(error=>{console.error(error);process.exitCode=1;});
