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
function slab(x,y,width,colorIndex,height=9){
 const c=palette[colorIndex%5],light=topPalette[colorIndex%5],dark=sidePalette[colorIndex%5];
 const x2=x+width,dep=6;
 return '<g class="ph-slab" data-slab="1">'+
  '<path d="M'+x+' '+y+'h'+width+'l'+dep+' -'+dep+'h-'+width+'Z" fill="'+light+'"/>'+
  '<rect x="'+x+'" y="'+y+'" width="'+width+'" height="'+height+'" rx="1" fill="'+c+'"/>'+
  '<path d="M'+x2+' '+y+'l'+dep+' -'+dep+'v'+height+'l-'+dep+' '+dep+'Z" fill="'+dark+'"/>'+
  '<path d="M'+x+' '+(y+height)+'h'+width+'" stroke="'+C.ink+'" stroke-opacity=".15" stroke-width="1"/>'+
 '</g>';
}
function numberArt(n){
 if(!Number.isInteger(n)||n<1||n>10)throw Error('invalid rank');
 let art='';
 for(let i=0;i<n;i++){
  const x=25+[0,4,-3,6,1,-4,3,-2,5,0][i];
  art+=slab(x,120-i*9.4,102-(i%3)*2,[1,0,2,3,4][i%5],7.3);
 }
 return numberStart+'<path d="M18 136h127" stroke="'+C.ink+'" stroke-opacity=".1" stroke-width="2"/>'+art+'</svg>';
}
function actionArt(action){
 switch(action){
 case 'reset':
  return svgStart+slab(30,93,97,0,11)+slab(37,81,84,1,10)+
   '<path d="M42 70C18 35 36 17 72 16c23-1 39 11 44 28" fill="none" stroke="'+C.ink+'" stroke-width="11" stroke-linecap="square"/>'+
   '<path d="M42 70C18 35 36 17 72 16c23-1 39 11 44 28" fill="none" stroke="'+C.red+'" stroke-width="7"/>'+
   '<path d="M99 35l20 19 13-24" fill="none" stroke="'+C.red+'" stroke-width="8" stroke-linecap="square"/>'+
   '<path d="M48 118h65" stroke="'+C.ink+'" stroke-opacity=".25" stroke-width="3"/>'+
   '</svg>';
 case 'ghost':
  return svgStart+slab(28,100,101,0,10)+slab(36,88,89,4,10)+
   '<path d="M40 30h88v62H40z" fill="'+C.blue+'" fill-opacity=".10" stroke="'+C.blue+'" stroke-width="3" stroke-dasharray="6 5"/>'+
   '<path d="M26 48h89v57H26z" fill="'+C.blue+'" fill-opacity=".12" stroke="'+C.blue+'" stroke-width="3"/>'+
   '<path d="M54 19h82v59H54z" fill="'+C.paper+'" fill-opacity=".48" stroke="'+C.blue+'" stroke-width="2.4"/>'+
   '<path d="M45 115h81" stroke="'+C.ink+'" stroke-opacity=".28" stroke-width="3"/>'+
   '</svg>';
 case 'under':
  return svgStart+
   '<path d="M21 35h118" stroke="'+C.ink+'" stroke-width="9" />'+
   '<path d="M24 44v72M136 44v72" stroke="'+C.ink+'" stroke-opacity=".65" stroke-width="5"/>'+
   '<path d="M80 18v57" stroke="'+C.ink+'" stroke-width="10"/>'+
   '<path d="M60 61l20 22 20-22" fill="none" stroke="'+C.ink+'" stroke-width="9" stroke-linecap="square"/>'+
   slab(44,101,72,1,9)+
   '<rect x="47" y="121" width="67" height="17" rx="2" fill="'+C.blue+'"/>'+
   '<text x="80" y="134" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-size="17" font-weight="900" fill="'+C.paper+'">1–4</text>'+
   '</svg>';
 case 'skip':
  return svgStart+
   '<circle cx="29" cy="108" r="13" fill="'+C.blue+'"/><circle cx="80" cy="108" r="13" fill="'+C.pale+'"/><circle cx="131" cy="108" r="13" fill="'+C.blue+'"/>'+
   '<path d="M13 133h32V127Q29 118 13 127ZM64 133h32v-6q-16-10-32 0ZM115 133h32v-6q-16-10-32 0Z" fill="'+C.ink+'" fill-opacity=".86"/>'+
   '<path d="M28 77C26 14 137 16 131 77" fill="none" stroke="'+C.red+'" stroke-width="9" stroke-linecap="round"/>'+
   '<path d="M116 61l15 21 15-20" fill="none" stroke="'+C.red+'" stroke-width="9" stroke-linecap="square"/>'+
   '<path d="M64 103l32 11M96 103l-32 11" stroke="'+C.ink+'" stroke-width="4" opacity=".6"/>'+
   '</svg>';
 case 'burn':
  return svgStart+slab(26,117,108,4,8)+
   '<path d="M80 76l-12-42 18-20 10 43Z" fill="'+C.red+'"/>'+
   '<path d="M54 71L33 43 48 27l24 35Z" fill="'+C.red+'"/>'+
   '<path d="M100 73l25-38 14 13-24 36Z" fill="'+C.red+'"/>'+
   '<path d="M42 84L14 73l4-19 37 14Z" fill="'+C.red+'"/>'+
   '<path d="M115 93l31-8 7 18-35 3Z" fill="'+C.amber+'"/>'+
   '<path d="M76 87l-18 17-19-16 8-14Z" fill="'+C.red+'"/>'+
   '<path d="M84 95l23-18 18 15-24 18Z" fill="'+C.blue+'"/>'+
   '<path d="M42 18l-6-11M126 12l10-8M151 56l8-4M17 111l-11 4" stroke="'+C.ink+'" stroke-width="3.5"/>'+
   '</svg>';
 case 'dump':
  return svgStart+
   slab(12,68,66,0,8)+slab(16,57,62,1,8)+slab(20,46,58,2,8)+
   '<path d="M76 71Q97 52 110 28M77 77Q95 79 108 79M76 83Q95 99 111 128" fill="none" stroke="'+C.ink+'" stroke-width="3.5" stroke-linecap="round"/>'+
   '<path d="M102 24l9 3-2 9M100 74l10 5-9 5M102 121l9 6-11 4" fill="none" stroke="'+C.ink+'" stroke-width="3.5"/>'+
   '<circle cx="126" cy="27" r="12" fill="'+C.blue+'"/>'+
   '<circle cx="126" cy="79" r="12" fill="'+C.red+'"/>'+
   '<circle cx="126" cy="129" r="12" fill="'+C.olive+'"/>'+
   '<path d="M116 38h20M116 90h20M116 140h20" stroke="'+C.ink+'" stroke-width="3" stroke-linecap="round"/>'+
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
  return '<span class="ph-plate ph-number-plate" aria-hidden="true">'+
   '<span class="ph-number-corner"></span>'+
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
