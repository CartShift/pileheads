'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto');
const base=path.join(__dirname,'..'),read=p=>fs.readFileSync(path.join(base,p),'utf8');
let count=0;function test(name,fn){fn();count++;console.log('PASS '+name)}
const ctx={};vm.runInNewContext(read('dist/pilehead/deck-art.js'),ctx);
const vector=ctx.PileheadCardArt;
vm.runInNewContext(read('dist/pilehead/deck-raster.js'),ctx);
const art=ctx.PileheadCardArt;
test('all 16 illustrated faces map to unique source-sheet cells',()=>{
 const locations=new Set();
 for(let rank=1;rank<=10;rank++){
  const c={kind:'number',rank},d=art.cell(c);
  assert.equal(d.name,'number-'+rank);
  assert.equal(d.col,(rank-1)%4);
  assert.equal(d.row,Math.floor((rank-1)/4));
  locations.add(d.col+','+d.row);
  assert.match(art.face(c),/ph-raster-cell/);
  assert.doesNotMatch(art.face(c),/<svg/);
  assert.equal(art.face({...c,id:1}),art.face({...c,id:99}));
 }
 const acts=['reset','ghost','under','skip','burn','dump'];
 acts.forEach((action,index)=>{
  const d=art.cell({kind:'action',action});
  assert.equal(d.name,action);
  assert.equal(d.col,(index+10)%4);
  assert.equal(d.row,Math.floor((index+10)/4));
  assert.match(art.face({kind:'action',action}),/ph-raster-cell/);
  locations.add(d.col+','+d.row);
 });
 assert.equal(locations.size,16);
 assert.throws(()=>art.cell({kind:'number',rank:11}));
});
test('card back and tiny cards use actual image files',()=>{
 assert.match(art.back(),/assets\/stack-back\.webp/);
 assert.match(art.mini(null),/stack-back\.webp/);
 assert.match(art.mini({kind:'number',rank:2}),/ph-raster-cell/);
 assert.match(art.mini({kind:'action',action:'dump'}),/data-action="dump"/);
 assert.equal(art.assetMode,'raster-sheet');
 assert.equal(art.rules.dump,vector.rules.dump);
 assert.match(art.rules.dump,/CHOOSE A RIVAL/);
});
test('published raster files are valid WebP images',()=>{
 for(const name of ['stack-sheet.webp','stack-back.webp']){
  const bytes=fs.readFileSync(path.join(base,'dist/pilehead/assets',name));
  assert.ok(bytes.length>10000);
  assert.equal(bytes.subarray(0,4).toString(),'RIFF');
  assert.equal(bytes.subarray(8,12).toString(),'WEBP');
 }
});
test('approved 4×4 corner-index artwork remains the simulator source',()=>{
 // This digest intentionally identifies the approved illustrated sheet, not the
 // earlier generic STACK art. Update it when a new deck is deliberately approved.
 const approved=fs.readFileSync(path.join(base,'dist/pilehead/assets/stack-sheet.webp'));
 const digest=crypto.createHash('sha256').update(approved).digest('hex');
 assert.equal(digest,'145d5b9fe348359a6be0b8d49749ac59991dfd0f3897b61a706c273b8ca5a8a6');
 assert.deepEqual([art.cell({kind:'number',rank:1}).col,art.cell({kind:'number',rank:1}).row],[0,0]);
 assert.deepEqual([art.cell({kind:'number',rank:10}).col,art.cell({kind:'number',rank:10}).row],[1,2]);
 assert.deepEqual([art.cell({kind:'action',action:'dump'}).col,art.cell({kind:'action',action:'dump'}).row],[3,3]);
});
test('every display surface selects the raster art after compatibility module',()=>{
 for(const page of ['gallery.html','print.html']){
  const html=read('dist/pilehead/'+page);
  assert.ok(html.indexOf('src="deck-art.js"')<html.indexOf('src="deck-raster.js"'));
  assert.ok(html.indexOf('href="deck-art.css"')<html.indexOf('href="deck-raster.css"'));
 }
 const css=read('dist/pilehead/deck-raster.css');
 assert.match(css,/background-size:400% 400%/);
 assert.match(css,/assets\/stack-sheet\.webp/);
 assert.match(css,/print-color-adjust:exact/);
});
test('Vercel includes raster scripts, styles and original binary assets',()=>{
 const script='scripts/build-vercel.mjs',text=read(script);
 for(const name of ['deck-raster.js','deck-raster.css','stack-sheet.webp','stack-back.webp'])
  assert.ok(text.includes(name),script+' must include '+name);
});
test('RC3 card and packaging artwork matches the review release',()=>{
 const assets=[
  ["dist/pilehead/assets/stack-characters.webp","4d739a521736a4636aeb32d0055fab7c2d417742b85da92a4bbd43a34523b1fe"],
  ["dist/pilehead/assets/stack-characters-v2.webp","3e135d338857081ac6506fabbc49aacd0797f60979181902605cdc94a4a9616d"],
  ["apps/web/public/stack-media/stack-home-faces-v2.webp","3e135d338857081ac6506fabbc49aacd0797f60979181902605cdc94a4a9616d"],
  ["apps/web/public/stack-media/stack-home-faces-web-desktop.webp","3fa7be9373dc62883bb35bd8d2bbaf5b84cf8137882ade6f2b979ffbeebeb1bb"],
  ["apps/web/public/stack-media/stack-home-faces-web-mobile.webp","0715bdab240698123cb882a9321207ee17915ecc5659597d6ade3ba2ed94e500"],
  ["dist/pilehead/assets/stack-back.webp","6cda1999f30cc205cf7b4679b7f0e4467131cef74382ffaa53d2ee4c3dae888a"],
  ["dist/pilehead/assets/stack-back-v2.webp","d4e383786bab607d04472e8a5c05a01953b674c59e29dadcd649c14099fbda79"],
  ["apps/web/public/stack-media/stack-home-back-web.webp","016e9301d892b788a1308a5b5e7ae87af7b15831601b94db7ecbfb1173898157"],
  ["apps/web/public/stack-media/stack-home-back-v2.webp","6cda1999f30cc205cf7b4679b7f0e4467131cef74382ffaa53d2ee4c3dae888a"],
  ["apps/web/public/stack-media/stack-home-box-web.webp","3ffff49708bda55de5a1c1b0ada9a824f96b953b2282c83a81025b213ded93fb"],
  ["apps/web/public/stack-media/stack-home-box-v2.webp","91335b1e72476ef43730df8aab9e2796c5c6318f3bbf346ddc6367fcdaef50bf"],
  ["apps/web/public/stack-media/stack-home-box-side-v2.webp","79ac8205686a6aea1a925353976266bda77217838fdfb6939387df1825d2eb4f"],
  ["apps/web/public/stack-media/stack-home-box-top-v2.webp","fa635c36457cce77f68972e8a76afc7dad795476970809c5f348bae98e817e18"]
 ];
 for(const [name,sha] of assets){
  const bytes=fs.readFileSync(path.join(base,name));
  assert.equal(bytes.subarray(8,12).toString(),'WEBP',name);
  assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),sha,name);
 }
 for(const p of ['apps/web/app/globals.css','apps/web/app/official-home.module.css','apps/web/public/stack-media/stack-design-system.css','dist/pilehead/deck-raster.css'])
  assert.match(read(p),/production-rc3/,p+' cache version');
});
console.log('STACK raster assets: '+count+' checks passed');
