/* First-person tabletop presentation. Does not alter game rules or hidden state. */
(function(root){'use strict';
const STORE='pilehead-table-sound-v1';
const motion=typeof matchMedia==='function'?matchMedia('(prefers-reduced-motion: reduce)'):{matches:false};
const $=(sel,el=document)=>el.querySelector(sel);
let last=null,seen=false,ctx=null,sound=false,btn=null,focusButton=null,focusMode=false,menuButton=null,handScroll=0;
try{sound=localStorage.getItem(STORE)==='on';focusMode=localStorage.getItem('pilehead-table-focus-v1')==='on'}catch{}
function controls(){
 const nav=$('.top .links');if(!nav)return;
 if(!menuButton){
  nav.id='pilehead-top-links';
  menuButton=document.createElement('button');menuButton.type='button';
  menuButton.className='table-menu-toggle';menuButton.textContent='☰ Menu';
  menuButton.setAttribute('aria-controls','pilehead-top-links');
  menuButton.setAttribute('aria-expanded','false');
  const close=()=>{nav.classList.remove('is-open');menuButton.setAttribute('aria-expanded','false')};
  menuButton.addEventListener('click',()=>{
   const open=nav.classList.toggle('is-open');
   menuButton.setAttribute('aria-expanded',String(open))
  });
  nav.parentElement.insertBefore(menuButton,nav);
  document.addEventListener('keydown',e=>{if(e.key==='Escape')close()});
  document.addEventListener('click',e=>{
   if(!nav.contains(e.target)&&!menuButton.contains(e.target))close()
  });
  nav.addEventListener('click',e=>{if(e.target.closest('a,[data-fx-sound],button'))close()});
 }
 if(!btn){btn=document.createElement('button');btn.type='button';btn.className='sound-toggle';
  btn.title='Optional original card sounds, muted by default';
  btn.addEventListener('click',()=>{sound=!sound;try{localStorage.setItem(STORE,sound?'on':'off')}catch{};updateButton();snap()});
  nav.appendChild(btn)}
 updateButton();
 if(!focusButton){
  focusButton=document.createElement('button');focusButton.type='button';
  focusButton.dataset.fxFocus='1';focusButton.title='Hide distractions and focus on the card table';
  focusButton.addEventListener('click',()=>{
   focusMode=!focusMode;
   try{localStorage.setItem('pilehead-table-focus-v1',focusMode?'on':'off')}catch{}
   document.body.classList.toggle('pilehead-focus',focusMode&&!!$('#app .table'));
   updateFocusButton();
  });
  nav.appendChild(focusButton);
 }
 updateFocusButton();
 if(!$('[data-table-fullscreen]',nav)&&document.documentElement.requestFullscreen){
  const f=document.createElement('button');f.type='button';f.dataset.tableFullscreen='1';f.textContent='⛶ Fullscreen';
  f.title='Immersive table fullscreen';f.addEventListener('click',async()=>{try{
   if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen()
  }catch{}});nav.appendChild(f)}
}
function updateButton(){if(btn){btn.setAttribute('aria-pressed',String(sound));btn.innerHTML='<span class="sound-led" aria-hidden="true"></span> '+(sound?'Sound on':'Sound off')}}
function updateFocusButton(){if(focusButton){focusButton.setAttribute('aria-pressed',String(focusMode));focusButton.textContent=focusMode?'✕ Exit focus':'◎ Focus table'}}
function handLayout(n,rowWidth,cardWidth,mobile){
 const budget=Math.max(0,rowWidth-24),maxStep=mobile?(n<=4?Math.min(cardWidth*.94,94):54):80,minStep=mobile?28:38;
 const step=n<=1?cardWidth:Math.min(maxStep,Math.max(minStep,(budget-cardWidth)/(n-1)));
 const overlap=Math.min(0,Math.round(step-cardWidth));
 return{overlap,span:n?cardWidth+(n-1)*(cardWidth+overlap):0,
  fits:!n||cardWidth+(n-1)*(cardWidth+overlap)<=budget+2};
}
function fan(table){
 const row=$('.hand-area .card-row.hand',table);if(!row)return;
 const cards=Array.from(row.querySelectorAll(':scope > .card'));
 const n=cards.length,center=(n-1)/2,mobile=matchMedia('(max-width:700px)').matches;
 // Measure the *actual available width*, not the viewport. A fitted hand needs
 // no page-level horizontal scrolling; a large pickup remains swipeable inside
 // its own rail, with readable card indices even when partly overlapped.
 const width=cards[0]?.offsetWidth||0,{overlap}=handLayout(n,row.clientWidth,width,mobile);
 const spread=Math.min(mobile?12:15,n<=4?6.5:n<=8?3.6:2.1);
 cards.forEach((card,i)=>{
  const r=i-center,ratio=center?Math.abs(r)/center:0;
  card.style.setProperty('--fan-angle',Math.max(-13,Math.min(13,r*spread)).toFixed(1)+'deg');
  card.style.setProperty('--fan-rise',Math.round(ratio*ratio*(mobile?6:10))+'px');
  card.style.setProperty('--fan-z',String(Math.max(1,Math.round(n-Math.abs(r)))));
  card.style.setProperty('--card-overlap',overlap+'px');
 });
 row.scrollLeft=handScroll;
 // An independent scrollbar for a picked-up hand, rather than an oversized
 // flex child that pushes the entire felt table off the viewport.
 const overflow=row.scrollWidth>row.clientWidth+4;
 const area=row.closest('.hand-area');
 if(area){
  area.classList.toggle('hand-overflow',overflow);
  area.querySelectorAll('[data-hand-scroll]').forEach(x=>x.remove());
  if(overflow){
   const prev=document.createElement('button'),next=document.createElement('button');
   for(const [button,dir,arrow,title] of [[prev,-1,'‹','Earlier cards'],[next,1,'›','Later cards']]){
    button.type='button';button.className='hand-scroll-arrow';
    button.dataset.handScroll=String(dir);button.setAttribute('aria-label',title);
    button.textContent=arrow;area.appendChild(button);
   }
   row.setAttribute('aria-label',n+' cards. Swipe horizontally or use the arrow buttons to see all cards.');
   const selected=cards.find(c=>c.classList.contains('selected'));
   if(selected){
    const x=selected.offsetLeft,left=row.scrollLeft,right=left+row.clientWidth;
    if(x<left+10||x+width>right-10)
     row.scrollLeft=Math.max(0,x-(row.clientWidth-width)/2);
   }
  }else row.setAttribute('aria-label',n+' cards in your hand');
  handScroll=row.scrollLeft;
 }
}

/* Shared presentation: the same finale is used by bots, hot-seat and online rooms.
   Names are escaped here, not by the game engine, so private state stays private. */
function escapeMarkup(value){return String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function resultHTML({players=[],finishedOrder=[],loser=null,me=null,moves=0,ashes=0,key='',online=false}={}){
 const ranking=[...finishedOrder];if(loser!==null&&!ranking.includes(loser))ranking.push(loser);
 if(!ranking.length)return '';
 const getName=seat=>escapeMarkup(players[seat]??('Player '+(seat+1)));
 const champion=ranking[0],iWon=me!==null&&me!==loser,neutral=me===null;
 const label=neutral?'THE FINAL TABLE':iWon?'YOU MADE IT OUT':'THE PILE GOT YOU';
 const heading=neutral?'What a finish!':iWon?'CONGRATULATIONS!':'PILEHEAD!';
 const message=neutral?'Every card has found its place. Here is how the table finished.':
  iWon?'You played your last card and escaped the pile. That deserves a celebration.':
  'The final pile is yours this round. Every great comeback starts here.';
 const A=root.PileheadCardArt,back=A?.back?.()||'<span>PILEHEAD</span>';
 const festive=Array.from({length:34},(_,i)=>{
  const left=(i*73+19)%100,delay=(i*13%19)*-0.13,travel=150+(i*17%80);
  return '<i style="--left:'+left+'%;--delay:'+delay+'s;--travel:'+travel+'px;--drift:'+(i%2?26:-26)+'px;--turn:'+(i%2?880:-880)+'deg" aria-hidden="true"></i>';
 }).join('');
 const entries=ranking.map((seat,i)=>{
  const last=seat===loser,first=i===0;
  return '<li class="result-rank '+(first?'is-champion ':'')+(last?'is-pilehead':'')+'">'+
   '<span class="result-position">'+(last?'LAST':String(i+1).padStart(2,'0'))+'</span>'+
   '<span class="result-person"><strong>'+getName(seat)+(me===seat?' <em>YOU</em>':'')+'</strong>'+
   '<small>'+(last?'The Pilehead':first?'First out':'Escaped')+'</small></span>'+
   '<span class="result-rank-symbol" aria-hidden="true">'+(last?'♠':first?'★':'✦')+'</span></li>';
 }).join('');
 const actions=online?
  '<button class="action primary" data-do="rematch" type="button">Play again · same room</button>':
  '<button class="action primary" data-do="rematch" type="button">Play another round</button>';
 const caption=online?'Same players and link, new cards. <a href="?online=1">Create a different table</a>':'Same players. New shuffle. Another chance.';
 return '<div class="pilehead-result-backdrop '+(iWon?'is-victory':'is-final')+'" role="dialog" aria-modal="true" aria-labelledby="pilehead-result-title" data-result-root data-game-result="'+escapeMarkup(key)+'">'+
  '<div class="result-confetti" aria-hidden="true">'+festive+'</div>'+
  '<div class="result-spotlight" aria-hidden="true"></div>'+
  '<section class="pilehead-result-panel" aria-describedby="pilehead-result-subtitle">'+
   '<div class="result-head"><span>PILEHEAD</span><span>END OF ROUND</span></div>'+
   '<div class="result-scene" aria-hidden="true">'+
    '<div class="result-scene-orbit"></div>'+
    '<div class="result-fan-card result-fan-left ph-card">'+back+'</div>'+
    '<div class="result-fan-card result-fan-right ph-card">'+back+'</div>'+
    '<div class="result-fan-card result-fan-main ph-card">'+back+'</div>'+
    '<div class="result-wreath">'+(iWon||neutral?'★':'♠')+'</div>'+
   '</div>'+
   '<div class="result-copy"><div class="result-kicker">'+label+'</div>'+
   '<h2 id="pilehead-result-title" tabindex="-1">'+heading+'</h2>'+
   '<p id="pilehead-result-subtitle" class="result-lead">'+message+'</p></div>'+
   '<div class="result-winner"><span>FIRST TO ESCAPE</span><strong>'+getName(champion)+'</strong></div>'+
   '<div class="result-stats"><span><b>'+Number(moves||0)+'</b> moves</span><span><b>'+Number(ashes||0)+'</b> burned</span><span><b>'+ranking.length+'</b> players</span></div>'+
   '<div class="result-rank-heading"><span>FINAL STANDINGS</span><span>THE TABLE REMEMBERS</span></div>'+
   '<ol class="result-ranking">'+entries+'</ol>'+
   '<div class="result-actions">'+actions+
    '<button class="action secondary" type="button" data-do="dismiss-result">View the table</button></div>'+
   '<p class="result-footnote">'+caption+'</p>'+
  '</section></div>';
}
let lastResultKey=null;
function victoryChime(){
 if(!sound||motion.matches)return;
 try{
  const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;
  ctx||=new AC();if(ctx.state==='suspended')ctx.resume().catch(()=>{});
  // Original three-note tabletop flourish. The sound setting remains opt-in.
  for(const [i,hz] of [392,523.25,659.25].entries()){
   const start=ctx.currentTime+i*.13,osc=ctx.createOscillator(),gain=ctx.createGain();
   osc.type='sine';osc.frequency.setValueAtTime(hz,start);
   gain.gain.setValueAtTime(.0001,start);gain.gain.exponentialRampToValueAtTime(.055,start+.025);
   gain.gain.exponentialRampToValueAtTime(.0001,start+.48);
   osc.connect(gain).connect(ctx.destination);osc.start(start);osc.stop(start+.52);
   osc.onended=()=>{osc.disconnect();gain.disconnect()};
  }
 }catch{}
}
function syncResult(){
 const modal=$('[data-result-root]');
 if(!modal){return}
 const key=modal.getAttribute('data-game-result');
 if(key===lastResultKey)return;
 lastResultKey=key;
 modal.querySelector('#pilehead-result-title')?.focus({preventScroll:true});
 if(modal.classList.contains('is-victory'))victoryChime();
}
document.addEventListener?.('keydown',e=>{
 const modal=$('[data-result-root]');if(!modal)return;
 if(e.key==='Escape'){e.preventDefault();modal.querySelector('[data-do="dismiss-result"]')?.click();return}
 if(e.key!=='Tab')return;
 const focusable=Array.from(modal.querySelectorAll('button:not(:disabled),a[href]'));
 if(!focusable.length)return;
 const first=focusable[0],last=focusable[focusable.length-1];
 if(e.shiftKey&&(document.activeElement===first||document.activeElement?.id==='pilehead-result-title')){e.preventDefault();last.focus()}
 else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}
});

const appRoot=$('#app');
appRoot?.addEventListener('scroll',e=>{
 if(e.target?.classList?.contains('hand'))handScroll=e.target.scrollLeft;
},true);
appRoot?.addEventListener('click',e=>{
 const b=e.target.closest('button[data-hand-scroll]');if(!b)return;
 e.stopPropagation();
 const row=$('.hand-area .card-row.hand');if(!row)return;
 row.scrollBy({left:Number(b.dataset.handScroll)*Math.max(140,row.clientWidth*.62),
  behavior:motion.matches?'auto':'smooth'});
},true);
window.addEventListener('resize',()=>{const table=$('#app .table');if(table)fan(table)});
function decor(table){
 const p=$('.opponents',table);if(!p)return;
 const seats=Array.from(p.querySelectorAll(':scope > .opponent'));
 p.style.setProperty('--opponent-count',String(Math.max(1,Math.min(4,seats.length))));
 seats.forEach((el,i)=>el.style.setProperty('--seat-drift',Math.round(-7*Math.abs(i-(seats.length-1)/2))+'px'))
}
function hint(table,active,selected,moveNo){
 const area=$('.hand-area',table);if(!area)return;let h=$('.pilehead-hand-hint',area);
 if(!active||matchMedia('(max-width:700px)').matches||!area.querySelector('.card.playable')||moveNo>5){h?.remove();return}
 if(!h){h=document.createElement('span');h.className='pilehead-hand-hint';area.appendChild(h)}
 h.textContent=selected?'Tap the pile to place your cards':'Drag onto the pile · tap matching cards to group'
}
function snap(type='play'){
 if(!sound||motion.matches)return;
 try{
  const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;
  ctx||=(new AC());if(ctx.state==='suspended')ctx.resume().catch(()=>{});
  const length=Math.floor(ctx.sampleRate*(type==='burn'?.13:.045));
  const buffer=ctx.createBuffer(1,length,ctx.sampleRate),array=buffer.getChannelData(0);
  let prev=0;for(let i=0;i<length;i++){prev=prev*.6+(Math.random()*2-1)*.4;
   array[i]=prev*Math.pow(1-i/length,type==='burn'?2.8:6)}
  const source=ctx.createBufferSource(),gain=ctx.createGain();source.buffer=buffer;
  gain.gain.value=type==='burn'?.12:.08;source.connect(gain).connect(ctx.destination);source.start();
  source.onended=()=>{source.disconnect();gain.disconnect()}
 }catch{/* Sound is optional. */}
}

/* PHYSICAL TABLE DIRECTOR
   Animate only public facts from authoritative move events. A rival's hand is
   represented by card backs; no private card IDs or ranks are inspected. */
let motionGame=null,observedMove=0,motionQueue=[],motionPlaying=false,motionGeneration=0;
const canMove=()=>!motion.matches&&document.visibilityState!=='hidden'&&
 typeof Element!=='undefined'&&typeof Element.prototype.animate==='function';
function placeFor(table,seat,layer,ownSeat){
 if(seat===ownSeat){
  if(layer==='up')return $('.zone.your-up .card-row',table)||$('.zone.your-up',table);
  if(layer==='down')return $('.zone.your-up .up-pair .card.back',table)||$('.zone.your-up',table);
  return $('.hand-area .card-row.hand',table)||$('.hand-area',table);
 }
 const opponent=$('.opponent[data-seat="'+seat+'"]',table);
 if(!opponent)return $('.opponents',table)||table;
 return layer==='up'||layer==='down'?$('.mini-cards',opponent)||opponent:
  $('.held-cards',opponent)||opponent;
}
function landmark(table,where){
 return $(where==='pile'?'[data-play-target] .pile-card':
  where==='stock'?'.table-center .stack:first-child .pile-card':
  '.table-center .stack:last-child .pile-card',table)||table;
}
function center(el){
 const r=(el||document.body).getBoundingClientRect();
 return{x:r.left+r.width*.5,y:r.top+r.height*.5};
}
function physicalCard(ev,hidden=false){
 const art=root.PileheadCardArt,piece=document.createElement('div');
 const rank=Number(ev?.rank),action=ev?.action;
 const known=Number.isInteger(rank)&&rank>=1&&rank<=10;
 const hasAction=!!(action&&art?.rules?.[action]);
 piece.className='card ph-card pilehead-physical-fx '+
  (hidden||!hasAction&&!known?'back ph-back':hasAction?'ph-action action-card':'ph-number');
 if(hasAction&&!hidden)piece.dataset.action=action;
 piece.innerHTML=hidden||!hasAction&&!known?(art?.back?.()||''):
  (art?.face?.(hasAction?{kind:'action',action}:{kind:'number',rank})||'');
 return piece;
}
function moveCard(table,start,end,ev,opts={}){
 if(!canMove()||!start||!end)return;
 const a=center(start),b=center(end),size=Math.round(Math.min(90,Math.max(64,(root.innerWidth||390)*.19)));
 const piece=physicalCard(ev,opts.hidden);
 piece.style.left=(a.x-size*.5)+'px';piece.style.top=(a.y-size*.70)+'px';
 piece.style.width=size+'px';piece.style.height=Math.round(size*1.4)+'px';
 document.body.appendChild(piece);
 const dx=b.x-a.x+(opts.spreadX||0),dy=b.y-a.y+(opts.spreadY||0);
 const middle=opts.via?center(opts.via):null;
 const duration=opts.duration||440,delay=opts.delay||0;
 const rotate=opts.rotate??(opts.index||0)*5-8;
 const frames=[{transform:'translate3d(0,0,0) rotate('+(-11+rotate*.3)+'deg) scale(.84)',opacity:.96,offset:0}];
 if(middle)frames.push({transform:'translate3d('+(middle.x-a.x)+'px,'+(middle.y-a.y-17)+'px,0) rotate('+(rotate*.45)+'deg) scale(1.06)',opacity:1,offset:.57});
 else frames.push({transform:'translate3d('+(dx*.57)+'px,'+(dy*.57-20)+'px,0) rotate('+(rotate*.35)+'deg) scale(1.1)',opacity:1,offset:.6});
 frames.push({transform:'translate3d('+dx+'px,'+dy+'px,0) rotate('+rotate+'deg) scale(.92)',opacity:opts.fade?0:1,offset:1});
 if(opts.reveal){
  // A blind card flies face down and only turns into the public card on landing.
  setTimeout(()=>{if(piece.isConnected){const art=root.PileheadCardArt;
   piece.className='card ph-card pilehead-physical-fx '+(ev.action?'ph-action action-card':'ph-number');
   piece.innerHTML=art?.face?.(ev.action?{kind:'action',action:ev.action}:{kind:'number',rank:Number(ev.rank)})||'';
  }},delay+Math.floor(duration*.63));
 }
 try{
  const animation=piece.animate(frames,{duration,delay,easing:'cubic-bezier(.23,.73,.25,1)',fill:'forwards'});
  animation.onfinish=()=>piece.remove();
  animation.oncancel=()=>piece.remove();
 }catch{piece.remove();return}
 setTimeout(()=>piece.remove(),delay+duration+160);
}
function pulse(el,type='hit'){
 if(!el||!canMove())return;
 try{el.animate(type==='turn'?[
  {filter:'brightness(1)',offset:0},{filter:'brightness(1.55)',offset:.4},{filter:'brightness(1)',offset:1}
 ]:[
  {filter:'brightness(1)',transform:'scale(1)'},{filter:'brightness(1.25)',transform:'scale(1.045)',offset:.42},
  {filter:'brightness(1)',transform:'scale(1)'}
 ],{duration:type==='turn'?470:340,easing:'ease-out'})}catch{}
}
function particles(where,type='burn'){
 if(!canMove()||!where)return;
 const p=center(where),group=document.createElement('div');
 group.className='pilehead-impact-particles '+(type==='burn'?'is-burn':'is-slam');
 group.style.left=p.x+'px';group.style.top=p.y+'px';
 for(let i=0;i<12;i++){
  const spark=document.createElement('i');
  spark.style.setProperty('--angle',(i*30)+'deg');
  spark.style.setProperty('--radius',(25+(i%4)*13)+'px');
  spark.style.setProperty('--delay',(i%3*26)+'ms');
  group.appendChild(spark);
 }
 document.body.appendChild(group);
 setTimeout(()=>group.remove(),830);
}
function cue(table,text){
 if(!table||document.visibilityState==='hidden')return;
 const el=document.createElement('div');el.className='pilehead-cue';
 el.setAttribute('aria-hidden','true');el.textContent=text;
 table.appendChild(el);setTimeout(()=>el.remove(),1050);
}
function playCards(table,ev,ownSeat,options={}){
 const source=placeFor(table,ev.seat,ev.source||'hand',ownSeat);
 const pile=landmark(table,'pile');
 const total=Math.max(1,Math.min(4,Number(ev.count)||1));
 const bridge=Math.min(total-1,Math.max(0,Number(ev.bridgeCount)||0));
 const fast=ev.type==='slam'||ev.type==='followup';
 for(let i=0;i<total;i++){
  const from=i>=total-bridge?placeFor(table,ev.seat,'up',ownSeat):source;
  moveCard(table,from,options.to||pile,ev,{
   index:i,hidden:(ev.source==='down'||ev.seat!==ownSeat)&&i===0,delay:i*(fast?52:67),
   duration:fast?300:410,rotate:(i-(total-1)/2)*7,
   spreadX:(i-(total-1)/2)*7,spreadY:-i*3,
   fade:Boolean(options.fade),via:options.via||null,reveal:(ev.source==='down'||ev.seat!==ownSeat)&&i===0&&!options.fade
  });
 }
 pulse(pile,'hit');
}
function pickupCards(table,ev,ownSeat,recipient,delay=0,countOverride=null){
 const pile=landmark(table,'pile'),hand=placeFor(table,recipient,'hand',ownSeat);
 const count=Math.max(0,Number(countOverride??ev.takenCount??ev.count)||0);
 if(!count)return;
 const shown=Math.min(4,count);
 for(let i=0;i<shown;i++)moveCard(table,pile,hand,ev,{
  hidden:true,delay:delay+i*58,duration:470,index:i,
  spreadX:(i-(shown-1)/2)*14,spreadY:-(i%2)*8
 });
 setTimeout(()=>pulse(hand,'turn'),delay+370);
}
function burnPile(table,ev,delay=320){
 const pile=landmark(table,'pile'),ashes=landmark(table,'ashes');
 const n=Math.max(1,Math.min(5,Number(ev.burnedCount)||Number(ev.count)||1));
 setTimeout(()=>{
  if(!canMove())return;
  particles(pile,ev.reason==='slam'?'slam':'burn');
  for(let i=0;i<n;i++)moveCard(table,pile,ashes,ev,{
   hidden:true,delay:i*42,duration:390,index:i,rotate:i*16-29,
   spreadX:i*4,spreadY:-i*2,fade:true
  });
  pulse(ashes,'hit');snap('burn');
 },delay);
}
function drawCards(table,ev,ownSeat,delay=0){
 const total=Math.min(3,Math.max(0,Number(ev.drawnCount)||0));
 if(!total||!canMove())return;
 const stock=landmark(table,'stock'),hand=placeFor(table,ev.seat,'hand',ownSeat);
 for(let i=0;i<total;i++)moveCard(table,stock,hand,ev,{
  hidden:true,delay:delay+i*105,duration:460,index:i,
  spreadX:(i-(total-1)/2)*14,spreadY:-i*7
 });
 setTimeout(()=>pulse(hand,'turn'),delay+340);
}
function celebrate(table,ev,ownSeat){
 if(!table||!ev||!canMove())return 0;
 const pickup=ev.type==='take'||ev.type==='blind-fail';
 if(pickup){
  if(ev.type==='blind-fail'){
   cue(table,'BLIND CARD · PICK UP');
   moveCard(table,placeFor(table,ev.seat,'down',ownSeat),landmark(table,'pile'),ev,
    {hidden:true,duration:260,fade:true});
  }else cue(table,'TAKE THE PILE · '+ev.count+' CARDS');
  snap('pickup');pickupCards(table,ev,ownSeat,ev.seat,ev.type==='blind-fail'?250:50,ev.count);
  return 720;
 }
 if(ev.action==='dump'){
  cue(table,'DUMP · PILE TO NEXT PLAYER');
  // DUMP itself is burned: it must NEVER enter the recipient's hand.
  playCards(table,ev,ownSeat,{to:landmark(table,'ashes'),via:landmark(table,'pile'),fade:true});
  setTimeout(()=>particles(landmark(table,'ashes'),'burn'),330);
  pickupCards(table,ev,ownSeat,ev.target,370,ev.takenCount);
  snap('pickup');
  drawCards(table,ev,ownSeat,530);
  return 1050;
 }
 playCards(table,ev,ownSeat);
 if(ev.burned){
  cue(table,ev.type==='slam'?'SLAM! · FOUR OF A KIND':
   ev.reason==='four'?'FOUR MATCHING · PILE BURNS':'BURN · PILE REMOVED');
  burnPile(table,ev,ev.type==='slam'?350:390);
 }else if(ev.type==='followup'){cue(table,'SNAP · MATCHING DRAW');snap('play');particles(landmark(table,'pile'),'slam')}
 else if(ev.bridgeCount){cue(table,'HAND + FACE UP · COMBO');snap('play')}
 else if(ev.action){
  const messages={skip:'SKIP · NEXT PLAYER MISSES TURN',under:'UNDER · PLAY 1–4',
   reset:'RESET · ANY NUMBER',ghost:'GHOST · RESTRICTION STAYS'};
  if(messages[ev.action])cue(table,messages[ev.action]);
  snap('play');
 }else snap('play');
 drawCards(table,ev,ownSeat,ev.burned?530:310);
 return ev.burned?1050:Math.max(650,Number(ev.drawnCount)?910:620);
}
function turnPulse(table,seat,ownSeat){
 if(!table||!canMove()||seat===null||seat===undefined)return;
 const el=placeFor(table,seat,'hand',ownSeat);
 pulse(el,'turn');
}
function firstDeal(table,ownSeat){
 if(!canMove())return;
 const deck=landmark(table,'stock'),opponents=Array.from(table.querySelectorAll('.opponent[data-seat]'));
 const recipients=[...opponents.map(el=>({el,own:false})),
  {el:$('.hand-area .card-row.hand',table),own:true}].filter(x=>x.el);
 recipients.forEach((r,seat)=>{
  for(let i=0;i<(r.own?3:2);i++)moveCard(table,deck,r.el,{type:'deal'},{
   hidden:true,delay:seat*95+i*80,duration:530,index:i,
   spreadX:(i-1)*19,spreadY:-i*5
  });
 });
 cue(table,'CARDS DEALT · PLAY BEGINS');
}
function animateQueue(ownSeat){
 if(motionPlaying||!motionQueue.length)return;
 if(!canMove()){motionQueue.length=0;return}
 const ev=motionQueue.shift(),table=$('#app .table');
 if(!table)return;
 const generation=motionGeneration;
 motionPlaying=true;
 const duration=celebrate(table,ev,ownSeat)||300;
 setTimeout(()=>{
  if(generation!==motionGeneration)return;
  motionPlaying=false;animateQueue(ownSeat);
 },Math.max(280,duration));
}
function sync({event=null,events=[],identity=null,gameKey=null,ownSeat=0,active=false,selected=0,moveNo=0,turn=null,online=false}={}){
 const table=$('#app .table');
 document.body.classList.toggle('pilehead-playing',!!table);
 document.body.classList.toggle('pilehead-focus',!!table&&focusMode);
 document.body.classList.toggle('pilehead-online',Boolean(online));
 controls();
 if(!table){
  seen=false;last=null;motionGame=null;motionQueue.length=0;
  motionPlaying=false;motionGeneration++;syncResult();return;
 }
 decor(table);fan(table);hint(table,active,selected,moveNo);syncResult();
 table.classList.toggle('is-active-turn',Boolean(active));
 table.querySelector('[data-play-target]')?.classList.toggle('is-armed',Boolean(selected));
 const stableKey=gameKey||String(identity||'').replace(/:\d+$/,'');
 const changed=motionGame!==stableKey||!seen;
 if(changed){
  seen=true;last=identity;motionGame=stableKey;observedMove=Number(moveNo)||0;
  motionQueue.length=0;motionPlaying=false;motionGeneration++;
  table.classList.add('scene-entering');
  setTimeout(()=>table.classList.remove('scene-entering'),480);
  if(!Number(moveNo))firstDeal(table,ownSeat);
  return;
 }
 if(last===identity)return;last=identity;
 const nextMove=Number(moveNo)||0;
 if(nextMove<=observedMove){observedMove=nextMove;return}
 let newEvents=Array.isArray(events)?events.filter(x=>Number.isInteger(x.move)&&x.move>observedMove&&x.move<=nextMove):[];
 if(!newEvents.length&&event)newEvents=[event];
 observedMove=nextMove;
 // Prevent a reconnect after a long pause from replaying dozens of stale moves.
 motionQueue.push(...newEvents.slice(-4));if(motionQueue.length>6)motionQueue.splice(0,motionQueue.length-6);
 animateQueue(ownSeat);
 if(turn!==null)turnPulse(table,turn,ownSeat);
}

root.PileheadTableFX={sync,handLayout,resultHTML,resetHandScroll(){handScroll=0}};
})(typeof window!=='undefined'?window:globalThis);
