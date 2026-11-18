/* PILEHEAD illustrated playtest deck.
 * Shared vector artwork for local table, online rooms and physical print sheets.
 * Presentation only: does not define rank powers or game rules. */
(function(root){'use strict';
const rules=Object.freeze({
 reset:'ANY NUMBER NEXT',
 ghost:'KEEP THE LIMIT',
 under:'NEXT NUMBER 1–4',
 skip:'SKIP NEXT PLAYER',
 burn:'BURN PILE · PLAY AGAIN',
 dump:'PICK A RIVAL · THEY TAKE PILE'
});
const glyph=Object.freeze({reset:'↺',ghost:'◇',under:'↓4',skip:'↷',burn:'♨',dump:'⇢'});
const crown='<svg class="ph-crown" viewBox="0 0 42 22" aria-hidden="true" focusable="false"><path d="M3 17L1 4l11 7 9-10 9 10L41 4l-2 13H3Z" fill="#f6c56e" stroke="#123b34" stroke-width="1.7"/><path d="M5 19h32" stroke="#f8e6ad" stroke-width="3" stroke-linecap="round"/></svg>';
const svgStart='<svg class="ph-illustration" viewBox="0 0 160 140" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">';
const illustrations={
 reset:[
  '<g fill="none" stroke-linecap="round" stroke-linejoin="round">',
  '<circle cx="80" cy="69" r="53" stroke="#72deea" stroke-width="3" stroke-dasharray="9 14" opacity=".75"/>',
  '<path d="M38 71c0-25 18-44 43-44 17 0 27 7 35 17" stroke="#092f3e" stroke-width="20"/>',
  '<path d="M38 71c0-25 18-44 43-44 17 0 27 7 35 17" stroke="#f9fff0" stroke-width="14"/>',
  '<path d="M115 24l6 30-31-5" fill="#f9fff0" stroke="#092f3e" stroke-width="3"/>',
  '<path d="M122 68c0 25-19 44-43 44-17 0-27-6-36-17" stroke="#092f3e" stroke-width="20"/>',
  '<path d="M122 68c0 25-19 44-43 44-17 0-27-6-36-17" stroke="#f9fff0" stroke-width="14"/>',
  '<path d="M46 114l-6-31 31 6" fill="#f9fff0" stroke="#092f3e" stroke-width="3"/>',
  '<path d="M12 39l12 5M132 102l14 9M16 103l12-9M134 24l12-10" stroke="#76e9e4" stroke-width="5"/>',
  '</g>'
 ].join(''),
 ghost:[
  '<path d="M28 96L79 16l56 80-56 31Z" fill="#8b53c4" stroke="#e7b9fc" stroke-width="5" opacity=".75"/>',
  '<path d="M50 76C50 37 63 22 83 22c21 0 33 20 33 43v47l-15-8-13 18-14-18-19 10Z" fill="#fcf8ff" stroke="#54307e" stroke-width="5"/>',
  '<path d="M50 78C55 51 68 40 82 40s25 10 31 28" stroke="#cbb3f7" stroke-width="10" opacity=".8" fill="none"/>',
  '<ellipse cx="71" cy="72" rx="6.5" ry="10" fill="#43256c"/><ellipse cx="94" cy="72" rx="6.5" ry="10" fill="#43256c"/>',
  '<path d="M19 89q20 19 14 37M134 52q13-17 19-22M114 124q13-1 21-12" stroke="#dbc6fb" stroke-width="5" fill="none" stroke-linecap="round"/>',
  '<circle cx="30" cy="36" r="4" fill="#e6ceff"/><circle cx="138" cy="108" r="3.5" fill="#e6ceff"/>'
 ].join(''),
 under:[
  '<path d="M16 35h128v14H16z" fill="#ffe5a0" stroke="#503321" stroke-width="5"/>',
  '<path d="M35 48h13v45H35zM112 48h13v45h-13z" fill="#ffcf66" stroke="#503321" stroke-width="4"/>',
  '<rect x="58" y="21" width="44" height="43" rx="6" fill="#fff4c2" stroke="#6b4116" stroke-width="5"/>',
  '<text x="80" y="54" text-anchor="middle" font-family="Arial,sans-serif" font-weight="900" font-size="37" fill="#673b16">4</text>',
  '<path d="M12 104q41 33 86 6l-10-12 56 2-27 34-7-14Q52 150 12 112Z" fill="#ffdc5d" stroke="#713c12" stroke-width="5" stroke-linejoin="round"/>',
  '<path d="M29 77l-11 8m126-23 10 7M26 24l-10-10" stroke="#ffefa6" stroke-width="5" stroke-linecap="round"/>'
 ].join(''),
 skip:[
  '<circle cx="73" cy="52" r="15" fill="#d9ff79" stroke="#265e2d" stroke-width="5"/>',
  '<path d="M49 100c4-21 11-31 23-31s21 10 25 31Z" fill="#a3f05b" stroke="#265e2d" stroke-width="5"/>',
  '<path d="M18 71C43 3 124 5 133 63" stroke="#164628" stroke-width="18" fill="none" stroke-linecap="round"/>',
  '<path d="M18 71C43 3 124 5 133 63" stroke="#f6ffb5" stroke-width="11" fill="none" stroke-linecap="round"/>',
  '<path d="M108 56l27 22 16-35" fill="#ecffb6" stroke="#164628" stroke-width="5" stroke-linejoin="round"/>',
  '<path d="M24 96l-10 6M28 109l-12 15M39 118l-4 15" stroke="#f5ffb5" stroke-width="5" stroke-linecap="round"/>'
 ].join(''),
 burn:[
  '<path d="M34 115C4 79 39 72 42 34c20 21 17 26 24 30C83 43 79 27 99 9c-1 27 31 33 26 55 12-4 14-20 14-20 25 47-11 84-39 91Z" fill="#ffb93e" stroke="#7f281b" stroke-width="5"/>',
  '<path d="M57 131C36 100 59 90 71 73c4 21 18 26 22 33 9-10 11-21 11-21 14 23-2 44-15 50Z" fill="#fff1a8"/>',
  '<path d="M43 86l75-3 13 16-76 5Z" fill="#fdf0d2" stroke="#802d24" stroke-width="4"/>',
  '<path d="M37 101l80-3 10 15-79 5Z" fill="#fff3d9" stroke="#832e25" stroke-width="4"/>',
  '<path d="M42 116l79-3 8 14-77 5Z" fill="#fff2db" stroke="#832e25" stroke-width="4"/>',
  '<path d="M20 40l-7-12m126 8 10-14M20 70l-15-2" stroke="#ffe16b" stroke-width="5" stroke-linecap="round"/>'
 ].join(''),
 dump:[
  '<g transform="rotate(-7 90 94)">',
  '<path d="M39 93h83l18 13-84 5Z" fill="#fff7dd" stroke="#7e285b" stroke-width="4"/>',
  '<path d="M29 104h90l14 16-88 4Z" fill="#ffe4f1" stroke="#7e285b" stroke-width="4"/>',
  '<path d="M23 116h96l10 14-94 4Z" fill="#fff1d5" stroke="#7e285b" stroke-width="4"/>',
  '</g>',
  '<path d="M46 56c17-16 31-14 45-10 16 4 19-6 28-4 8 1 11 8 8 15-3 7-20 11-36 13l-24 6-18-7Z" fill="#ffd4e9" stroke="#7b2c55" stroke-width="5" stroke-linejoin="round"/>',
  '<path d="M33 59q-10 5-15 23M26 39l-13 1M42 28l-7-13" stroke="#ffdeef" stroke-width="7" stroke-linecap="round"/>',
  '<path d="M133 64l11 1m-18 12 14 5" stroke="#ffd0e6" stroke-width="6" stroke-linecap="round"/>'
 ].join('')
};
function art(action){return illustrations[action]?svgStart+illustrations[action]+'</svg>':''}
function actionIcon(action){return glyph[action]||'◇'}
function face(c){
 if(!c||typeof c!=='object')throw Error('card required');
 if(c.kind==='number'){
  const n=Number(c.rank);
  if(!Number.isInteger(n)||n<1||n>10)throw Error('invalid rank');
  return '<span class="ph-plate ph-number-plate" aria-hidden="true">'+
   '<span class="ph-number-rays"></span><span class="ph-crest">'+crown+'</span>'+
   '<span class="ph-index ph-index-top">'+n+'</span><span class="ph-number-main">'+n+'</span>'+
   '<span class="ph-mountain"></span><span class="ph-index ph-index-bottom">'+n+'</span>'+
   '</span>';
 }
 const action=String(c.action||'');
 if(!Object.prototype.hasOwnProperty.call(illustrations,action))throw Error('invalid action');
 return '<span class="ph-plate ph-action-plate" aria-hidden="true">'+
  '<span class="ph-action-sparks"></span><span class="ph-crest">'+crown+'</span>'+
  '<span class="ph-action-title">'+action.toUpperCase()+'</span>'+
  '<span class="ph-action-art">'+art(action)+'</span>'+
  '<span class="ph-action-rule">'+rules[action]+'</span>'+
  '<span class="ph-action-index">'+actionIcon(action)+'</span>'+
  '</span>';
}
function back(){
 return '<span class="ph-plate ph-back-plate" aria-hidden="true">'+
  '<span class="ph-back-frame"></span><span class="ph-back-burst"></span>'+
  '<span class="ph-back-crown">'+crown+'</span>'+
  '<span class="ph-back-title">PILEHEAD</span>'+
  '<svg class="ph-back-stack" viewBox="0 0 90 56" aria-hidden="true"><path d="M8 16 42 5 82 19 47 31Z" fill="#fff1c9" stroke="#e9bf71" stroke-width="3"/><path d="M10 28 47 42 80 30M10 39l37 13 33-12" stroke="#fff1c9" stroke-width="6" fill="none" stroke-linecap="round"/></svg>'+
  '</span>';
}
function mini(c){
 if(!c)return '<span class="mini back ph-mini ph-mini-back" aria-hidden="true">'+back()+'</span>';
 if(c.kind==='number'){
  const n=Number(c.rank);
  if(!Number.isInteger(n)||n<1||n>10)throw Error('invalid miniature number');
  return '<span class="mini ph-mini ph-mini-number">'+n+'</span>';
 }
 const action=String(c.action||'');
 if(!Object.prototype.hasOwnProperty.call(illustrations,action))throw Error('invalid miniature action');
 return '<span class="mini ph-mini ph-mini-action" data-action="'+action+'" title="'+action.toUpperCase()+'">'+actionIcon(action)+'</span>';
}
root.PileheadCardArt=Object.freeze({face,back,mini,art,rules,glyph});
})(typeof window!=='undefined'?window:globalThis);
