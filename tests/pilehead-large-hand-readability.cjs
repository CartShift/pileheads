'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const read=file=>fs.readFileSync(path.join(__dirname,'..',file),'utf8');
const fxCode=read('dist/pilehead/immersive.js');
const local=read('dist/pilehead/app.js'),online=read('dist/pilehead/online.js');
const css=read('dist/pilehead/stack-brand.css');
const sandbox={
 window:{addEventListener(){}},localStorage:{getItem(){return null}},
 document:{addEventListener(){},querySelector(){return null}},matchMedia:()=>({matches:false}),
 setTimeout(){return 1},clearTimeout(){},
};
sandbox.globalThis=sandbox;
vm.runInNewContext(fxCode,sandbox,{filename:'immersive.js'});
const handLayout=sandbox.window.PileheadTableFX.handLayout;
let checks=0;function check(name,fn){fn();checks++;console.log('PASS '+name)}
check('dense 13-card mobile hand reserves at least 38px of each face',()=>{
 const x=handLayout(13,350,72,true);
 const step=72+x.overlap;
 assert.ok(step>=38,'exposed step '+step+' too narrow for a card index');
 assert.equal(x.fits,false,'large hand must scroll instead of concealing rank text');
 assert.ok(x.span>350);
});
check('small mobile hands still fit naturally',()=>{
 const x=handLayout(3,350,72,true);
 assert.equal(x.fits,true);
 assert.ok(x.span<=350);
});
check('large hands retain readable spacing even on narrow phones',()=>{
 for(const n of [8,9,13,20,40]){
  const x=handLayout(n,320,68,true);
  assert.ok(68+x.overlap>=38,'unreadable index at '+n+' cards');
  assert.ok(x.span>0);
 }
});
check('desktop hand preserves minimum readable index width',()=>{
 const x=handLayout(20,780,106,false);
 assert.ok(106+x.overlap>=44);
});
check('fan uses correct overlap layer order and stabilizes dense cards',()=>{
 assert.match(fxCode,/row\.classList\.toggle\('hand-dense',dense\)/);
 assert.match(fxCode,/const dense=n>=8;/);
 assert.match(fxCode,/--fan-z',String\(i\+1\)/);
 assert.match(fxCode,/const spread=dense\?0:/);
});
check('the card artwork supplies the value instead of an extra corner badge',()=>{
 for(const script of [local,online]){
  assert.ok(!script.includes('ph-hand-index'));
  assert.ok(!script.includes('handIndex('));
  assert.ok(script.includes("+A.face(c)+'</button>'"));
  assert.match(script,/aria-label=/);
 }
});
check('dense hands retain readable card faces and swipe affordance without badge styles',()=>{
 assert.ok(!css.includes('ph-hand-index'));
 assert.match(css,/card-row\\.hand\\.hand-dense/);
 assert.doesNotMatch(css,/touch-action:pan-x/);
 assert.match(css,/SWIPE/);
});
console.log('STACK large-hand readability: '+checks+' checks passed');
