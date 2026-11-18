'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const css=read('dist/pilehead/stack-brand.css');
const html=read('dist/pilehead/index.html');
const local=read('dist/pilehead/app.js');
const online=read('dist/pilehead/online.js');
const raster=read('dist/pilehead/deck-raster.js');
const rasterCss=read('dist/pilehead/deck-raster.css');
const vercel=read('scripts/build-vercel.mjs');
let checks=0;
function check(message,fn){fn();checks++;console.log('PASS '+message)}
check('brand styling loads last, after the illustrated deck',()=>{
 assert.ok(html.indexOf('href="stack-brand.css"')>html.indexOf('href="deck-raster.css"'));
 assert.ok(html.indexOf('href="stack-brand.css"')<html.indexOf('</head>'));
 assert.match(vercel,/['"]stack-brand\.css['"]/);
});
check('STACK identity is consistent across setup and room lobby',()=>{
 assert.match(html,/ONE PILE · ONE LOSER/);
 assert.match(local,/STACK \/ THE CARD GAME/);
 assert.match(local,/ONE PILE\. ONE LOSER\./);
 assert.match(online,/STACK \/ PLAY TOGETHER/);
 assert.match(online,/STACK \/ PRIVATE TABLE/);
 assert.doesNotMatch(online,/PILEHEAD · REAL PLAYERS/);
});
check('all game surfaces share a restricted, intentional STACK palette',()=>{
 for(const hex of ['#f1e5ce','#1b211f','#175b73','#d54b32','#e6b343','#78823f','#16483d'])
  assert.ok(css.includes(hex),'Missing '+hex);
 for(const selector of ['.setup.panel','.pilehead-table-hud','.table .opponent.current','.stack[data-play-target]',
   '.table .hand-area','.toolbar.table-actions','.online-room-tools','.online-lobby .lobby-seat'])
  assert.ok(css.includes(selector),'Missing surface '+selector);
});
check('mobile uses the same accessible navigation menu even before a game starts',()=>{
 assert.match(css,/body \.layout>\.top \.table-menu-toggle\{/);
 assert.match(css,/body \.layout>\.top \.links\.is-open/);
 assert.match(css,/min-height:43px/);
 assert.match(css,/@media\(max-width:700px\)/);
 assert.match(css,/@media\(max-width:380px\)/);
});
check('raster card art and multiplayer game flow are untouched',()=>{
 assert.match(raster,/assetMode:'raster-sheet'/);
 assert.match(rasterCss,/stack-sheet\.webp/);
 assert.match(online,/data-do="create"/);
 assert.match(online,/data-do="ready"/);
 assert.match(local,/data-do="play"/);
 assert.match(css,/No SVG\/CSS card illustrations/);
});
check('styles respect focus, motion settings, and mobile action reachability',()=>{
 assert.match(css,/:focus-visible/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
 assert.match(css,/env\(safe-area-inset-bottom\)/);
 assert.match(css,/position:sticky/);
 assert.match(css,/pointer:coarse/);
});
check('CSS braces and strings balance',()=>{
 const clean=css.replace(/\/\*[\s\S]*?\*\//g,'');
 let depth=0,quote='',escape=false;
 for(const ch of clean){
  if(quote){if(escape){escape=false;continue}if(ch==='\\'){escape=true;continue}if(ch===quote)quote='';continue}
  if(ch==='"'||ch==="'"){quote=ch;continue}
  if(ch==='{')depth++;
  if(ch==='}')depth--;
  assert.ok(depth>=0);
 }
 assert.equal(depth,0);assert.equal(quote,'');
});
console.log('STACK simulator brand checks: '+checks+' passed');
