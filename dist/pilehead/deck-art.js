/* PILEHEADS · one authoritative vector deck for simulator, online rooms, gallery and print.
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
 * Fixed rank recipes mirror the approved PILEHEADS overview. Every numbered card is
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
 const recipe=rankPalettes[n], step=n<=2?26:n<=4?20:n<=6?17:n<=8?14:11;
 const thickness=n===1?27:n===2?22:n<=4?19:n<=6?16:n<=8?13:11;
 let art='';
 // Draw bottom to top to make the staggered paper slabs read as a real stack.
 for(let i=n-1;i>=0;i--){
  const offset=[0,5,-4,3,-2,7,-3,2,-1,4][i];
  const width=n<=3?112:n<=6?117:119;
  const x=17+offset;
  // Keep one slab or ten equally centered within the illustration's fixed frame.
  const totalHeight=(n-1)*step+thickness;
  const baseline=76+totalHeight/2-thickness;
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
   '<path d="M14 133H146" stroke="'+C.ink+'" stroke-width="6" stroke-linecap="square"/>'+
   slab(27,113,107,4,13)+slab(33,99,97,0,11)+
   '<path d="M53 100C37 76 61 58 52 39C75 56 76 39 75 18C98 36 113 61 115 82C119 97 111 107 99 112L63 112Z" fill="'+C.red+'"/>'+
   '<path d="M69 101C60 85 76 74 72 59C92 68 99 85 96 97C94 107 83 111 75 112Z" fill="'+C.amber+'"/>'+
   '<path d="M86 95C87 82 82 78 83 70C97 79 101 93 93 105Z" fill="'+C.paper+'"/>'+
   '<path d="M18 88l-7 -9M139 76l9 -10M27 30l-5 -9M121 31l7 -11" stroke="'+C.ink+'" stroke-width="3.2" stroke-linecap="square"/>'+
   '<path d="M30 138h22M113 138h16" stroke="'+C.red+'" stroke-width="3"/>'+
   '</svg>';
 case 'dump':
  return svgStart+
   slab(17,63,67,3,11)+slab(19,50,70,2,11)+slab(23,37,71,1,11)+
   '<path d="M93 58C122 58 123 90 83 102" fill="none" stroke="'+C.ink+'" stroke-width="6" stroke-linecap="square"/>'+
   '<path d="M69 91l11 21 13 -20Z" fill="'+C.red+'"/>'+
   '<path d="M43 117h87" fill="none" stroke="'+C.ink+'" stroke-opacity=".22" stroke-width="2.5" stroke-dasharray="3 6"/>'+
   '<circle cx="35" cy="118" r="10" fill="#A9A39B"/>'+
   '<circle cx="80" cy="115" r="13" fill="'+C.red+'"/>'+
   '<circle cx="127" cy="118" r="10" fill="#A9A39B"/>'+
   '<path d="M20 141q0-13 15-13t15 13M112 141q0-13 15-13t15 13" fill="#A9A39B"/>'+
   '<path d="M60 142q0-18 20-18t20 18" fill="'+C.red+'"/>'+
   '<path d="M62 118l6 7M98 118l-6 7" fill="none" stroke="'+C.ink+'" stroke-width="2"/>'+
   '</svg>';
 default:throw Error('invalid action');
 }
}
function art(action){return actionArt(String(action||''))}
/* Each card face is a single fixed-coordinate composition. CSS may resize the
 * physical card; it must never independently resize or reposition the artwork.
 * SVGs deliberately have no per-instance IDs (many identical cards coexist).
 */
const actionColors=Object.freeze({
 reset:C.blue,ghost:C.olive,under:C.red,skip:C.blue,burn:C.red,dump:C.red
});
const actionCompact=Object.freeze({
 reset:'ANY RANK',ghost:'LIMIT STAYS',under:'1–4 NEXT',
 skip:'SKIP NEXT',burn:'CLEAR + GO',dump:'CHOOSE RIVAL'
});
const actionLines=Object.freeze({
 reset:['ANY NUMBER NEXT'],ghost:['KEEP THE LIMIT'],
 under:['NEXT NUMBER 1–4'],skip:['SKIP NEXT PLAYER'],
 burn:['CLEAR PILE','PLAY AGAIN'],
 dump:['CHOOSE A RIVAL','TAKE PILE · PLAY AGAIN']
});
const displayFont='Impact,Arial Black,Arial Narrow,sans-serif';
function faceSvg(content,extraClass){
 return '<svg class="ph-composed-face '+extraClass+'" viewBox="0 0 240 344" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">'+content+'</svg>';
}
function paper(){
 return '<rect width="240" height="344" fill="#F8F0E4"/>'+
  '<path d="M0 0H240V344H0Z" fill="none" stroke="#B6A58E" stroke-width="2"/>'+
  '<path d="M9 9H231V335H9Z" fill="none" stroke="#BEAA8C" stroke-opacity=".5" stroke-width=".75"/>'+
  '<path d="M14 14H226M14 330H226" stroke="#E3D8C8" stroke-width="1.5"/>'+
  '<path d="M18 52h15M207 292h15" stroke="#1B1C1B" stroke-opacity=".15" stroke-width="2"/>';
}
function embedded(svg,oldClass,newClass,x,y,w,h){
 return svg.replace('class="'+oldClass+'"','class="'+newClass+'"')
  .replace('viewBox="0 0 160 142"','viewBox="0 0 160 142" x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" preserveAspectRatio="xMidYMid meet"');
}
function face(c){
 if(!c||typeof c!=='object')throw Error('card required');
 if(c.kind==='number'){
  const n=Number(c.rank);
  if(!Number.isInteger(n)||n<1||n>10)throw Error('invalid rank');
  const accent=rankCorners[n-1],secondary=palette[(n+1)%5];
  const numberSize=n===10?111:148;
  const main=paper()+
   '<path class="ph-number-corner-vector" d="M174 0H240V69Z" fill="'+accent+'"/>'+
   '<path class="ph-number-corner-bottom-vector" d="M0 301L40 344H0Z" fill="'+secondary+'"/>'+
   '<path d="M22 166H218" stroke="#201D19" stroke-width="3"/>'+
   '<path d="M22 171H218" stroke="'+accent+'" stroke-width="2"/>'+
   '<text class="ph-index-top-vector" x="21" y="42" fill="#201C19" font-family="'+displayFont+'" font-size="29" font-weight="900">'+n+'</text>'+
   '<text class="ph-number-main-vector" x="120" y="150" text-anchor="middle" fill="#17191A" font-family="'+displayFont+'" font-size="'+numberSize+'" font-weight="900" letter-spacing="-6">'+n+'</text>'+
   '<g class="ph-stack-art-vector">'+embedded(numberArt(n),'ph-stack-illustration','ph-stack-illustration-vector',8,174,224,150)+'</g>'+
   '<text class="ph-index-bottom-vector" x="217" y="322" text-anchor="end" fill="#201C19" font-family="'+displayFont+'" font-size="24" font-weight="900" transform="rotate(180 217 322)">'+n+'</text>';
  return '<span class="ph-plate ph-number-plate ph-composed-plate" data-rank="'+n+'" style="--rank-accent:'+accent+'" aria-hidden="true">'+faceSvg(main,'ph-number-vector')+'</span>';
 }
 const action=String(c.action||'');
 if(!actions.includes(action))throw Error('invalid action');
 const accent=actionColors[action],lines=actionLines[action];
 const lineSvg=lines.length===1?
  '<text class="ph-action-rule-vector" x="120" y="302" text-anchor="middle" fill="#FFF9ED" font-family="'+displayFont+'" font-size="20" font-weight="900" textLength="192" lengthAdjust="spacingAndGlyphs">'+lines[0]+'</text>':
  '<text class="ph-action-rule-vector" x="120" y="286" text-anchor="middle" fill="#FFF9ED" font-family="'+displayFont+'" font-size="22" font-weight="900">'+lines[0]+'</text>'+
  '<text class="ph-action-rule-vector" x="120" y="310" text-anchor="middle" fill="#FFF9ED" font-family="'+displayFont+'" font-size="17" font-weight="900" textLength="187" lengthAdjust="spacingAndGlyphs">'+lines[1]+'</text>';
 const body=paper()+
  '<desc>'+rules[action]+'</desc>'+
  '<path d="M0 0H240V19H0Z" fill="'+accent+'"/>'+
  '<path d="M18 71H222" stroke="'+accent+'" stroke-width="6"/>'+
  '<text class="ph-action-title-vector" x="120" y="59" text-anchor="middle" fill="#17191A" font-family="'+displayFont+'" font-size="48" font-weight="900" letter-spacing="-1.8">'+action.toUpperCase()+'</text>'+
  '<g class="ph-action-art-vector">'+embedded(actionArt(action),'ph-illustration','ph-illustration-vector',8,82,224,179)+'</g>'+
  '<rect x="12" y="267" width="216" height="61" rx="2" fill="#18191A"/>'+
  '<path d="M12 267H228" stroke="'+accent+'" stroke-width="5"/>'+
  '<g class="ph-action-long-rule">'+lineSvg+'</g>'+
  '<text class="ph-action-compact-rule" x="120" y="306" text-anchor="middle" fill="#FFF9ED" font-family="'+displayFont+'" font-size="26" font-weight="900">'+actionCompact[action]+'</text>'+
  '<path d="M18 337H222" stroke="'+accent+'" stroke-width="2"/>';
 return '<span class="ph-plate ph-action-plate ph-composed-plate" aria-hidden="true">'+faceSvg(body,'ph-action-vector')+'</span>';
}
function back(){
 const backBase='<rect width="240" height="344" fill="#17191A"/>'+
  '<path class="ph-back-frame-vector" d="M8 8H232V336H8Z" fill="none" stroke="#F6F0E3" stroke-width="2"/>'+
  '<path d="M16 16H224V328H16Z" fill="none" stroke="#D44630" stroke-width="3"/>'+
  '<path d="M23 23H217V321H23Z" fill="none" stroke="#F6F0E3" stroke-opacity=".5" stroke-width="1"/>'+
  '<path d="M30 123H210M30 221H210" stroke="#F6F0E3" stroke-opacity=".5" stroke-width="2"/>'+
  '<text class="ph-back-title-vector" x="120" y="85" text-anchor="middle" font-family="'+displayFont+'" font-size="32" font-weight="900" letter-spacing="-1" fill="#F6F0E3">PILEHEADS</text>'+
  '<g class="ph-back-stack-vector">'+
   slab(44,134,144,0,12)+slab(50,153,132,2,12)+
   '<g transform="rotate(180 120 172)">'+slab(44,134,144,0,12)+slab(50,153,132,2,12)+'</g>'+
  '</g>'+
  '<path d="M26 111H214M26 233H214" stroke="#D44630" stroke-width="5"/>'+
  '<circle cx="120" cy="172" r="5" fill="#F6F0E3"/>'+
  '<path d="M23 23l16 0M201 321h16" stroke="#F6F0E3" stroke-width="3"/>';
 return '<span class="ph-plate ph-back-plate ph-composed-plate" aria-hidden="true">'+faceSvg(backBase,'ph-back-vector')+'</span>';
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
