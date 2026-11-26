'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..'),read=x=>fs.readFileSync(path.join(root,x),'utf8');
const engine=require('../dist/pilehead/engine.js');
const artCode=read('dist/pilehead/deck-art.js'),css=read('dist/pilehead/deck-art.css');
const gallery=read('dist/pilehead/gallery.html'),print=read('dist/pilehead/print.html');
const fx=read('dist/pilehead/immersive.js');
const vercel=read('scripts/build-vercel.mjs');
const sandbox={};new vm.Script(artCode,{filename:'deck-art.js'}).runInNewContext(sandbox);
const A=sandbox.PileheadCardArt;
let count=0;function check(label,fn){fn();count++;console.log('PASS '+label)}
check('deck art exports all expected functions',()=>{
 for(const k of ['face','back','mini','rules','glyph'])assert.ok(A[k],k);
});
check('engine has 54 cards and no powers on numbered tens',()=>{
 const deck=engine.deck();
 assert.equal(deck.length,54);
 assert.equal(deck.filter(c=>c.kind==='number').length,40);
 for(let n=1;n<=10;n++)assert.equal(deck.filter(c=>c.rank===n).length,4);
 for(const [action,n] of Object.entries(engine.ACTIONS))assert.equal(n,action==='burn'?4:2);
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
  svg.add(A.art(action)); // Authoritative SVG; face nests a scaled, class-isolated copy.
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
check('shared lab presentation can parse and use the art module',()=>{
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
});
check('Vercel includes shared deck assets',()=>{
 for(const name of ['deck-art.js','deck-art.css','gallery.html'])assert.ok(vercel.includes(name),name);
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
 assert.match(gallery,/EVERY CARD<br>HAS A ROLE/);assert.match(gallery,/stack-home-logo-web\.webp/);
 assert.match(print,/<h1>PRINT THE DECK\.<\/h1>/);assert.match(print,/stack-home-logo-web\.webp/);
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


check('STACK v3 renders each card as one self-scaling SVG surface',()=>{
 for(const n of [1,2,5,9,10]){
  const face=A.face({kind:'number',rank:n});
  assert.match(face,/ph-composed-plate/);
  assert.match(face,/ph-composed-face/);
  assert.match(face,/viewBox="0 0 240 344"/);
  assert.match(face,/ph-number-main-vector/);
  assert.match(face,/ph-stack-illustration-vector/);
  assert.ok(face.indexOf('ph-stack-illustration-vector')>face.indexOf('ph-number-main-vector'));
  assert.equal((face.match(/ph-composed-face/g)||[]).length,1);
 }
 for(const action of Object.keys(engine.ACTIONS)){
  const face=A.face({kind:'action',action});
  assert.match(face,/ph-composed-face/);
  assert.match(face,/ph-action-title-vector/);
  assert.match(face,/ph-illustration-vector/);
  assert.match(face,/ph-action-compact-rule/);
  assert.ok(face.includes(A.rules[action]),'full text rule exists for '+action);
 }
 assert.match(A.back(),/ph-composed-face/);
 assert.match(A.back(),/ph-back-stack-vector/);
 assert.match(css,/STACK v3 · atomic artwork/);
 assert.match(css,/\.ph-card \.ph-composed-face\{/);
 assert.match(css,/@container \(max-width:76px\)/);
 assert.match(css,/\.ph-action-long-rule\{display:none\}/);
 assert.doesNotMatch(css,/\.ph-card \.ph-composed-face\{[^}]*transform:scale/);
});
check('STACK v3 rank geometry stays inside the source coordinates',()=>{
 for(let n=1;n<=10;n++){
  const art=A.numberArt(n);
  assert.equal((art.match(/data-slab="1"/g)||[]).length,n);
  assert.doesNotMatch(art,/\b(?:NaN|undefined|Infinity)\b/);
  assert.match(art,/viewBox="0 0 160 142"/);
 }
 const dump=A.face({kind:'action',action:'dump'});
 assert.match(dump,/CHOOSE A RIVAL/);
 assert.doesNotMatch(dump,/NEXT PLAYER/);
});

console.log('STACK illustrated deck: '+count+' test groups passed');
