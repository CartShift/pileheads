/* First-person tabletop presentation. Does not alter game rules or hidden state. */
(function(root){'use strict';
const STORE='pilehead-table-sound-v1';
const motion=typeof matchMedia==='function'?matchMedia('(prefers-reduced-motion: reduce)'):{matches:false};
const $=(sel,el=document)=>el.querySelector(sel);
let last=null,seen=false,ctx=null,sound=false,btn=null,menuButton=null;
try{sound=localStorage.getItem(STORE)==='on'}catch{}
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
 if(!$('[data-table-fullscreen]',nav)&&document.documentElement.requestFullscreen){
  const f=document.createElement('button');f.type='button';f.dataset.tableFullscreen='1';f.textContent='⛶ Fullscreen';
  f.title='Immersive table fullscreen';f.addEventListener('click',async()=>{try{
   if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen()
  }catch{}});nav.appendChild(f)}
}
function updateButton(){if(btn){btn.setAttribute('aria-pressed',String(sound));btn.innerHTML='<span class="sound-led" aria-hidden="true"></span> '+(sound?'Sound on':'Sound off')}}
function fan(table){
 const row=$('.hand-area .card-row.hand',table);if(!row)return;
 const cards=Array.from(row.querySelectorAll(':scope > .card')),n=cards.length,center=(n-1)/2;
 const mobile=matchMedia('(max-width:700px)').matches,step=n<=4?5.2:n<=7?3.3:n<=12?2:1.1;
 const overlap=n<=3?(mobile?-8:-13):n<=6?(mobile?-11:-16):n<=10?(mobile?-17:-24):(mobile?-27:-34);
 cards.forEach((card,i)=>{
  const r=i-center,ratio=center?Math.abs(r)/center:0;
  card.style.setProperty('--fan-angle',Math.max(-14,Math.min(14,r*step)).toFixed(1)+'deg');
  card.style.setProperty('--fan-rise',Math.round(ratio*ratio*(mobile?5:9))+'px');
  card.style.setProperty('--fan-z',String(Math.max(1,Math.round(n-Math.abs(r)))));
  card.style.setProperty('--card-overlap',overlap+'px')
 });
 if(n>8)row.setAttribute('aria-label',n+' cards. Scroll horizontally for the rest.');
}
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
 h.textContent=selected?'Tap the pile to place your cards':'Drag to pile · or tap a card'
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
 document.body.classList.toggle('pilehead-online',Boolean(online));
 controls();
 if(!table){seen=false;last=null;return}
 decor(table);fan(table);hint(table,active,selected,moveNo);
 table.classList.toggle('is-active-turn',Boolean(active));
 table.querySelector('[data-play-target]')?.classList.toggle('is-armed',Boolean(selected));
 if(!seen){seen=true;last=identity;table.classList.add('scene-entering');setTimeout(()=>table.classList.remove('scene-entering'),480);return}
 if(identity!==null&&last!==identity){last=identity;if(event)celebrate(table,event,ownSeat)}
}
root.PileheadTableFX={sync};
})(typeof window!=='undefined'?window:globalThis);
