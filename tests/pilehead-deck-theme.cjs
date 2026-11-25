'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.join(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const css=read('dist/pilehead/deck-raster.css');
const themeCss=read('dist/pilehead/deck-theme.css');
const selector=read('dist/pilehead/deck-theme.js');
const raster=read('dist/pilehead/deck-raster.js');
const vector=read('dist/pilehead/deck-art.js');
const themes=['refined','geometry','characters','studio'];
let tests=0;
function check(label,fn){fn();tests++;console.log('PASS '+label)}
function sandbox(stored='geometry'){
 const values=new Map([['stack-deck-theme-v1',stored]]);
 const handlers={};
 const document={
  documentElement:{dataset:{}},
  readyState:'loading',
  querySelectorAll:()=>[],
  addEventListener:(type,callback)=>{handlers['doc:'+type]=callback},
 };
 const scope={
  document,localStorage:{
   getItem:key=>values.get(key)||null,
   setItem:(key,value)=>values.set(key,value)
  },
  addEventListener:(type,callback)=>{handlers[type]=callback},
  dispatchEvent:event=>handlers[event.type]?.(event),
  Event:class{constructor(type){this.type=type}},
 };
 vm.runInNewContext(vector,scope);
 vm.runInNewContext(raster,scope);
 vm.runInNewContext(selector,scope);
 return {scope,document,values,handlers,art:scope.PileheadCardArt,theme:scope.StackDeckThemes};
}
check('all 4 themes are discoverable and saved independently of game state',()=>{
 const {theme,values,document}=sandbox();
 assert.equal(theme.get(),'geometry');
 assert.deepEqual(Array.from(theme.options,x=>x.id),themes);
 assert.equal(theme.set('characters'),'characters');
 assert.equal(theme.get(),'characters');
 assert.equal(values.get('stack-deck-theme-v1'),'characters');
 assert.equal(document.documentElement.dataset.stackDeckTheme,'characters');
 assert.equal(theme.set('unsupported'),'refined');
 assert.equal(theme.get(),'refined');
});
check('a new page loads the persisted choice and responds to storage changes',()=>{
 const {theme,handlers}=sandbox('characters');
 assert.equal(theme.get(),'characters');
 handlers.storage({key:'stack-deck-theme-v1',newValue:'studio'});
 assert.equal(theme.get(),'studio');
});
check('themes do not change the deterministic mapping of any deck face',()=>{
 const {art,theme}=sandbox();
 const positions=new Set();
 for(let n=1;n<=10;n++){
  const card={kind:'number',rank:n};const cell=art.cell(card);
  assert.equal(cell.name,'number-'+n);
  assert.equal(cell.col,(n-1)%4);
  assert.equal(cell.row,Math.floor((n-1)/4));
  positions.add(cell.col+':'+cell.row);
  for(const id of ['refined','geometry','characters']){
   theme.set(id);
   assert.match(art.face(card),/ph-raster-cell/);
  }
  theme.set('studio');assert.match(art.face(card),/ph-composed-face/);
 }
 const actions=['reset','ghost','under','skip','burn','dump'];
 for(let i=0;i<actions.length;i++){
  const card={kind:'action',action:actions[i]};
  const cell=art.cell(card);assert.equal(cell.col,(i+10)%4);
  assert.equal(cell.row,Math.floor((i+10)/4));
  positions.add(cell.col+':'+cell.row);
  for(const id of ['refined','geometry','characters']){
   theme.set(id);assert.match(art.face(card),/ph-raster-cell/);
  }
  theme.set('studio');assert.match(art.face(card),/ph-composed-face/);
 }
 assert.equal(positions.size,16);
});
check('legacy themes keep their back while refined has its own artwork',()=>{
 const {art,theme}=sandbox('characters');
 const back=art.back();
 assert.match(back,/stack-back\.webp/);
 theme.set('geometry');assert.equal(art.back(),back);
 theme.set('studio');assert.equal(art.back(),back);
 theme.set('refined');assert.match(art.back(),/stack-back-v2\.webp/);
 assert.match(css,/data-stack-deck-theme="refined"/);
 assert.match(css,/data-stack-deck-theme="characters"/);
 assert.match(css,/stack-characters\.webp/);
 assert.match(css,/background-size:400% 400%,400% 400%/);
});
check('character sprite is an exact 4×4 grid with one physical ratio per card',()=>{
 const b=fs.readFileSync(path.join(root,'dist/pilehead/assets/stack-characters.webp'));
 assert.equal(b.toString('ascii',0,4),'RIFF');
 assert.equal(b.toString('ascii',8,12),'WEBP');
 const vp8=b.indexOf(Buffer.from([0x9d,0x01,0x2a]));
 assert.ok(vp8>=0,'expected a decodable VP8 frame header');
 const width=b.readUInt16LE(vp8+3)&0x3fff;
 const height=b.readUInt16LE(vp8+5)&0x3fff;
 assert.deepEqual([width,height],[1008,1420]);
 assert.equal(width/4,252);assert.equal(height/4,355);
 assert.ok(b.length>30000,'character sheet must not be empty');
});
check('tabletop, gallery and print all load theme code and styling',()=>{
 for(const p of ['index.html','gallery.html','print.html']){
  const html=read('dist/pilehead/'+p);
  assert.ok(html.indexOf('deck-raster.js')<html.indexOf('deck-theme.js'),p+' renderer order');
  assert.match(html,/deck-theme\.css/);
  assert.match(html,/deck-theme\.js/);
 }
 assert.match(read('dist/pilehead/app.js'),/stack-deck-theme-change/);
 assert.match(read('dist/pilehead/online.js'),/stack-deck-theme-change/);
 assert.match(read('dist/pilehead/gallery.html'),/stack-deck-theme-change/);
 assert.match(read('dist/pilehead/print.html'),/stack-deck-theme-change/);
});
check('published build includes both old and new raster artwork',()=>{
 const s=read('scripts/build-vercel.mjs');
 for(const file of ['deck-theme.js','deck-theme.css','stack-characters.webp','stack-sheet.webp','stack-back.webp'])
  assert.ok(s.includes(file),'missing '+file);
 assert.match(selector,/localStorage/);
 assert.match(themeCss,/:focus-visible/);
 assert.match(themeCss,/@media print/);
});
console.log('STACK deck themes: '+tests+' checks passed');
