(function(){'use strict';
const E=globalThis.PowerLab,$=id=>document.getElementById(id);
const query=new URLSearchParams(location.search);
const MODE=['plain','joker','match'].includes(query.get('rule'))?query.get('rule'):'match';
const KEY='tilt-joker-lab-'+MODE+'-v01';
let game=null,opponents='bot',botStyle='timing',busy=false,covered=false,epoch=0,botTimer=null;
let sounds=false,drag=null,suppressClick=false,voice=null;
let handling='table',tableFocus=false,selectedIndex=null;
let message='Hold your Joker until the pile is dangerous, or surprise the other player early.';

function seat(){return E.active(game)}
function done(){return E.finished(game)}
function focus(){return opponents==='bot'?0:seat()}
function name(i){return opponents==='bot'?(i===0?'You':'Bot'):'Player '+(i+1)}
function canAct(){return !busy&&!covered&&!done()&&(opponents==='hotseat'||seat()===0)}
function persist(){try{localStorage.setItem(KEY,JSON.stringify({game,opponents,botStyle,message,sounds,handling,tableFocus}))}catch(e){console.warn('Save unavailable',e)}}
function restore(){
 try{
  const old=JSON.parse(localStorage.getItem(KEY)||'null');
  if(!old?.game||old.game.version!==E.VERSION||old.game.people?.length!==2||old.game.mode!==MODE)return false;
  game=old.game;opponents=old.opponents==='hotseat'?'hotseat':'bot';
  botStyle=['timing','greedy','hoard','random'].includes(old.botStyle)?old.botStyle:'timing';
  message=typeof old.message==='string'?old.message:message;
  sounds=old.sounds===true;handling=old.handling==='quick'?'quick':'table';tableFocus=old.tableFocus===true;return true;
 }catch{return false}
}
function makeCard(c,attrs='',cls=''){
 if(c.kind==='joker')return '<button type="button" class="card joker '+cls+'" '+attrs+
   ' aria-label="Joker. Forces the opponent to take the pile, or discards without attack when the pile is empty.">'+
   '<span class="corner">TILT / POWER</span><span class="number">!</span>'+
   '<span class="arrow" aria-hidden="true">↯</span>'+
   '<span class="footer">FULL PILE</span></button>';
 const word=c.arrow==='up'?'UP':'DOWN',sym=c.arrow==='up'?'↑':'↓';
 return '<button type="button" class="card '+cls+'" data-arrow="'+c.arrow+'" '+attrs+
  ' aria-label="Number '+c.n+', arrow '+word+'">'+
  '<span class="corner">TILT / POWER</span>'+
  '<span class="number">'+c.n+'</span>'+
  '<span class="arrow" aria-hidden="true">'+sym+'</span>'+
  '<span class="footer">'+word+' NEXT</span></button>';
}
function rule(){
 if(game.pending){
  if(MODE==='match')return game.pending.targetRank===null?
    ['TAKE THE WHOLE PILE','The Joker is on an empty pile, so there is no number to match.']:
    ['MATCH '+game.pending.targetRank+' OR TAKE ALL','The rank below the sideways Joker remains visible.'];
  if(MODE==='joker')return['JOKER OR TAKE ALL','Another Joker can reflect the attack.'];
  return['TAKE ALL','This Joker cannot be countered in this rule variant.'];
 }
 const top=game.pile.at(-1);
 if(!top)return['ANY CARD','The pile is empty. Choose what to start with.'];
 return top.arrow==='up'?
  ['↑ '+top.n+' OR HIGHER','The top arrow sets your rule.']:
  ['↓ '+top.n+' OR LOWER','The top arrow sets your rule.'];
}
function opponentBacks(n){
 // The backs are deliberately identical. No card content or hidden IDs.
 const count=Math.min(n,5); // keep a readable far-seat fan even when opponent collects many cards
 return Array.from({length:count},(_,i)=>'<span class="back-card" aria-hidden="true" style="--fan:'+((i-(count-1)/2)*5)+'deg;--lift:'+((i%2)*-2)+'px"></span>').join('');
}
function fanStyle(i,count){
 const offset=i-(count-1)/2;
 return '--fan-angle:'+(offset*Math.min(5.5,28/Math.max(1,count-1))).toFixed(2)+'deg;--fan-rise:'+Math.round(Math.abs(offset)*2.7)+'px;--layer:'+(i+1);
}
function touchFeedback(ms=7){
 if(typeof navigator!=='undefined'&&typeof navigator.vibrate==='function')try{navigator.vibrate(ms)}catch(_){}
}
function render(){
 const turn=seat(),human=focus(),you=game.people[human],other=game.people[1-human],
  top=game.pile.at(-1),pending=game.pending;
 $('turn').textContent=done()?'GAME OVER':covered?'PASS THE PHONE':busy?'BOT THINKING':
  turn===human?'YOUR TURN':name(turn).toUpperCase()+' TURN';
 $('opponentName').textContent=name(1-human).toUpperCase();
 $('opponentHand').innerHTML=opponentBacks(other.hand.length);
 $('other').textContent=other.hand.length+' '+(other.hand.length===1?'card':'cards')+' in hand';
 $('stock').textContent=game.stock.length+' left';
 $('modeTitle').textContent=MODE==='plain'?'Joker forces pickup':
  MODE==='joker'?'Joker counters Joker':'Visible-rank counter';
 for(const mode of E.MODES)$(mode+'Link').setAttribute('aria-current',MODE===mode?'page':'false');
 $('deckVisual').innerHTML=game.stock.length?
  '<span class="back-card" aria-hidden="true"></span>':'<span class="empty-stock">Empty</span>';
 $('deckVisual').className=game.stock.length?'stack-back':'';
 const ashes=game.ashes.length;
 $('discardCount').textContent=ashes+' '+(ashes===1?'card':'cards');
 $('discard').className=ashes?'discard-card':'discard-empty';
 $('discard').textContent=ashes?
  (game.ashes.at(-1).kind==='joker'?'↯':String(game.ashes.at(-1).n)):'EMPTY';
 $('discard').setAttribute?.('aria-label',ashes?'Discard pile, '+ashes+' cards':'Empty discard pile');
 const condition=rule();
 $('condition').textContent=condition[0];$('ruleTip').textContent=condition[1];
 $('pile').className=pending?'pile pending-attack':'pile';
 $('pile').innerHTML=(top?
   game.pile.slice(-3).map((card,i,layers)=>makeCard(card,
    'disabled tabindex="-1"'+(i<layers.length-1?' aria-hidden="true"':''),
    'table-card'+(i<layers.length-1?' table-under under-'+(layers.length-1-i):''))).join('')+
   '<span class="pile-count">'+game.pile.length+'</span>':
   '<div class="empty-pile">PLACE A CARD</div>')+
  (pending?'<span class="joker-signal">JOKER ↯<small>CHALLENGE '+
    (pending.targetRank??'?')+'</small></span>':'');
 $('jokerWarning').hidden=!pending;
 if(pending){
  $('jokerWarningTitle').textContent=MODE==='match'?
    'JOKER: MATCH '+(pending.targetRank??'?')+' OR TAKE ALL':
    MODE==='joker'?'JOKER: COUNTER OR TAKE ALL':'JOKER: TAKE THE WHOLE PILE';
  $('jokerWarningBody').textContent=game.pile.length+' '+(game.pile.length===1?'card':'cards')+' at stake. '+(MODE==='match'?
    'Play the same number as the card still visible beneath the Joker to send the pile BACK.':
    MODE==='joker'?'Play another Joker to return the pile to your attacker.':
    'No counter in this mode: take the full pile, then the attacker plays again.');
 }
 $('message').textContent=done()?(game.draw?'Unresolved game.':'Winner: '+name(game.winner)+'!'):message;
 $('handTitle').textContent=opponents==='hotseat'?
  name(human).toUpperCase()+' · YOUR HAND':'YOUR HAND · '+you.hand.length;
 const act=canAct(),options=act?E.legal(game,turn):[];
 const playable=new Set(options.filter(x=>x.type==='play'||x.type==='counter').map(x=>x.index));
 if(!act||selectedIndex!==null&&!playable.has(selectedIndex))selectedIndex=null;
 const showOwn=!covered&&(opponents==='bot'||act);
 $('hand').innerHTML=showOwn?
  you.hand.map((c,i)=>makeCard(c,
   'data-index="'+i+'" aria-pressed="'+(selectedIndex===i)+'" style="'+fanStyle(i,you.hand.length)+'" '+(act&&playable.has(i)?'':'disabled'),
   act&&playable.has(i)?'playable'+(selectedIndex===i?' selected':''):'blocked')).join(''):
  '<p style="font-size:12px;color:#d7e7d8">Private hand hidden during handoff.</p>';
 $('pileMat').classList?.toggle('ready-to-drop',act&&selectedIndex!==null);
 $('pileMat').setAttribute?.('tabindex',act&&selectedIndex!==null?'0':'-1');
 $('pileMat').setAttribute?.('aria-label',act&&selectedIndex!==null?'Place selected card on the pile':'Shared pile, drag cards here');
 $('focusToggle').textContent=tableFocus?'Exit table focus':'Table focus';
 $('focusToggle').setAttribute?.('aria-pressed',String(tableFocus));
 document.body?.classList?.toggle('table-focus',tableFocus);
 const takeOption=options.some(x=>x.type==='takeTop'||x.type==='takeAll');
 $('take').hidden=!act||!takeOption;
 $('takeButton').textContent=pending?'TAKE THE WHOLE PILE ('+game.pile.length+')':'Pick up the top card';
 $('takeExplain').textContent=pending?
  'This consumes your turn. If a counter card is bright, you can play it instead.':
  'No legal card fits. The rest of the pile is discarded.';
 $('handHint').textContent=done()?'Would you like a rematch?':
  covered?'Your private hand is hidden until you are ready.':
  busy?'You can see your cards while the bot thinks.':
  pending?(playable.size?
   'Counter with a bright card, or take the whole pile.':
   'No counter available. Take the entire pile.'):
  options.some(x=>x.type==='takeTop')?
   'No card fits. Pick up the top card.':
   (!game.pile.length&&you.hand.some(c=>c.kind==='joker')?
    'The pile is empty. A Joker played now is discarded with no attack.':
    'Tap a bright card to play. The Joker always fits, but timing matters.');
 if(handling==='table'&&act&&playable.size)
  $('handHint').textContent=selectedIndex===null?
    'Tap a card to lift it, then tap the pile. Or drag it directly.':
    'Card lifted. Tap the pile to place it, or tap this card to put it back.';
 if(handling==='table'&&pending&&act&&playable.size&&selectedIndex===null)
  $('handHint').textContent='Lift a counter card and place it, or take the pile.';
 $('handlingMode').value=handling;
 $('done').hidden=!done();
 $('done').innerHTML=done()?'<h2>'+(game.draw?'Draw':name(game.winner)+' wins!')+'</h2>'+
   '<p>'+game.turn+' actions · '+game.log.filter(x=>x.reason==='joker').length+
   ' Joker plays · '+game.log.filter(x=>x.reason==='jokerBlocked').length+' counters.</p>'+
   '<button type="button" class="primary" data-rematch="1">Play again</button>':'';
}
function cover(){
 selectedIndex=null;covered=true;
 $('coverTitle').textContent='Pass to '+name(seat());
 $('cover').style.display='flex';render();
}
function rectOf(el){
 if(!el||typeof el.getBoundingClientRect!=='function')return null;
 const r=el.getBoundingClientRect();return {x:r.x,y:r.y,left:r.left,top:r.top,width:r.width,height:r.height};
}
function isReducedMotion(){
 return typeof window!=='undefined'&&typeof window.matchMedia==='function'&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
function clearGhosts(){
 if(typeof document.querySelectorAll!=='function')return;
 for(const el of document.querySelectorAll('.flying-card,.drag-ghost'))el.remove();
 $('pileMat').classList?.remove('drop-active');
}
function animateMotion(from,action){
 if(!from||isReducedMotion()||typeof document.body?.appendChild!=='function')return;
 // The defending counter card is discarded, never returned to its owner's hand.
 // A burned Joker likewise goes straight to the discard pile, not onto the table.
 const collecting=action.action==='takeTop'||action.action==='takeAll';
 const target=collecting?(opponents==='bot'&&action.seat===1?$('opponentHand'):$('hand')):
   (['match','jokerBurned','jokerBlocked'].includes(action.reason)?$('discard'):$('pile'));
 const to=rectOf(target);if(!to)return;
 const card=action.card||(collecting?game.people[action.seat].hand.at(-1):null);
 if(!card)return;
 const ghost=document.createElement('div');
 ghost.className='flying-card';
 ghost.innerHTML=makeCard(card,'disabled');
 ghost.style.position='fixed';ghost.style.left=from.left+'px';ghost.style.top=from.top+'px';
 ghost.style.width=Math.max(70,from.width)+'px';ghost.style.height=Math.max(105,from.height)+'px';
 ghost.style.pointerEvents='none';
 document.body.appendChild(ghost);
 const dx=(to.left+to.width/2)-(from.left+from.width/2);
 const dy=(to.top+to.height/2)-(from.top+from.height/2);
 const duration=collecting?390:315;
 if(typeof ghost.animate==='function'){
  const animation=ghost.animate([
   {transform:'translate(0,0) rotate(-5deg) scale(1)',opacity:1,offset:0},
   {transform:'translate('+(dx*.55)+'px,'+(dy*.60-29)+'px) rotate(5deg) scale(1.06)',opacity:1,offset:.6},
   {transform:'translate('+dx+'px,'+dy+'px) rotate(-3deg) scale(.89)',opacity:.95,offset:1}
  ],{duration,easing:'cubic-bezier(.2,.75,.22,1)',fill:'forwards'});
  animation.onfinish=()=>ghost.remove();
  animation.oncancel=()=>ghost.remove();
 }else ghost.remove();
}
// A full-pile penalty should look like a stack, not one ordinary card.
function animatePileSweep(before,action){
 if(!before?.rect||before.count<1||!['jokerHit','jokerBlocked'].includes(action.reason)||
   opponents!=='bot'||isReducedMotion()||typeof document.body?.appendChild!=='function')return;
 const recipient=action.reason==='jokerBlocked'?action.victim:action.seat;
 const target=recipient===1?$('opponentHand'):$('hand'),to=rectOf(target);
 if(!to)return;
 const from=before.rect,ghost=document.createElement('div');
 ghost.className='flying-card pile-sweep';
 ghost.innerHTML='<span class="sweep-count">'+action.taken+' CARDS</span>';
 ghost.style.position='fixed';ghost.style.left=from.left+'px';ghost.style.top=from.top+'px';
 ghost.style.width='88px';ghost.style.height='120px';ghost.style.pointerEvents='none';
 document.body.appendChild(ghost);
 const dx=to.left+to.width/2-from.left-44,dy=to.top+to.height/2-from.top-60;
 if(typeof ghost.animate==='function'){
  const motion=ghost.animate([
   {transform:'translate(0,0) rotate(-5deg) scale(1)',opacity:1},
   {transform:'translate('+(dx*.6)+'px,'+(dy*.55-18)+'px) rotate(8deg) scale(1.05)',opacity:1},
   {transform:'translate('+dx+'px,'+dy+'px) rotate(-3deg) scale(.82)',opacity:.9}
  ],{duration:580,easing:'cubic-bezier(.2,.75,.22,1)',fill:'forwards'});
  motion.onfinish=()=>ghost.remove();motion.oncancel=()=>ghost.remove();
 }else ghost.remove();
}
function cardSound(){
 // A short synthetic paper tap. Off by default; no autoplay without opt-in.
 if(!sounds||typeof window==='undefined')return;
 const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)return;
 try{
  voice=voice||new Audio();
  if(voice.state==='suspended')voice.resume();
  const len=Math.floor(voice.sampleRate*.055);
  const buffer=voice.createBuffer(1,len,voice.sampleRate),ch=buffer.getChannelData(0);
  for(let i=0;i<len;i++)ch[i]=(Math.random()*2-1)*Math.exp(-i/(len*.26));
  const source=voice.createBufferSource(),filter=voice.createBiquadFilter(),gain=voice.createGain();
  source.buffer=buffer;filter.type='bandpass';filter.frequency.value=1450;filter.Q.value=.7;
  gain.gain.value=.055;source.connect(filter);filter.connect(gain);gain.connect(voice.destination);
  source.start();
 }catch(e){console.debug('Optional card audio unavailable',e)}
}
function finish(action,from,pileBefore){
 selectedIndex=null;
 const c=action.card;
 if(action.reason==='joker')message=name(action.seat)+' played a Joker. The entire pile is now in danger!';
 else if(action.reason==='jokerBurned')message=name(action.seat)+
  ' discarded a Joker on an empty pile. No attack; the other player takes the next turn.';
 else if(action.reason==='jokerHit')message=name(action.seat)+' took ALL '+action.taken+
  ' pile cards. The attacker starts a fresh pile.';
 else if(action.reason==='jokerBlocked')message='COUNTER! '+name(action.seat)+
  ' sent '+action.taken+' cards back to '+name(action.victim)+'.';
 else if(action.reason==='pickup')message=name(action.seat)+' picked up the top card.';
 else if(action.reason==='match')message=name(action.seat)+' matched '+c.n+'. The pile was cleared!';
 else message=name(action.seat)+' played '+c.n+' '+(c.arrow==='up'?'↑':'↓')+'.';
 persist();
 if(done()){
  covered=false;$('cover').style.display='none';busy=false;render();
  if(action.reason!=='jokerHit')animateMotion(from,action);
  animatePileSweep(pileBefore,action);cardSound();return;
 }
 if(opponents==='hotseat'){
  if(seat()!==action.seat)cover();
  else render(); // A successful counter lets this defender immediately lead.
  cardSound();return;
 }
 render();if(action.reason!=='jokerHit')animateMotion(from,action);
 animatePileSweep(pileBefore,action);cardSound();queueBot();
 if(action.reason==='match'&&$('pileMat').classList){
  const mat=$('pileMat');mat.classList.remove('match-flash');
  if(typeof mat.offsetWidth==='number')void mat.offsetWidth;
  mat.classList.add('match-flash');
 }
}
function play(move,source){
 if(!canAct())return;
 const from=rectOf(source),pileBefore={rect:rectOf($('pile')),count:game.pile.length};
 let event;
 try{event=E.play(game,seat(),move)}
 catch(e){message='That move is not allowed: '+e.message;render();return}
 // Once the engine has committed, presentation errors must not masquerade
 // as rejected moves or encourage another tap of an already-played card.
 try{finish(event,from,pileBefore)}
 catch(e){console.warn('Joker move succeeded but visual feedback failed',e);persist();render()}
}
function queueBot(){
 if(opponents!=='bot'||done()||seat()!==1||busy)return;
 busy=true;render();const captured=epoch;
 botTimer=setTimeout(()=>{
  if(epoch!==captured||seat()!==1||done()){busy=false;return}
  busy=false;
  try{
   const move=E.choose(game,1,botStyle);
   const source=['takeTop','takeAll'].includes(move.type)?$('pile').querySelector?.('.table-card'):$('opponentHand').querySelector?.('.back-card:last-child');
   const from=rectOf(source),pileBefore={rect:rectOf($('pile')),count:game.pile.length};
   finish(E.play(game,1,move),from,pileBefore);
  }
  catch(e){message='Bot could not continue: '+String(e.message);render()}
 },Math.min(1350,550+game.pile.length*30+(game.pending?210:0)));
}
function resetGame(seed){
 if(botTimer!==null)clearTimeout(botTimer);
 epoch++;busy=false;covered=false;drag=null;selectedIndex=null;clearGhosts();
 game=E.create({seed,mode:MODE});
 message='Grow the pile, time your Joker, or keep a card that can counter.';
 $('cover').style.display='none';persist();
 if(opponents==='hotseat')cover();else{render();queueBot()}
}
function placeSelected(){
 if(!canAct()||selectedIndex===null)return;
 const i=selectedIndex,source=$('hand').querySelector?.('[data-index="'+i+'"]')||$('hand');
 play({type:game.pending?'counter':'play',index:i},source);
}
$('pileMat').onclick=placeSelected;
$('pileMat').onkeydown=e=>{if((e.key==='Enter'||e.key===' ')&&selectedIndex!==null){e.preventDefault?.();placeSelected()}};
$('hand').onclick=e=>{
 if(suppressClick){suppressClick=false;return}
 if(!canAct())return;
 const el=e.target.closest('[data-index]');if(!el||el.disabled)return;
 const index=Number(el.dataset.index);
 if(handling==='table'){
  selectedIndex=selectedIndex===index?null:index;
  touchFeedback();render();
 }else play({type:game.pending?'counter':'play',index},el);
};
document.addEventListener?.('keydown',e=>{if(e.key==='Escape'&&selectedIndex!==null){selectedIndex=null;render()}});
$('takeButton').onclick=()=>{
 const source=$('pile').querySelector?.('.table-card');
 play({type:game.pending?'takeAll':'takeTop'},source);
};
$('reveal').onclick=()=>{covered=false;$('cover').style.display='none';render();queueBot()};
$('newGame').onclick=()=>{
 const n=Number($('seed').value);
 if(!Number.isInteger(n)||n<0||n>4294967295){alert('Please enter a valid nonnegative seed.');return}
 opponents=$('opponents').value==='hotseat'?'hotseat':'bot';
 botStyle=['timing','greedy','hoard','random'].includes($('botStyle').value)?$('botStyle').value:'timing';
 resetGame(n);
};
$('soundEnabled').onchange=e=>{sounds=Boolean(e.target.checked);persist()};
$('handlingMode').onchange=e=>{handling=e.target.value==='quick'?'quick':'table';selectedIndex=null;persist();render()};
$('focusToggle').onclick=()=>{tableFocus=!tableFocus;persist();render()};
$('done').onclick=e=>{
 if(!e.target.closest('[data-rematch]'))return;
 const seed=(game.seed+1)>>>0;$('seed').value=String(seed);resetGame(seed);
};
$('export').onclick=()=>{
 const payload={version:E.VERSION,game,opponents,botStyle,exportedAt:new Date().toISOString()};
 const url=URL.createObjectURL(new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}));
 const a=document.createElement('a');a.href=url;a.download='tilt-power-'+MODE+'-'+game.seed+'.json';a.click();
 setTimeout(()=>URL.revokeObjectURL(url),1200);
};
// Optional drag-to-pile uses Pointer Events, with simple one-tap play as the primary path.
const hand=$('hand');
hand.addEventListener?.('pointerdown',e=>{
 if(!canAct()||e.button>0)return;
 const el=e.target.closest?.('[data-index]');if(!el||el.disabled)return;
 const r=rectOf(el);if(!r)return;
 drag={index:Number(el.dataset.index),startX:e.clientX,startY:e.clientY,gripX:e.clientX-r.left,gripY:e.clientY-r.top,prevX:e.clientX,source:el,rect:r,active:false,ghost:null,pointerId:e.pointerId};
 // Capture the pointer so a finger can travel out of the hand all the way to the center pile.
 try{el.setPointerCapture?.(e.pointerId)}catch(error){console.debug('Pointer capture unavailable',error)}
});
hand.addEventListener?.('pointermove',e=>{
 if(!drag||drag.pointerId!==e.pointerId)return;
 const dx=e.clientX-drag.startX,dy=e.clientY-drag.startY;
 if(!drag.active&&Math.hypot(dx,dy)>14){
  drag.active=true;
  const ghost=drag.source.cloneNode(true);
  ghost.removeAttribute('data-index');ghost.disabled=true;
  ghost.classList.add('drag-ghost');ghost.style.position='fixed';ghost.style.width=drag.rect.width+'px';
  ghost.style.height=drag.rect.height+'px';ghost.style.pointerEvents='none';
  document.body.appendChild(ghost);drag.ghost=ghost;
  drag.source.classList.add('dragging-original');
 }
 if(!drag.active)return;
 e.preventDefault();const ghost=drag.ghost;
 ghost.style.left=(e.clientX-drag.gripX)+'px';
 ghost.style.top=(e.clientY-drag.gripY)+'px';
 ghost.style.transform='rotate('+Math.max(-13,Math.min(13,(e.clientX-drag.prevX)*1.5)).toFixed(1)+'deg) scale(1.05)';
 drag.prevX=e.clientX;
 const r=rectOf($('pileMat')),inside=r&&e.clientX>=r.left-22&&e.clientX<=r.left+r.width+22&&
   e.clientY>=r.top-22&&e.clientY<=r.top+r.height+22;
 $('pileMat').classList.toggle('drop-active',Boolean(inside));
});
function finishDrag(e,cancelled){
 if(!drag||e.pointerId!==drag.pointerId)return;
 const d=drag;drag=null;
 try{d.source.releasePointerCapture?.(e.pointerId)}catch(error){console.debug('Pointer release unavailable',error)}
 d.source.classList?.remove('dragging-original');
 $('pileMat').classList?.remove('drop-active');
 if(!d.active)return;
 e.preventDefault?.();
 suppressClick=true;
 // Suppress the synthetic post-pointerup click; restore normal single-tap action.
 setTimeout(()=>{suppressClick=false},0);
 const from=rectOf(d.ghost)||d.rect;
 const r=rectOf($('pileMat'));
 const hit=!cancelled&&r&&e.clientX>=r.left-22&&e.clientX<=r.left+r.width+22&&
   e.clientY>=r.top-22&&e.clientY<=r.top+r.height+22;
 if(hit&&canAct()){
  d.ghost?.remove();
  play({type:game.pending?'counter':'play',index:d.index},{getBoundingClientRect:()=>from});
 }else{
  selectedIndex=null;render();
  if(d.ghost&&typeof d.ghost.animate==='function'&&!isReducedMotion()){
   const dx=d.rect.left-from.left,dy=d.rect.top-from.top;
   const m=d.ghost.animate([
    {transform:d.ghost.style.transform||'rotate(0deg) scale(1.05)',opacity:1},
    {transform:'translate('+dx+'px,'+dy+'px) rotate(0deg) scale(1)',opacity:.8}
   ],{duration:210,easing:'ease-out',fill:'forwards'});
   m.onfinish=()=>d.ghost.remove();m.oncancel=()=>d.ghost.remove();
  }else d.ghost?.remove();
 }
}
hand.addEventListener?.('pointerup',e=>finishDrag(e,false));
hand.addEventListener?.('pointercancel',e=>finishDrag(e,true));
const reset=query.get('new')==='1'||!restore();
if(reset){
 const seed=query.has('seed')?Number(query.get('seed')):20261111;
 game=E.create({seed:Number.isInteger(seed)&&seed>=0&&seed<=4294967295?seed:20261111,mode:MODE});
 persist();
}
$('opponents').value=opponents;$('botStyle').value=botStyle;$('seed').value=String(game.seed);
$('soundEnabled').checked=sounds;
$('handlingMode').value=handling;
if(opponents==='hotseat'&&!done())cover();else{render();queueBot()}
})();