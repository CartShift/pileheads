'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
let saved=null;const ctx={localStorage:{getItem:()=>saved,setItem:(_,v)=>saved=v},dispatchEvent(){},Event:class{}};
for(const f of ['deck-art.js','deck-theme.js','deck-raster.js'])vm.runInNewContext(read('dist/pilehead/'+f),ctx);
const theme=ctx.StackDeckThemes,art=ctx.PileheadCardArt;
assert.equal(theme.get(),'refined');assert.match(art.back(),/stack-back-v2\.webp/);assert.match(art.mini(null),/stack-back-v2\.webp/);
for(const id of ['geometry','characters','studio']){theme.set(id);assert.equal(saved,id);assert.match(art.back(),/stack-back\.webp/)}
theme.set('refined');assert.equal(saved,'refined');
for(const n of ['stack-characters-v2.webp','stack-back-v2.webp']){const b=fs.readFileSync(path.join(root,'dist/pilehead/assets',n));assert.equal(b.toString('ascii',8,12),'WEBP');assert.ok(read('scripts/build-vercel.mjs').includes(n));assert.ok(read('apps/web/scripts/sync-assets.mjs').includes(n))}
for(const n of ['play','burn','snap','dump','reset','ghost','under','skip','victory'])assert.ok(fs.statSync(path.join(root,'dist/pilehead/assets/sound-v2',n+'.mp3')).size>1000);
assert.match(read('apps/web/app/globals.css'),/theme-refined/);console.log('PASS refined theme, legacy themes, hidden backs and publish assets');
