'use strict';
const assert=require('node:assert/strict');
const {computeHandLayout}=require('../apps/web/lib/hand-layout-core.cjs');
const px=n=>Number.parseFloat(n);
for(const width of [0,220,280,304,340,390,519.9,520,760,1200]){
 for(const cardWidth of [0,51,58,77,85]){
  for(let n=0;n<=54;n++){
   const r=computeHandLayout(n,{width,cardWidth});
   const card=cardWidth||58,available=Math.max(card,width||300);
   assert.ok(Number.isInteger(r.handColumns)&&r.handColumns>=1);
   assert.equal(r.handRows,n?Math.ceil(n/r.handColumns):0);
   assert.ok(r.handColumns<=Math.max(1,n));
   assert.ok(px(r.handLayout.width)<=available+1e-8,'grid fits available width');
   assert.ok(px(r.handLayout.width)>=card&&px(r.handLayout.height)>=card*355/252-1e-8);
   assert.ok(r.lastRowShift>=0&&r.lastRowShift<=available/2);
   if(r.handRows<=1||n%r.handColumns===0)assert.equal(r.lastRowShift,0);
   else {
    const step=Number(r.handLayout.gridTemplateColumns.match(/, ([\d.]+)px/)[1]);
    assert.ok(Math.abs(r.lastRowShift-(r.handColumns-n%r.handColumns)*step/2)<1e-8);
   }
  }
 }
}
assert.deepEqual(computeHandLayout(3,{width:300,cardWidth:58}),{
 handColumns:3,handRows:1,lastRowShift:0,
 handLayout:{gridTemplateColumns:'repeat(3, 61px)',gridAutoRows:'52px',width:'180px',height:(58*355/252)+'px'}
});
console.log('PASS adaptive hand geometry across 2,750 count/viewport/card-width fixtures');
