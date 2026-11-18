/* STACK · one authoritative vector deck for simulator, online rooms, gallery and print.
 * Illustration is presentation-only: numeric cards have NO powers.
 * No card ID, game engine state or rules depend on these drawings.
 */
(function(root){'use strict';
const C=Object.freeze({
 ink:'#18191A',cream:'#F6F0E3',red:'#D44630',blue:'#16658D',amber:'#EDB632',
 olive:'#7B813E',paper:'#FFFBF2',pale:'#D5CBB5'
});
const rules=Object.freeze({
 reset:'ANY NUMBER NEXT',
 ghost:'KEEP THE LIMIT',
 under:'NEXT NUMBER 1–4',
 skip:'SKIP NEXT PLAYER',
 burn:'CLEAR PILE · PLAY AGAIN',
 dump:'CHOOSE A RIVAL · TAKE PILE · PLAY AGAIN'
});
const glyph=Object.freeze({reset:'↶',ghost:'□',under:'↓4',skip:'↷',burn:'✦',dump:'↗'});
const actions=Object.freeze(['reset','ghost','under','skip','burn','dump']);
const svgStart='<svg class="ph-illustration" viewBox="0 0 160 142" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">';
const numberStart='<svg class="ph-stack-illustration" viewBox="0 0 160 142" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">';
const palette=[C.blue,C.red,C.amber,C.olive,C.ink];
const topPalette=['#4391B8','#F17960','#F7D367','#A5AB63','#535454'];
const sidePalette=['#10455F','#A43125','#C6911D','#575D2B','#101112'];
/* All illustration geometry is expressed in SVG units and shared by screen/print.
 * Fixed rank recipes mirror the approved STACK overview. Every numbered card is
 * ordinary in the rules; the height, color and count only communicate its rank.
 */
const rankPalettes=Object.freeze({
 1:[0],2:[1,0],3:[2,0,1],4:[3,2,0,1],5:[1,3,2,0,4],
 6:[0,2,1,3,0,4],7:[2,0,3,1,0,2,4],
 8:[1,0,2,3,1,0,2,4],9:[0,2,1,3,0,2,1,3,4],
 10:[3,0,2,1,0,3,2,1,0,4]
});
const rankCorners=Object.freeze([
 C.red,C.blue,C.amber,C.olive,C.red,C.olive,C.blue,C.amber,C.blue,C.amber
]);
function slab(x,y,width,colorIndex,height=12){
 const c=palette[colorIndex%5],light=topPalette[colorIndex%5],dark=sidePalette[colorIndex%5];
 const depth=8,tip=5, x2=x+width;
 return '<g class="ph-slab" data-slab="1">'+
  '<path d="M'+x+' '+y+'l'+depth+' -'+tip+'h'+width+'l-'+depth+' '+tip+'Z" fill="'+light+'"/>'+
  '<path d="M'+x+' '+y+'h'+width+'v'+height+'h-'+width+'Z" fill="'+c+'"/>'+
  '<path d="M'+x2+' '+y+'l'+depth+' -'+tip+'v'+height+'l-'+depth+' '+tip+'Z" fill="'+dark+'"/>'+
  '<path d="M'+x+' '+(y+height-1.8)+'h'+width+'" stroke="'+dark+'" stroke-opacity=".35" stroke-width="1.8"/>'+
 '</g>';
}
function numberArt(n){
 if(!Number.isInteger(n)||n<1||n>10)throw Error('invalid rank');
 const recipe=rankPalettes[n], step=n<=2?26:n<=4?20:n<=6?17:n<=8?14:12;
 const thickness=n<=2?20:n<=4?16:n<=6?13:n<=8?11:9.5;
 let art='';
 // Draw bottom to top to make the staggered paper slabs read as a real stack.
 for(let i=n-1;i>=0;i--){
  const offset=[0,5,-4,3,-2,7,-3,2,-1,4][i];
  const width=n<=3?112:n<=6?117:119;
  const x=17+offset;
  const baseline=n<=2?116:n<=4?121:126;
  const y=baseline-(n-1-i)*step;
  art+=slab(x,y,width,recipe[i],thickness);
 }
 const tally=n===1?'<path d="M12 79h27M12 87h27M12 95h27M12 103h27" stroke="'+C.ink+'" stroke-width="2.3"/>':'';
 return numberStart+
  '<ellipse cx="82" cy="136" rx="64" ry="4" fill="#3D3023" opacity=".13"/>'+
  tally+art+'</svg>';
}
function actionArt(action){
 switch(action){
 case 'reset':
  return svgStart+
   slab(28,115,105,4,13)+slab(30,100,102,1,13)+slab(37,85,90,0,12)+
   '<path d="M117 85C145 24 62 15 46 56" fill="none" stroke="'+C.red+'" stroke-width="15" stroke-linecap="square"/>'+
   '<path d="M24 52l28 -26 10 38Z" fill="'+C.red+'"/>'+
   '<path d="M49 76h68" stroke="'+C.ink+'" stroke-opacity=".14" stroke-width="3"/>'+
   '</svg>';
 case 'ghost':
  return svgStart+
   slab(24,115,112,4,13)+
   '<path d="M34 109l13 -53h81l-14 53Z" fill="#AAC6D8" fill-opacity=".46" stroke="'+C.blue+'" stroke-width="2.3"/>'+
   '<path d="M50 91l14 -52h76l-14 52Z" fill="#C6DDE7" fill-opacity=".37" stroke="'+C.blue+'" stroke-width="2.3"/>'+
   '<path d="M68 73l13 -51h65l-13 51Z" fill="#E1ECED" fill-opacity=".32" stroke="'+C.blue+'" stroke-width="2.3"/>'+
   '<path d="M22 132h115" stroke="'+C.ink+'" stroke-width="4" opacity=".14"/>'+
   '</svg>';
 case 'under':
  return svgStart+
   '<path d="M80 15v57" stroke="'+C.ink+'" stroke-width="17" stroke-linecap="square"/>'+
   '<path d="M53 61l27 30 27 -30Z" fill="'+C.ink+'"/>'+
   '<path d="M29 88v38M131 88v38" stroke="'+C.ink+'" stroke-width="12"/>'+
   slab(46,102,68,1,12)+
   '<path d="M25 122h110v19H25Z" fill="'+C.blue+'"/>'+
   '<text x="80" y="137" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-size="20" font-style="italic" font-weight="900" fill="'+C.paper+'">1–4</text>'+
   '</svg>';
 case 'skip':
  return svgStart+
   '<path d="M26 76C34 18 118 17 131 75" fill="none" stroke="'+C.red+'" stroke-width="12" stroke-linecap="butt"/>'+
   '<path d="M109 57l24 26 14 -31Z" fill="'+C.red+'"/>'+
   '<circle cx="29" cy="110" r="13" fill="'+C.ink+'"/><circle cx="81" cy="110" r="13" fill="#96938E"/><circle cx="132" cy="110" r="13" fill="'+C.ink+'"/>'+
   '<path d="M10 140q0-17 19-17t19 17M62 140q0-17 19-17t19 17M113 140q0-17 19-17t19 17" fill="'+C.ink+'"/>'+
   '<path d="M62 140q0-17 19-17t19 17" fill="#96938E"/>'+
   '</svg>';
 case 'burn':
  return svgStart+
   '<path d="M19 129h122v11H19z" fill="'+C.ink+'"/>'+
   '<path d="M75 93l-20 -50 18 -14 27 50Z" fill="'+C.red+'"/>'+
   '<path d="M89 94l22 -63 18 12-18 62Z" fill="'+C.red+'"/>'+
   '<path d="M57 100L15 66l13 -20 42 33Z" fill="'+C.red+'"/>'+
   '<path d="M101 109l35-39 15 17-34 39Z" fill="'+C.red+'"/>'+
   '<path d="M50 119l-31 -7 8 -19 34 10Z" fill="'+C.amber+'"/>'+
   '<path d="M66 124l-23 -23 17 -16 24 24Z" fill="'+C.olive+'"/>'+
   '<path d="M93 125l-2 -32 22 1 4 29Z" fill="'+C.amber+'"/>'+
   '<path d="M70 24l-12-18M127 20l7-14M13 26L7 16" stroke="'+C.ink+'" stroke-width="3.3"/>'+
   '</svg>';
 case 'dump':
  return svgStart+
   slab(15,65,66,3,11)+slab(18,52,68,2,11)+slab(23,39,68,1,11)+
   '<path d="M86 63Q127 62 123 105" fill="none" stroke="'+C.ink+'" stroke-width="6" stroke-linecap="round"/>'+
   '<path d="M109 95l14 20 14 -19Z" fill="'+C.ink+'"/>'+
   '<circle cx="40" cy="119" r="10" fill="#9A9693"/><circle cx="78" cy="119" r="10" fill="#9A9693"/><circle cx="124" cy="119" r="10" fill="'+C.ink+'"/>'+
   '<path d="M25 142q0-13 15-13t15 13M63 142q0-13 15-13t15 13" fill="#9A9693"/>'+
   '<path d="M107 142q0-13 17-13t17 13" fill="'+C.ink+'"/>'+
   '</svg>';
 default:throw Error('invalid action');
 }
}
function art(action){return actionArt(String(action||''))}
function face(c){
 if(!c||typeof c!=='object')throw Error('card required');
 if(c.kind==='number'){
  const n=Number(c.rank);
  if(!Number.isInteger(n)||n<1||n>10)throw Error('invalid rank');
  return '<span class="ph-plate ph-number-plate" data-rank="'+n+'" style="--rank-accent:'+rankCorners[n-1]+'" aria-hidden="true">'+
   '<span class="ph-number-corner"></span><span class="ph-number-corner-bottom"></span>'+
   '<span class="ph-index ph-index-top">'+n+'</span>'+
   '<span class="ph-number-main">'+n+'</span>'+
   '<span class="ph-stack-art">'+numberArt(n)+'</span>'+
   '<span class="ph-index ph-index-bottom">'+n+'</span>'+
   '</span>';
 }
 const action=String(c.action||'');
 if(!actions.includes(action))throw Error('invalid action');
 return '<span class="ph-plate ph-action-plate" aria-hidden="true">'+
  '<span class="ph-action-title">'+action.toUpperCase()+'</span>'+
  '<span class="ph-action-art">'+actionArt(action)+'</span>'+
  '<span class="ph-action-rule">'+rules[action]+'</span>'+
  '<span class="ph-action-index">'+glyph[action]+'</span>'+
  '</span>';
}
function back(){
 return '<span class="ph-plate ph-back-plate" aria-hidden="true">'+
  '<span class="ph-back-frame"></span>'+
  '<span class="ph-back-title">STACK</span>'+
  '<svg class="ph-back-stack" viewBox="0 0 140 100" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">'+
  slab(18,18,98,0,12)+slab(24,37,88,2,12)+slab(18,56,98,1,12)+slab(24,75,88,3,12)+'</svg>'+
  '<span class="ph-back-subtitle">THE CARD GAME</span></span>';
}
function mini(c){
 if(!c)return '<span class="mini back ph-mini ph-mini-back" aria-hidden="true">'+back()+'</span>';
 if(c.kind==='number'){
  const n=Number(c.rank);if(!Number.isInteger(n)||n<1||n>10)throw Error('invalid miniature number');
  return '<span class="mini ph-mini ph-mini-number" title="Number '+n+'">'+n+'</span>';
 }
 const action=String(c.action||'');if(!actions.includes(action))throw Error('invalid miniature action');
 return '<span class="mini ph-mini ph-mini-action" data-action="'+action+'" title="'+action.toUpperCase()+'">'+glyph[action]+'</span>';
}
root.PileheadCardArt=Object.freeze({face,back,mini,art,numberArt,rules,glyph,palette:C});
})(typeof window!=='undefined'?window:globalThis);
