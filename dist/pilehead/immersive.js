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
 const budget=Math.max(0,rowWidth-24),maxStep=mobile?54:80,minStep=mobile?28:38;
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
  '<a class="action primary" href="?online=1">New online table</a>':
  '<button class="action primary" data-do="rematch" type="button">Play another round</button>';
 const caption=online?'A new table creates a fresh invitation.':'Same players. New shuffle. Another chance.';
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
 if(!active||!area.querySelector('.card.playable')||moveNo>5){h?.remove();return}
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
function makeCard(ev,table){
 const visible=$('[data-play-target] .pile-card .card-wrap:last-child .card',table);
 if(visible&&!ev.burned&&ev.type!=='take'&&ev.type!=='blind-fail'){
  const clone=visible.cloneNode(true);clone.removeAttribute('disabled');
  clone.classList.remove('playable','selected');return clone;
 }
 const A=globalThis.PileheadCardArt,card=document.createElement('div');
 const hidden=ev.type==='take'||ev.type==='blind-fail';
 const action=ev.action&&A?.rules[ev.action]?ev.action:null;
 const rank=Number(ev.rank);
 const numbered=!hidden&&!action&&Number.isInteger(rank)&&rank>=1&&rank<=10;
 card.className='card ph-card '+(hidden?'back ph-back':action?'ph-action action-card':'ph-number');
 if(action)card.dataset.action=action;
 card.innerHTML=hidden||!action&&!numbered?A.back():A.face(action?{kind:'action',action}:{kind:'number',rank});
 return card;
}
function fly(table,ev,ownSeat){
 if(motion.matches||!table||typeof Element==='undefined'||typeof Element.prototype.animate!=='function')return;
 const target=$('[data-play-target] .pile-card',table);if(!target)return;
 const mine=ev.seat===ownSeat,isPickup=ev.type==='take'||ev.type==='blind-fail';
 const source=mine?$('.hand-area .card-row.hand',table):
  $('.opponent[data-seat="'+ev.seat+'"] .held-cards',table)||$('.opponent[data-seat="'+ev.seat+'"] .mini-cards',table)||$('.opponents',table);
 const from=(source||table).getBoundingClientRect(),to=target.getBoundingClientRect();
 const start=isPickup?to:from,dest=isPickup?from:to;
 const x=start.left+start.width/2-(dest.left+dest.width/2),y=start.top+start.height/2-(dest.top+dest.height/2);
 // Show an actual small stack when multiple equal cards land, or the pile is picked up.
 const count=Math.max(1,Math.min(isPickup?3:4,Number(ev.count)||1));
 for(let i=0;i<count;i++){
  const piece=makeCard(ev,table);piece.classList.add('pilehead-physical-fx');
  piece.style.left=(dest.left+dest.width/2-46+i*4)+'px';
  piece.style.top=(dest.top+dest.height/2-66-i*3)+'px';
  piece.style.width='92px';piece.style.height='132px';
  piece.style.zIndex=String(110+i);
  document.body.appendChild(piece);
  const drift=i*7;
  const anim=piece.animate([
   {transform:'translate('+(x-drift)+'px,'+(y+drift)+'px) rotate('+(-16+i*3)+'deg) scale(.78)',opacity:.83},
   {transform:'translate('+(x*.22)+'px,'+(y*.25)+'px) rotate(3deg) scale(1.12)',opacity:1,offset:.72},
   {transform:'translate(0,0) rotate('+((i-(count-1)/2)*4)+'deg) scale(1)',opacity:ev.burned?0:1}
  ],{duration:isPickup?460:390,delay:i*45,easing:'cubic-bezier(.2,.74,.28,1)',fill:'forwards'});
  anim.onfinish=()=>piece.remove();anim.oncancel=()=>piece.remove();
  setTimeout(()=>piece.remove(),1100);
 }
}
function cue(table,text){
 if(!table||motion.matches)return;
 const el=document.createElement('div');el.className='pilehead-cue';el.textContent=text;
 table.appendChild(el);setTimeout(()=>el.remove(),790)
}
function celebrate(table,ev,ownSeat){
 if(!ev)return;
 if(ev.burned){table.classList.remove('just-burned');void table.offsetWidth;table.classList.add('just-burned');
  cue(table,ev.reason==='slam'?'SLAM!':'BURN!');snap('burn');setTimeout(()=>table.classList.remove('just-burned'),550)}
 else if(ev.action==='dump'){cue(table,'DUMP!');snap('pickup')}
 else if(ev.type==='take'||ev.type==='blind-fail'){cue(table,'PICK UP');snap('pickup')}
 else if(ev.type==='play'){snap();if(ev.action==='skip')cue(table,'SKIP!')}
 fly(table,ev,ownSeat)
}
function sync({event=null,identity=null,ownSeat=0,active=false,selected=0,moveNo=0,online=false}={}){
 const table=$('#app .table');
 document.body.classList.toggle('pilehead-playing',!!table);
 document.body.classList.toggle('pilehead-focus',!!table&&focusMode);
 document.body.classList.toggle('pilehead-online',Boolean(online));
 controls();
 if(!table){seen=false;last=null;syncResult();return}
 decor(table);fan(table);hint(table,active,selected,moveNo);
  syncResult();
 table.classList.toggle('is-active-turn',Boolean(active));
 table.querySelector('[data-play-target]')?.classList.toggle('is-armed',Boolean(selected));
 if(!seen){seen=true;last=identity;table.classList.add('scene-entering');setTimeout(()=>table.classList.remove('scene-entering'),480);return}
 if(identity!==null&&last!==identity){last=identity;if(event)celebrate(table,event,ownSeat)}
}
root.PileheadTableFX={sync,handLayout,resultHTML,resetHandScroll(){handScroll=0}};
})(typeof window!=='undefined'?window:globalThis);
