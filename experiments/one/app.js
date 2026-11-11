(function(){'use strict';
const E=globalThis.OneLab,S=globalThis.OneSeries,$=id=>document.getElementById(id);
const query=new URLSearchParams(location.search);
const MODE=query.get('mode')==='quick'?'quick':'classic';
const SERIES=MODE==='quick'&&query.get('series')==='3';
const KEY=SERIES?'one-card-one-rule-quick-series-v01':MODE==='quick'?'one-card-one-rule-quick-v01':'one-card-one-rule-v01';
let game=null,series=null,opponents='bot',botStyle='strategic',busy=false,covered=false,epoch=0,botTimer=null;
let sounds=false,drag=null,suppressClick=false,voice=null;
let message='Tap a playable card. Its arrow tells the next player what they need to play.';

function seat(){return E.active(game)}
function done(){return E.finished(game)}
function focus(){return opponents==='bot'?0:seat()}
function name(i){return opponents==='bot'?(i===0?'You':'Bot'):'Player '+(i+1)}
function canAct(){return !busy&&!covered&&!done()&&(opponents==='hotseat'||seat()===0)}
function persist(){try{localStorage.setItem(KEY,JSON.stringify({game,series,opponents,botStyle,message,sounds}))}catch(e){console.warn('Save unavailable',e)}}
function restore(){
 try{
  const old=JSON.parse(localStorage.getItem(KEY)||'null');
  if(!old?.game||old.game.version!==E.VERSION||old.game.people?.length!==2||(old.game.mode||'classic')!==MODE)return false;
  if(SERIES&&(!old.series||old.series.version!==S.VERSION))return false;
  game=old.game;series=SERIES?old.series:null;
  opponents=old.opponents==='hotseat'?'hotseat':'bot';
  botStyle=['strategic','adaptive','thoughtful','basic','random'].includes(old.botStyle)?old.botStyle:'strategic';
  message=typeof old.message==='string'?old.message:message;
  sounds=old.sounds===true;return true;
 }catch{return false}
}
function makeCard(c,attrs='',cls=''){
 const word=c.arrow==='up'?'UP':'DOWN',sym=c.arrow==='up'?'↑':'↓';
 return '<button type="button" class="card '+cls+'" data-arrow="'+c.arrow+'" '+attrs+
  ' aria-label="Number '+c.n+', arrow '+word+'">'+
  '<span class="corner">TILT / ONE</span>'+
  '<span class="number">'+c.n+'</span>'+
  '<span class="arrow" aria-hidden="true">'+sym+'</span>'+
  '<span class="footer">'+word+' NEXT</span></button>';
}
function rule(){
 const top=game.pile.at(-1);
 if(!top)return['ANY CARD','The pile is empty. Choose what to start with.'];
 if(top.arrow==='up')return['↑ '+top.n+' OR HIGHER','The arrow on the last card sets your rule.'];
 return['↓ '+top.n+' OR LOWER','The arrow on the last card sets your rule.'];
}
function opponentBacks(n){
 // The backs are deliberately identical. No card content or hidden IDs.
 const count=Math.min(n,5); // keep a readable far-seat fan even when opponent collects many cards
 return Array.from({length:count},(_,i)=>'<span class="back-card" aria-hidden="true" style="--fan:'+((i-(count-1)/2)*5)+'deg;--lift:'+((i%2)*-2)+'px"></span>').join('');
}
function render(){
 const turn=seat(),human=focus(),p=game.people[human],op=game.people[1-human],top=game.pile.at(-1);
 $('turn').textContent=done()?'MATCH OVER':covered?'PASS THE PHONE':busy?'OPPONENT TURN':
    turn===human?'YOUR TURN':name(turn).toUpperCase()+' TURN';
 $('opponentName').textContent=name(1-human).toUpperCase();
 $('opponentHand').innerHTML=opponentBacks(op.hand.length);
 $('other').textContent=op.hand.length+' '+(op.hand.length===1?'card':'cards')+' in hand';
 $('stock').textContent=game.stock.length+' left';
 $('modeTitle').textContent=SERIES?'Best-of-three showdown':MODE==='quick'?'Short strategic game':'The tabletop prototype';
 $('classicLink').setAttribute('aria-current',MODE==='classic'?'page':'false');
 $('quickLink').setAttribute('aria-current',MODE==='quick'&&!SERIES?'page':'false');
 $('seriesLink').setAttribute('aria-current',SERIES?'page':'false');
 $('handRule').textContent=MODE==='quick'?'Keep four cards in hand while the draw deck lasts.':'Keep three cards in hand while the draw deck lasts.';
 $('setScore').hidden=!SERIES;
 if(SERIES){
  const a=name(0),b=name(1),score=series.wins;
  $('setHeadline').textContent=(series.complete?'SET COMPLETE':'ROUND '+series.round+' OF 3')+
    ' · '+a+' '+score[0]+'  :  '+score[1]+' '+b;
  $('setTip').textContent=series.complete?'Best of three completed. Start a fresh set to play again.':
   name(S.firstSeat(series))+' leads this round. The first to win two rounds wins the set.';
 }
 $('deckRule').textContent=MODE==='quick'?
  'Short strategic mode: use the 32 CORE cards (two of every number/arrow pair). Set the 16 EXTRA cards aside and deal four cards per player.':
  'Regular mode: use all 48 purpose-designed cards and deal three cards per player.';
 $('deckVisual').innerHTML=game.stock.length?'<span class="back-card" aria-hidden="true"></span>':'<span class="empty-stock">Empty</span>';
 $('deckVisual').className=game.stock.length?'stack-back':'';
 const ashes=game.ashes.length;
 $('discardCount').textContent=ashes+' '+(ashes===1?'card':'cards');
 $('discard').className=ashes?'discard-card':'discard-empty';
 $('discard').textContent=ashes?String(game.ashes.at(-1).n):'EMPTY';
 $('discard').setAttribute?.('aria-label',ashes?'Discard pile, '+ashes+' cards':'Empty discard pile');
 const r=rule();$('condition').textContent=r[0];$('ruleTip').textContent=r[1];
 $('pile').innerHTML=top?
   (game.pile.length>2?'<span class="pile-under"></span>':'')+
   (game.pile.length>1?'<span class="pile-under two"></span>':'')+
   makeCard(top,'disabled','table-card')+
   '<span class="pile-count">'+game.pile.length+'</span>':
   '<div class="empty-pile">PLACE A CARD</div>';
 $('message').textContent=done()?(game.draw?'The game reached its turn limit.':name(game.winner)+' played their last card!'):message;
 $('handTitle').textContent=opponents==='hotseat'?name(human).toUpperCase()+' · YOUR HAND':'YOUR HAND · '+p.hand.length;
 const live=canAct(),legal=live?E.legal(game,turn):[];
 const playable=new Set(legal.filter(x=>x.type==='play').map(x=>x.index));
 // Against a bot, keep YOUR real cards face up while the bot thinks.
 // In pass-and-play, always hide private cards during handoff.
 const showOwn=!covered&&(opponents==='bot'||live||done());
 $('hand').innerHTML=showOwn?p.hand.map((c,i)=>makeCard(c,'data-index="'+i+'" '+(live&&playable.has(i)?'':'disabled'),
   live&&playable.has(i)?'playable':'blocked')).join(''):
   '<p style="font-size:12px;color:#d7e7d8">Private hand hidden during handoff.</p>';
 $('take').hidden=!live||!legal.some(m=>m.type==='take');
 $('handHint').textContent=done()?'The deck is finished. Want another round?':
   covered?'Your cards will appear when you are ready.':
   busy?'Your hand stays here while the opponent plays.':
   !live?'Waiting for the other player.':
   legal.some(m=>m.type==='take')?'No card fits. Pick up the top card to reset the pile.':
   'Tap a bright card, or drag it to the middle. Dimmed cards cannot be played.';
 $('done').hidden=!done();
 $('done').innerHTML=done()?'<h2>'+
    (SERIES&&series.complete?name(series.wins[0]===2?0:1)+' wins the set!':
     game.draw?'Draw':name(game.winner)+' wins!')+'</h2>'+
   '<p>'+(SERIES?'Set: '+series.wins[0]+' – '+series.wins[1]+' · Round '+series.round+
     ' · '+game.turn+' turns':game.turn+' turns. Your next match might go very differently.')+'</p>'+
   '<button type="button" class="primary" data-rematch="1">'+
    (SERIES?(game.draw?'Retry this round':series.complete?'New best-of-three set':'Next round'): 'Play again')+'</button>':'';
}
function cover(){
 covered=true;
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
 const target=action.action==='take'?(opponents==='bot'&&action.seat===1?$('opponentHand'):$('hand')):(action.reason==='match'?$('discard'):$('pile'));
 const to=rectOf(target);if(!to)return;
 const card=action.card||(action.action==='take'?game.people[action.seat].hand.at(-1):null);
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
 const duration=action.action==='take'?390:315;
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
function finish(action,from){
 const card=action.card;
 if(action.action==='take')message=name(action.seat)+' had no legal card, picked up one and cleared the rest.';
 else if(action.reason==='match')message=name(action.seat)+' matched '+card.n+'. The whole pile was cleared!';
 else message=name(action.seat)+' played '+card.n+' '+(card.arrow==='up'?'↑':'↓')+
   '. Next: '+card.n+' or '+(card.arrow==='up'?'higher.':'lower.');
 if(done()&&SERIES&&S.canRecord(series)&&game.winner!==null)S.record(series,game);
 persist();
 if(done()){
  covered=false;$('cover').style.display='none';busy=false;render();
  animateMotion(from,action);cardSound();return;
 }
 if(opponents==='hotseat'){
  cover();
  // Never animate or show faces through the full-screen privacy handoff.
  cardSound();return;
 }
 render();animateMotion(from,action);cardSound();queueBot();
 if(action.reason==='match'&&$('pileMat').classList){
  const mat=$('pileMat');mat.classList.remove('match-flash');
  // Reflow only on real DOM; leave test stubs unchanged.
  if(typeof mat.offsetWidth==='number')void mat.offsetWidth;
  mat.classList.add('match-flash');
 }
}
function play(move,source){
 if(!canAct())return;
 const from=rectOf(source);
 try{finish(E.play(game,seat(),move),from)}
 catch(e){message='That move is not allowed: '+e.message;render()}
}
function queueBot(){
 if(opponents!=='bot'||done()||seat()!==1||busy)return;
 busy=true;render();const captured=epoch;
 botTimer=setTimeout(()=>{
  if(epoch!==captured||seat()!==1||done()){busy=false;return}
  busy=false;
  try{
   const move=E.choose(game,1,botStyle);
   const source=move.type==='take'?$('pile').querySelector?.('.table-card'):$('opponentHand').querySelector?.('.back-card:last-child');
   const from=rectOf(source);
   finish(E.play(game,1,move),from);
  }
  catch(e){message='Bot could not continue: '+String(e.message);render()}
 },720);
}
function resetGame(seed){
 if(botTimer!==null)clearTimeout(botTimer);
 epoch++;busy=false;covered=false;drag=null;clearGhosts();
 game=E.create({seed,players:2,mode:MODE,firstSeat:SERIES?S.firstSeat(series):0});
 message=SERIES?'Round '+series.round+' · '+name(E.active(game))+' leads.':'You are at the table. Tap one of your cards to start.';
 $('cover').style.display='none';persist();
 if(opponents==='hotseat')cover();else{render();queueBot()}
}
$('hand').onclick=e=>{
 if(suppressClick){suppressClick=false;return}
 if(!canAct())return;
 const el=e.target.closest('[data-index]');if(!el||el.disabled)return;
 play({type:'play',index:Number(el.dataset.index)},el);
};
$('takeButton').onclick=()=>{
 const source=$('pile').querySelector?.('.table-card');
 play({type:'take'},source);
};
$('reveal').onclick=()=>{covered=false;$('cover').style.display='none';render();queueBot()};
$('newGame').onclick=()=>{
 const n=Number($('seed').value);
 if(!Number.isInteger(n)||n<0||n>4294967295){alert('Please enter a valid nonnegative seed.');return}
 opponents=$('opponents').value==='hotseat'?'hotseat':'bot';
 botStyle=['strategic','adaptive','thoughtful','basic','random'].includes($('botStyle').value)?$('botStyle').value:'strategic';
 if(SERIES)series=S.create(n);
 resetGame(n);
};
$('soundEnabled').onchange=e=>{sounds=Boolean(e.target.checked);persist()};
$('done').onclick=e=>{
 if(!e.target.closest('[data-rematch]'))return;
 if(SERIES){
  if(game.draw)S.retry(series);
  else if(series.complete)series=S.create((series.baseSeed+1)>>>0);
  else S.advance(series);
  const seed=S.roundSeed(series);$('seed').value=String(seed);resetGame(seed);
 }else{
  const seed=(game.seed+1)>>>0;$('seed').value=String(seed);resetGame(seed);
 }
};
$('export').onclick=()=>{
 const payload={version:E.VERSION,game,series,opponents,botStyle,exportedAt:new Date().toISOString()};
 const url=URL.createObjectURL(new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}));
 const a=document.createElement('a');a.href=url;a.download='tilt-one-'+game.seed+'.json';a.click();
 setTimeout(()=>URL.revokeObjectURL(url),1200);
};
// Optional drag-to-pile uses Pointer Events, with simple one-tap play as the primary path.
const hand=$('hand');
hand.addEventListener?.('pointerdown',e=>{
 if(!canAct()||e.button>0)return;
 const el=e.target.closest?.('[data-index]');if(!el||el.disabled)return;
 const r=rectOf(el);if(!r)return;
 drag={index:Number(el.dataset.index),startX:e.clientX,startY:e.clientY,source:el,rect:r,active:false,ghost:null,pointerId:e.pointerId};
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
 ghost.style.left=(e.clientX-drag.rect.width/2)+'px';
 ghost.style.top=(e.clientY-drag.rect.height/2)+'px';
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
 d.ghost?.remove();
 const r=rectOf($('pileMat'));
 const hit=!cancelled&&r&&e.clientX>=r.left-22&&e.clientX<=r.left+r.width+22&&
   e.clientY>=r.top-22&&e.clientY<=r.top+r.height+22;
 if(hit&&canAct())play({type:'play',index:d.index},{getBoundingClientRect:()=>from});
}
hand.addEventListener?.('pointerup',e=>finishDrag(e,false));
hand.addEventListener?.('pointercancel',e=>finishDrag(e,true));
const reset=query.get('new')==='1'||!restore();
if(reset){
 const seed=query.has('seed')?Number(query.get('seed')):20261111;
 const chosenSeed=Number.isInteger(seed)&&seed>=0&&seed<=4294967295?seed:20261111;
 if(SERIES)series=S.create(chosenSeed);
 game=E.create({seed:SERIES?S.roundSeed(series):chosenSeed,players:2,mode:MODE,
  firstSeat:SERIES?S.firstSeat(series):0});
 persist();
}
$('opponents').value=opponents;$('botStyle').value=botStyle;$('seed').value=String(game.seed);
$('soundEnabled').checked=sounds;
if(opponents==='hotseat'&&!done())cover();else{render();queueBot()}
})();