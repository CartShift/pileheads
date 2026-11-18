'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..'),read=x=>fs.readFileSync(path.join(root,x),'utf8');
const engine=require('../dist/pilehead/engine.js');
const artCode=read('dist/pilehead/deck-art.js'),css=read('dist/pilehead/deck-art.css');
const index=read('dist/pilehead/index.html'),gallery=read('dist/pilehead/gallery.html'),print=read('dist/pilehead/print.html');
const local=read('dist/pilehead/app.js'),online=read('dist/pilehead/online.js'),fx=read('dist/pilehead/immersive.js');
const sites=read('scripts/build.mjs'),vercel=read('scripts/build-vercel.mjs');
const sandbox={};new vm.Script(artCode,{filename:'deck-art.js'}).runInNewContext(sandbox);
const A=sandbox.PileheadCardArt;
let count=0;function check(label,fn){fn();count++;console.log('PASS '+label)}
check('deck art exports all expected functions',()=>{
 for(const k of ['face','back','mini','rules','glyph'])assert.ok(A[k],k);
});
check('engine still has 52 cards and no powers on numbered tens',()=>{
 const deck=engine.deck();
 assert.equal(deck.length,52);
 assert.equal(deck.filter(c=>c.kind==='number').length,40);
 for(let n=1;n<=10;n++)assert.equal(deck.filter(c=>c.rank===n).length,4);
 for(const n of Object.values(engine.ACTIONS))assert.equal(n,2);
});
check('ten numbered cards use STACK paper layout and precisely matching structural layers',()=>{
 for(let n=1;n<=10;n++){
  const html=A.face({kind:'number',rank:n});
  assert.match(html,/ph-number-plate/);assert.match(html,/ph-number-main/);
  assert.match(html,/ph-index-top/);assert.match(html,/ph-index-bottom/);
  assert.match(html,/ph-stack-art/);assert.match(html,/ph-stack-illustration/);
  assert.match(html,/ph-number-corner/);assert.doesNotMatch(html,/data-action/);
  assert.equal((html.match(/data-slab="1"/g)||[]).length,n,'Rank '+n+' should visually have '+n+' layers');
  assert.equal(A.face({kind:'number',rank:n,id:100}),A.face({kind:'number',rank:n,id:999}),
    'all copies of the same numeric rank must be visually identical');
 }
 assert.throws(()=>A.face({kind:'number',rank:11}));
});
check('six special cards each have a large unique inline illustration and rule',()=>{
 const svg=new Set();
 for(const action of Object.keys(engine.ACTIONS)){
  const html=A.face({kind:'action',action});
  assert.match(html,/ph-action-plate/);assert.match(html,/ph-action-title/);
  assert.match(html,/ph-action-rule/);assert.match(html,/ph-illustration/);
  assert.ok(html.includes(action.toUpperCase()));
  assert.ok(A.rules[action]&&html.includes(A.rules[action]));
  assert.ok(html.includes('viewBox="0 0 160 142"'));
  assert.equal(A.face({kind:'action',action,id:12}),A.face({kind:'action',action,id:88}),
    'action copies must be visually identical');
  svg.add(html.match(/<svg class="ph-illustration"[\s\S]*?<\/svg>/)[0]);
 }
 assert.equal(svg.size,6);assert.throws(()=>A.face({kind:'action',action:'joker'}));
});
check('card back is universal and carries the STACK identity',()=>{
 assert.equal(A.back(),A.back());
 assert.match(A.back(),/ph-back-plate/);assert.match(A.back(),/ph-back-title/);
 assert.match(A.back(),/ph-back-stack/);assert.match(A.back(),/ph-back-frame/);
 assert.match(A.back(),/>STACK</);
});
check('opponent miniatures use normal ranks and action identities',()=>{
 assert.match(A.mini({kind:'number',rank:10}),/ph-mini-number/);
 assert.match(A.mini({kind:'action',action:'dump'}),/data-action="dump"/);
 assert.match(A.mini(null),/ph-mini-back/);
});
check('UI loads artwork once before local, multiplayer and presentation modules',()=>{
 assert.match(index,/href="deck-art\.css"/);
 assert.ok(index.indexOf('src="deck-art.js"')<index.indexOf('src="immersive.js"'));
 assert.ok(index.indexOf('src="deck-art.js"')<index.indexOf('src="app.js"'));
 assert.ok(index.indexOf('src="deck-art.js"')<index.indexOf('src="online.js"'));
});
check('both interactive controllers share graphics; no game rules modified',()=>{
 for(const code of [local,online]){
  assert.match(code,/PileheadCardArt/);
  assert.match(code,/A\.face\(c\)/);assert.match(code,/A\.back\(\)/);
  assert.match(code,/A\.mini/);
  assert.doesNotThrow(()=>new vm.Script(code));
 }
 assert.match(fx,/PileheadCardArt/);assert.doesNotThrow(()=>new vm.Script(fx));
});
check('print pages use the same artwork rather than legacy mock cards',()=>{
 assert.match(print,/deck-art\.css/);assert.match(print,/src="deck-art\.js"/);
 assert.match(print,/A\.face\(c\)/);assert.match(print,/A\.back\(\)/);
 assert.doesNotMatch(print,/FOUR BURN/);
 assert.match(print,/width:57mm;height:82mm/);
});
check('gallery includes ten numerical and six action designs plus one back',()=>{
 assert.match(gallery,/href="deck-art\.css"/);assert.match(gallery,/src="deck-art\.js"/);
 assert.match(gallery,/length:10/);assert.match(gallery,/Object\.keys\(E\.ACTIONS\)/);
 assert.match(gallery,/A\.face\(c\)/);assert.match(gallery,/A\.back\(\)/);
 assert.match(index,/href="gallery\.html"/);
});
check('Sites Worker and Vercel both include all new assets',()=>{
 for(const script of [sites,vercel])for(const name of ['deck-art.js','deck-art.css','gallery.html'])
  assert.ok(script.includes(name),name);
});
check('CSS supports printed illustration, readable small cards and responsive gallery',()=>{
 for(const k of ['ph-number-main','ph-stack-art','ph-action-art','ph-action-rule','ph-back-plate','ph-mini','@container','print-color-adjust'])
  assert.ok(css.includes(k),k);
 assert.match(css,/@media \(prefers-reduced-motion:reduce\)/);
 assert.match(gallery,/@media\(max-width:460px\)/);
 const clean=css.replace(/\/\*[\s\S]*?\*\//g,'');
 let depth=0,q=null,escaped=false;
 for(const c of clean){
  if(q){if(escaped){escaped=false;continue}if(c==='\\'){escaped=true;continue}if(c===q)q=null;continue}
  if(c==='"'||c==="'"){q=c;continue}
  if(c==='{')depth++;if(c==='}')depth--;assert.ok(depth>=0);
 }
 assert.equal(depth,0);assert.equal(q,null);
});
check('action labels accurately document the game instead of suggesting other effects',()=>{
 const rules=A.rules;
 assert.equal(rules.reset,'ANY NUMBER NEXT');
 assert.equal(rules.ghost,'KEEP THE LIMIT');
 assert.equal(rules.under,'NEXT NUMBER 1–4');
 assert.equal(rules.skip,'SKIP NEXT PLAYER');
 assert.match(rules.burn,/CLEAR PILE/);assert.match(rules.burn,/PLAY AGAIN/);
 assert.match(rules.dump,/CHOOSE A RIVAL/);assert.match(rules.dump,/PLAY AGAIN/);
 assert.doesNotMatch(rules.dump,/NEXT PLAYER/);
 const all=new Set(Object.keys(engine.ACTIONS).map(action=>A.art(action)));
 assert.equal(all.size,6,'Every special action needs its own distinct illustration');
 assert.match(A.art('under'),/>1–4</,'UNDER explicitly shows the allowed numbers');
});
check('STACK is the visible identity while keeping legacy URLs and logic',()=>{
 assert.match(index,/STACK \| The Card Game/);
 assert.match(gallery,/STACK \/ DECK LAB/);
 assert.match(print,/<h1>STACK<\/h1>/);
 assert.match(css,/#f6f0e3/i);
});
check('approved infographic rank palettes, colored corners and 3D geometry',()=>{
 const corners=['#D44630','#16658D','#EDB632','#7B813E','#D44630',
  '#7B813E','#16658D','#EDB632','#16658D','#EDB632'];
 for(let n=1;n<=10;n++){
  const face=A.face({kind:'number',rank:n});
  assert.ok(face.includes('data-rank="'+n+'"'),'rank should have a stable graphic identity');
  assert.ok(face.includes('--rank-accent:'+corners[n-1]),'rank '+n+' reference corner');
  assert.match(face,/ph-number-corner-bottom/);
  assert.match(face,/ph-stack-illustration/);
  assert.match(face,/ph-slab/);
 }
 assert.match(artCode,/rankPalettes=Object\.freeze/);
 assert.match(css,/reference v2/);
});
check('phone setup is unclipped without changing the fan in active play',()=>{
 assert.match(css,/\.setup \.card-row\.hand/);
 assert.match(css,/\.online-lobby \.card-row\.hand/);
 assert.match(css,/overflow:visible/);
 assert.match(css,/\.card-row\.hand:has/);
 assert.match(css,/@media print/);
});

console.log('STACK illustrated deck: '+count+' test groups passed');
