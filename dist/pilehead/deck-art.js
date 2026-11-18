/* STACK approved art direction · artwork is independent of rules and card IDs.
 * Fully composed SVG faces are one coordinate system, ensuring fidelity at
 * tabletop, gallery and printed sizes. No separate CSS positions for art.
 */
(function(root){'use strict';
const C={ink:'#161719',cream:'#F7EEDF',blue:'#15658C',red:'#D34530',yellow:'#F4BA22',olive:'#777D38',black:'#202123',muted:'#97928A'};
const PALETTE=[C.blue,C.red,C.yellow,C.olive,C.black];
const CORNERS=[C.red,C.blue,C.yellow,C.olive,C.red,C.olive,C.blue,C.yellow,C.blue,C.yellow];
// Ordered top-to-bottom. The same number always has the same artwork.
const LAYERS=[null,[0],[1,0],[2,0,1],[3,2,0,1],[1,3,2,0,4],[0,2,1,3,0,4],[2,0,3,1,0,2,4],[1,0,2,3,1,0,2,4],[0,2,1,3,0,2,1,3,4],[3,0,2,1,0,3,2,1,0,4]];
const ACTIONS=['reset','ghost','under','skip','burn','dump'];
const rules={reset:'ANY NUMBER NEXT',ghost:'KEEP THE LIMIT',under:'NEXT NUMBER 1–4',skip:'SKIP NEXT PLAYER',burn:'CLEAR PILE · PLAY AGAIN',dump:'CHOOSE A RIVAL · TAKE PILE · PLAY AGAIN'};
const glyph={reset:'↶',ghost:'□',under:'↓4',skip:'↷',burn:'✦',dump:'↗'};
const actionAccents={reset:C.blue,ghost:C.olive,under:C.red,skip:C.blue,burn:C.olive,dump:C.red};
const shadow=['#104765','#9D3329','#B17D0C','#4A5025','#0D0E10'];
const light=['#5197B5','#EC735C','#FFD66A','#A7A96A','#646668'];
function z(v){return Math.round(v*100)/100}
function slab(x,y,w,h,color,depth=9){
 const i=typeof color==='number'?color:PALETTE.indexOf(color);const front=PALETTE[i<0?0:i],top=light[i<0?0:i],side=shadow[i<0?0:i];
 return `<g class="ph-slab" data-slab="1">
  <path d="M${x} ${y} l${depth} -${z(depth*.68)} h${w} l-${depth} ${z(depth*.68)} Z" fill="${top}"/>
  <path d="M${x} ${y} h${w} v${h} h-${w}Z" fill="${front}"/>
  <path d="M${x+w} ${y} l${depth} -${z(depth*.68)} v${h} l-${depth} ${z(depth*.68)}Z" fill="${side}"/>
  <path d="M${x+2} ${y+h-2}h${w-4}" stroke="${side}" stroke-opacity=".35" stroke-width="1"/>
 </g>`;
}
function paper(){return `<defs>
 <linearGradient id="stock" x1="0" x2="1" y1="0" y2=".95"><stop offset="0" stop-color="#FFF9EF"/><stop offset=".52" stop-color="#F7EDE0"/><stop offset="1" stop-color="#EDE0CF"/></linearGradient>
 <radialGradient id="glow"><stop stop-color="#FFF9ED" stop-opacity=".5"/><stop offset="1" stop-color="#E7D6BF" stop-opacity=".25"/></radialGradient>
 <pattern id="grain" patternUnits="userSpaceOnUse" width="13" height="11"><circle cx="2" cy="4" r=".45" fill="#6B4D2C" opacity=".28"/><circle cx="9" cy="8" r=".4" fill="#745437" opacity=".2"/><path d="M6 2h1M12 6h1" stroke="#826346" opacity=".18" stroke-width=".7"/></pattern>
 <filter id="dimshadow" x="-10%" y="-15%" width="130%" height="150%"><feGaussianBlur stdDeviation="1.5"/></filter>
 </defs>
 <rect x=".75" y=".75" width="198.5" height="286.5" rx="13" fill="url(#stock)" stroke="#E5DAC9" stroke-width="1.5"/>
 <rect x="2" y="2" width="196" height="284" rx="12" fill="url(#glow)"/>
 <rect x="6" y="6" width="188" height="276" rx="9" fill="none" stroke="#FFFFFF" stroke-opacity=".65" stroke-width="1.4"/>
 <rect x="3" y="3" width="194" height="282" rx="11" fill="url(#grain)" opacity=".25"/>`}
function svg(content,klass=''){return `<svg class="ph-full-face ${klass}" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 288" preserveAspectRatio="xMidYMid meet" aria-hidden="true" focusable="false">${paper()}${content}</svg>`}
function numberArt(n){
 if(!Number.isInteger(n)||n<1||n>10)throw Error('invalid rank');
 const cols=LAYERS[n];const steps=[0,0,42,39,30,24,20,17,14,12,11];
 const heights=[0,31,29,25,21,18,17,14,13,12,11];
 const tops=[0,225,191,165,156,153,148,151,156,158,157];
 const step=steps[n],ht=heights[n],top=tops[n],baseW=n<=2?145:n<=4?147:148;
 let parts='';
 // Slightly staggered, hand-composed silhouettes, not rotated copies of one tile.
 const drift=[0,8,-4,6,-7,4,-3,7,-5,2];
 // Overlapping draw order is top-to-bottom so the front surfaces stay dimensional.
 for(let j=0;j<n;j++){
  const width=baseW-([0,2,5,3][j%4]);const x=19+drift[j];
  parts+=slab(x,z(top+j*step),width,ht,cols[j],n<=2?17:11);
 }
 const tally=n===1?'<path d="M12 145h31M12 155h31M12 165h31M12 175h31" stroke="#161719" stroke-width="2.6"/>':'';
 return `<g class="stack-rank-bars">${tally}<ellipse cx="95" cy="265" rx="77" ry="4" fill="#393025" opacity=".09"/>${parts}</g>`;
}
function actionArt(action){
 switch(action){
 case 'reset':return `<g class="stack-illustration">${slab(32,205,128,16,4)}${slab(25,185,139,17,1)}${slab(34,164,119,18,0)}
 <path d="M150 164 C183 124 148 98 107 103 C74 107 55 121 47 137" fill="none" stroke="${C.red}" stroke-width="18" stroke-linecap="square"/>
 <path d="M22 130L58 110L57 153Z" fill="${C.red}"/></g>`;
 case 'ghost':return `<g class="stack-illustration">${slab(26,212,142,19,4)}
 <path d="M36 203L53 135H164L147 203Z" fill="#91BCCB" fill-opacity=".3" stroke="${C.blue}" stroke-width="2"/>
 <path d="M57 183L75 110H170L153 183Z" fill="#E3EFF1" fill-opacity=".42" stroke="${C.blue}" stroke-width="2.3"/>
 <path d="M40 205L57 153H153L137 205Z" fill="#81AAB9" fill-opacity=".24" stroke="${C.blue}" stroke-width="2"/>
 <path d="M69 149h76v7H69z" fill="#C7DCE5" opacity=".5"/></g>`;
 case 'under':return `<g class="stack-illustration">
 <path d="M99 107v55" stroke="${C.ink}" stroke-width="21" stroke-linecap="square"/>
 <path d="M65 155L99 191L133 155Z" fill="${C.ink}"/>
 <path d="M32 180v51M169 180v51" stroke="${C.ink}" stroke-width="15"/>
 ${slab(58,202,86,15,1,8)}
 <rect x="23" y="231" width="155" height="27" fill="${C.blue}"/>
 <text x="100" y="245" text-anchor="middle" fill="#fff9e9" font-family="Arial,sans-serif" font-weight="900" font-style="italic" font-size="23">1–4</text></g>`;
 case 'skip':return `<g class="stack-illustration"><path d="M27 169C35 105 142 109 163 161" fill="none" stroke="${C.red}" stroke-width="14"/>
 <path d="M142 146l24 28 9-34Z" fill="${C.red}"/>
 <circle cx="40" cy="207" r="17" fill="${C.ink}"/><circle cx="99" cy="207" r="17" fill="${C.muted}"/><circle cx="158" cy="207" r="17" fill="${C.ink}"/>
 <path d="M14 247q0-26 26-26t26 26ZM73 247q0-26 26-26t26 26ZM132 247q0-26 26-26t26 26Z" fill="${C.ink}"/>
 <path d="M73 247q0-26 26-26t26 26Z" fill="${C.muted}"/></g>`;
 case 'burn':return `<g class="stack-illustration">
 <path d="M90 158L71 108l22-12 18 57Z" fill="${C.red}"/>
 <path d="M108 160l24-66 18 12-25 65Z" fill="${C.red}"/>
 <path d="M66 177l-43-34 12-20 45 32Z" fill="${C.red}"/>
 <path d="M138 174l44-30 9 23-41 25Z" fill="${C.red}"/>
 <path d="M52 198L13 184l6-24 47 17Z" fill="${C.red}"/>
 <path d="M76 217l-29-34 20-13 28 33Z" fill="${C.yellow}"/>
 <path d="M111 218l16-40 23 10-17 33Z" fill="${C.olive}"/>
 <path d="M25 245h152v15H25z" fill="${C.ink}"/>
 <path d="M41 100L30 84M168 105l11-14M94 89L94 75" stroke="${C.ink}" stroke-width="3"/></g>`;
 case 'dump':return `<g class="stack-illustration">${slab(22,161,99,17,3)}${slab(25,141,100,17,0)}${slab(31,121,100,17,1)}
 <path d="M133 154C175 147 176 198 175 211" fill="none" stroke="${C.ink}" stroke-width="6"/>
 <path d="M161 198l14 21 14-20Z" fill="${C.ink}"/>
 <circle cx="44" cy="237" r="11" fill="${C.muted}"/><circle cx="100" cy="237" r="11" fill="${C.muted}"/><circle cx="161" cy="237" r="11" fill="${C.ink}"/>
 <path d="M24 266q0-18 20-18t20 18ZM80 266q0-18 20-18t20 18Z" fill="${C.muted}"/>
 <path d="M140 266q0-18 21-18t21 18Z" fill="${C.ink}"/></g>`;
 default:throw Error('invalid action');
 }
}
function numberFace(n){
 const a=CORNERS[n-1],bottom=[C.blue,C.olive,C.blue,C.red,C.olive,C.blue,C.red,C.olive,C.yellow,C.blue][n-1];
 const topType=n===10?96:123,y=n===10?118:126;
 return '<span class="ph-plate ph-ref-face ph-number-plate" aria-hidden="true">'+svg(`
  <path d="M159 2H198V42Z" fill="${a}"/>
  <path d="M2 253L30 285H2Z" fill="${bottom}"/>
  <g class="stack-rank-number" fill="${C.ink}" font-family="Inter Display,Arial Black,DejaVu Sans,sans-serif" font-weight="950" font-size="${topType}" letter-spacing="-6">
   <text x="100" y="${y}" text-anchor="middle">${n}</text>
  </g>${numberArt(n)}
 `,'ph-art-number')+'</span>';
}
const labelLines={reset:['ANY NUMBER','NEXT'],ghost:['KEEP','THE LIMIT'],under:['NEXT','NUMBER 1–4'],skip:['SKIP','NEXT PLAYER'],burn:['CLEAR PILE ·','PLAY AGAIN'],dump:['CHOOSE A RIVAL','TAKE PILE · PLAY AGAIN']};
function actionFace(action){
 const accent=actionAccents[action],lines=labelLines[action];
 const titleSize=action==='reset'?36:action==='ghost'?35:action==='under'?35:action==='skip'?41:action==='burn'?37:action==='dump'?38:35;
 const captionSize=action==='dump'?13.5:20;
 return '<span class="ph-plate ph-ref-face ph-action-plate" aria-hidden="true">'+svg(`
 <g class="stack-action-name"><text x="100" y="51" font-family="Inter Display,Arial Black,DejaVu Sans,sans-serif" font-size="${titleSize}" font-weight="950" font-style="italic" letter-spacing="-1.7" text-anchor="middle" fill="${C.ink}">${action.toUpperCase()}</text></g>
 <path d="M25 60H175" stroke="${accent}" stroke-width="6"/>
 <g transform="translate(10 22) scale(.90 .72)">${actionArt(action)}</g>
 <g class="stack-action-foot"><path d="M9 226H191V280H9Z" fill="${C.ink}"/>
 <text x="100" y="245" fill="#FFF7EB" font-family="Inter Display,Arial Black,DejaVu Sans,sans-serif" font-size="${captionSize}" font-weight="900" font-style="italic" text-anchor="middle"><tspan x="100" dy="0">${lines[0]}</tspan><tspan x="100" dy="22">${lines[1]}</tspan></text>
 </g>
 `,'ph-art-action')+'</span>';
}
function face(c){
 if(!c||typeof c!=='object')throw Error('card required');
 if(c.kind==='number'){const n=Number(c.rank);if(!Number.isInteger(n)||n<1||n>10)throw Error('invalid rank');return numberFace(n)}
 const a=String(c.action||'');if(!ACTIONS.includes(a))throw Error('invalid action');return actionFace(a);
}
function back(){return '<span class="ph-plate ph-ref-face ph-back-plate" aria-hidden="true">'+svg(`<rect width="200" height="288" rx="12" fill="#18191B"/><path d="M9 9H191V279H9Z" fill="none" stroke="#E5D6BA" stroke-width="2"/>
 <path d="M27 56h152" stroke="#D34530" stroke-width="9"/><text x="100" y="116" text-anchor="middle" font-family="Inter Display,Arial Black,sans-serif" font-style="italic" font-weight="950" font-size="53" letter-spacing="-4" fill="#F7EEDF">STACK</text>
 ${slab(29,179,129,18,0)}${slab(38,207,116,16,1)}${slab(30,234,127,17,3)}<text x="100" y="271" text-anchor="middle" font-family="Arial,sans-serif" letter-spacing="4" font-weight="900" font-size="11" fill="#FFF9EA">THE CARD GAME</text>`,'ph-art-back')+'</span>'}
function mini(c){if(!c)return '<span class="mini back ph-mini ph-mini-back" aria-hidden="true">'+back()+'</span>';
 if(c.kind==='number'){const n=Number(c.rank);if(!Number.isInteger(n)||n<1||n>10)throw Error('invalid miniature number');return '<span class="mini ph-mini ph-mini-number" title="Number '+n+'">'+n+'</span>'}
 const a=String(c.action||'');if(!ACTIONS.includes(a))throw Error('invalid miniature action');return '<span class="mini ph-mini ph-mini-action" data-action="'+a+'" title="'+a.toUpperCase()+'">'+glyph[a]+'</span>';
}
function art(action){return '<svg class="ph-illustration" viewBox="0 0 200 288" xmlns="http://www.w3.org/2000/svg">'+actionArt(String(action||''))+'</svg>'}
root.PileheadCardArt=Object.freeze({face,back,mini,art,numberArt,actionArt,rules,glyph,palette:C});
})(typeof window!=='undefined'?window:globalThis);
