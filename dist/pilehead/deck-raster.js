/* PILEHEADS image-first renderer.
 * The 16 illustrated card faces are actual raster art from one 4×4 sheet.
 * Runtime only chooses a crop. The rules engine is never consulted by this layer.
 */
(function(root){'use strict';
const prior=root.PileheadCardArt;
if(!prior)throw Error('Load deck-art.js before deck-raster.js');
const actions=['reset','ghost','under','skip','burn','dump'];
function cell(c){
 if(!c||typeof c!=='object')throw Error('card required');
 if(c.kind==='number'){
  const n=Number(c.rank);
  if(!Number.isInteger(n)||n<1||n>10)throw Error('invalid rank');
  const idx=n-1;return {name:'number-'+n,col:idx%4,row:Math.floor(idx/4)};
 }
 const n=actions.indexOf(c.action);
 if(c.kind!=='action'||n<0)throw Error('invalid action');
 const idx=10+n;return {name:c.action,col:idx%4,row:Math.floor(idx/4)};
}
const pos=['0%','33.333333%','66.666667%','100%'];
function sprite(c){
 const slot=cell(c);
 return '<span class="ph-raster-cell" data-card-art="'+slot.name+'" style="--stack-x:'+pos[slot.col]+';--stack-y:'+pos[slot.row]+'"></span>';
}
function face(c){return root.StackDeckThemes?.get?.()==='studio'?prior.face(c):'<span class="ph-plate ph-raster-plate" aria-hidden="true">'+sprite(c)+'</span>';}
function backSrc(){return root.StackDeckThemes?.get?.()==='refined'?'assets/stack-back-v2.webp':'assets/stack-back.webp';}
function back(){
 return '<span class="ph-plate ph-raster-plate ph-back-raster" aria-hidden="true"><img class="ph-raster-back" src="'+backSrc()+'" alt="" draggable="false" decoding="async"></span>';
}
function mini(c){
 if(c&&root.StackDeckThemes?.get?.()==='studio')return prior.mini(c);
 const label=!c?'Face down':c.kind==='number'?'Number '+c.rank:String(c.action).toUpperCase();
 return '<span class="mini ph-mini ph-raster-mini'+(!c?' back ph-mini-back':'')+'"'+
   (c?.kind==='action'?' data-action="'+c.action+'"':'')+
   ' aria-label="'+label+'" title="'+label+'">'+
   (!c?'<img class="ph-raster-back" src="'+backSrc()+'" alt="" draggable="false">':sprite(c))+
   '</span>';
}
root.PileheadCardArt=Object.freeze({
 ...prior,face,back,mini,cell,assetMode:'raster-sheet'
});
})(typeof window!=='undefined'?window:globalThis);