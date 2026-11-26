"use strict";

const crypto=require("node:crypto");
const CARD_NAMES=["1","2","3","4","5","6","7","8","9","10","RESET","GHOST","UNDER","SKIP","BURN","DUMP"];
const ACCENTS={yellow:"#F6C32C",red:"#CE302D",teal:"#119C9E",orange:"#EA941C",purple:"#763F83",green:"#388641",blue:"#086FA5"};
const FORMATS=[{id:"feed",width:1080,height:1350},{id:"story",width:1080,height:1920},{id:"square",width:1080,height:1080}];
const CARD_COUNTS={spotlight:1,crew:3,punchline:2};
const esc=value=>String(value).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const hash=value=>crypto.createHash("sha256").update(value).digest("hex");
const textOk=(s,max)=>typeof s==="string"&&s.trim()===s&&s.length>0&&s.length<=max&&!/[\x00-\x1f\x7f]/.test(s);
function validateBrief(b) {
  const keys=["id","template","headline","body","cards","accent","caption","alt","sourceRelease","cta"];
  if(!b||typeof b!=="object"||Array.isArray(b)||Object.keys(b).length!==keys.length||keys.some(k=>!Object.hasOwn(b,k))||
    typeof b.id!=="string"||!/^[a-z0-9][a-z0-9-]{0,59}$/.test(b.id)||
    !Object.hasOwn(CARD_COUNTS,b.template)||!Object.hasOwn(ACCENTS,b.accent)||
    !Array.isArray(b.cards)||b.cards.length!==CARD_COUNTS[b.template]||b.cards.some(c=>!CARD_NAMES.includes(c))||
    !Array.isArray(b.headline)||b.headline.length<1||b.headline.length>2||b.headline.some(s=>!textOk(s,23))||
    !textOk(b.body,100)||!textOk(b.caption,300)||!textOk(b.alt,240)||
    typeof b.sourceRelease!=="string"||!/^[a-zA-Z0-9._-]{1,40}$/.test(b.sourceRelease)||!["play","none"].includes(b.cta)) throw Error("Invalid creative brief");
  return b;
}
function renderHTML(raw,format,assets) {
  const b=validateBrief(raw);
  if(!FORMATS.some(f=>f.id===format.id&&f.width===format.width&&f.height===format.height))throw Error("Invalid format");
  const accent=ACCENTS[b.accent],story=format.id==="story",square=format.id==="square";
  const titleAccent=["yellow","orange","teal","green"].includes(b.accent)?"#191B19":accent;
  const cards=b.cards.map((name,i)=>{
    const index=CARD_NAMES.indexOf(name);
    return '<div class="card c'+i+'" role="img" aria-label="'+esc(name)+' card" style="background-position:'+((index%4)*100/3)+'% '+(Math.floor(index/4)*100/3)+'%"></div>';
  }).join("");
  return '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+esc(b.id)+' · review</title><style>'+
  '@font-face{font-family:BarlowBrand;src:url('+assets.font+') format("truetype");font-style:italic;font-weight:900}'+
  '*{box-sizing:border-box}html,body{margin:0;width:'+format.width+'px;height:'+format.height+'px;overflow:hidden}'+
  'body{background:#F9EBCB;color:#191B19;font-family:Arial,sans-serif}'+
  '.poster{position:relative;width:100%;height:100%;padding:'+(story?'216px 90px 265px':square?'60px 75px 60px':'88px 78px 80px')+';display:flex;flex-direction:column;align-items:center;text-align:center;isolation:isolate}'+
  '.poster:before{content:"";position:absolute;inset:0;background-image:url('+assets.grain+');background-size:320px 320px;opacity:.23;pointer-events:none;z-index:-1}'+
  '.logo{width:'+(square?176:212)+'px;height:auto;object-fit:contain;display:block;margin-bottom:'+(square?18:30)+'px}'+
  '.headline{font:italic 900 '+(square?82:104)+'px/.88 BarlowBrand,Impact,sans-serif;text-transform:uppercase;letter-spacing:-.03em;margin:0;max-width:100%;width:100%;overflow-wrap:normal}.headline span{display:block;white-space:nowrap}.headline span+span{color:'+titleAccent+';text-shadow:2px 2px #191B19}'+
  '.stage{position:relative;display:flex;align-items:center;justify-content:center;flex:1;min-height:0;width:100%;margin:16px 0 12px;container-type:size}.stage:before{content:"";position:absolute;inset:8% 10%;background:'+accent+';clip-path:polygon(50% 0,58% 10%,72% 2%,76% 18%,92% 14%,89% 31%,100% 42%,89% 51%,98% 70%,81% 72%,82% 91%,63% 86%,51% 100%,42% 86%,25% 94%,24% 80%,7% 84%,12% 65%,0 55%,12% 45%,1% 27%,20% 27%,21% 10%,40% 15%);opacity:.85;z-index:-1}'+
  '.card{background-image:url('+assets.cards+');background-size:400% 400%;background-repeat:no-repeat;aspect-ratio:63/88;flex:none;border-radius:4%;box-shadow:5px 8px 0 #191B19,9px 16px 14px #191B1930}'+
  '.spotlight .card{width:min('+(square?300:story?400:365)+'px,56cqh);transform:rotate(-7deg)}'+
  '.crew .card{width:min('+(square?240:270)+'px,50cqh);margin:0 -6px}.crew .c0{transform:rotate(-13deg) translateY(28px)}.crew .c1{transform:translateY(-28px);z-index:2}.crew .c2{transform:rotate(13deg) translateY(28px)}'+
  '.punchline .card{width:min('+(square?270:315)+'px,50cqh);margin:0 12px}.punchline .c0{transform:rotate(-9deg) translateY(-18px)}.punchline .c1{transform:rotate(11deg) translateY(24px)}'+
  '.body{font-size:'+(square?35:42)+'px;font-weight:750;line-height:1.16;max-width:850px;margin:0 0 '+(square?12:22)+'px;text-wrap:balance}.footer{font-weight:900;font-size:'+(square?25:30)+'px;text-transform:uppercase;letter-spacing:.07em;color:#191B19}.rule{width:100%;border-top:3px solid #191B19;margin:0 0 16px}'+
  '</style></head><body><main class="poster '+b.template+'"><img class="logo" src="'+assets.logo+'" alt="PILEHEADS"><h1 class="headline">'+b.headline.map(s=>'<span>'+esc(s)+'</span>').join("")+'</h1><div class="stage">'+cards+'</div><p class="body">'+esc(b.body)+'</p><div class="rule"></div><footer class="footer">'+(b.cta==="play"?"Play free online · pileheads.com":"Play with character.")+'</footer></main></body></html>';
}
function nextState(current,action) {
  const states={REVIEW:{approve:"APPROVED"},APPROVED:{schedule:"SCHEDULED"},SCHEDULED:{record:"PUBLISHED"}};
  const next=states[current]?.[action];
  if(!next)throw Error("Invalid publication transition");
  return next;
}
module.exports={CARD_NAMES,ACCENTS,FORMATS,validateBrief,renderHTML,nextState,hash};
