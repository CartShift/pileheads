(function(){'use strict';
const E=globalThis.ZigzagLab,$=id=>document.getElementById(id);
const KEY='tilt-zigzag-core-v01',query=new URLSearchParams(location.search);
let game=null,opponents='bot',botStyle='strategic',busy=false,covered=false,pending=null;
let message='Choose one card. If there is a Zigzag available, you can decide whether to continue.';
let epoch=0,botTimer=null,drag=null,suppressClick=false,sounds=false,voice=null;
const name=s=>opponents==='bot'?(s===0?'You':'Bot'):'Player '+(s+1);
const seat=()=>E.active(game),done=()=>E.finished(game);
const focus=()=>opponents==='bot'?0:seat();
const canAct=()=>!busy&&!covered&&!done()&&(opponents==='hotseat'||seat()===0);

function save(){
 try{localStorage.setItem(KEY,JSON.stringify({game,opponents,botStyle,message,sounds}))}
 catch(e){console.warn('Local save unavailable',e)}
}
function restore(){
 try{
  const o=JSON.parse(localStorage.getItem(KEY)||'null');
  if(!o||o.game?.version!==E.VERSION||o.game?.people?.length!==2)return false;
  game=o.game;opponents=o.opponents==='hotseat'?'hotseat':'bot';
  botStyle=['strategic','greedy','single','random'].includes(o.botStyle)?o.botStyle:'strategic';
  message=typeof o.message==='string'?o.message:message;sounds=o.sounds===true;
  return true;
 }catch{return false}
}
function card(c,attrs='',cls=''){
 const dir=c.arrow==='up'?'UP':'DOWN',symbol=c.arrow==='up'?'↑':'↓';
 return '<button type="button" class="card '+cls+'" data-arrow="'+c.arrow+'" '+attrs+
  ' aria-label="Number '+c.n+', arrow '+dir+'">'+
  '<span class="corner">TILT / ZIGZAG</span>'+
  '<span class="number">'+c.n+'</span>'+
  '<span class="arrow" aria-hidden="true">'+symbol+'</span>'+
  '<span class="footer">'+dir+' NEXT</span></button>';
}
function backs(n){
 const visible=Math.min(n,5);
 return Array.from({length:visible},(_,i)=>
  '<span class="back-card" aria-hidden="true" style="--fan:'+((i-(visible-1)/2)*5)+'deg;--lift:'+((i%2)*-2)+'px"></span>').join('');
}
function topInView(){
 return pending!==null?game.people[focus()].hand[pending]:game.pile.at(-1);
}
function activeContinuations(){
 if(!canAct()||pending===null)return [];
 return E.legal(game,seat()).filter(m=>m.type==='play'&&m.indices.length===2&&m.indices[0]===pending)
  .map(m=>m.indices[1]);
}
function render(){
 const current=seat(),viewer=focus(),you=game.people[viewer],op=game.people[1-viewer],
  preview=pending!==null,visibleTop=topInView(),legal=canAct()?E.legal(game,current):[];
 $('turn').textContent=done()?'GAME OVER':covered?'PASS THE PHONE':busy?'BOT THINKING':
  current===viewer?'YOUR TURN':name(current).toUpperCase()+' TURN';
 $('opponentName').textContent=name(1-viewer).toUpperCase();
 $('opponentHand').innerHTML=backs(op.hand.length);
 $('other').textContent=op.hand.length+' '+(op.hand.length===1?'card':'cards')+' in hand';
 $('stock').textContent=game.stock.length+' left';
 $('deckVisual').innerHTML=game.stock.length?'<span class="back-card" aria-hidden="true"></span>':
  '<span class="empty-stock">Empty</span>';
 $('deckVisual').className=game.stock.length?'stack-back':'';
 const discarded=game.ashes.length;
 $('discard').className=discarded?'discard-card':'discard-empty';
 $('discard').textContent=discarded?String(game.ashes.at(-1).n):'EMPTY';
 $('discard').setAttribute?.('aria-label',discarded?'Discard pile, '+discarded+' cards':'Empty discard pile');
 $('discardCount').textContent=discarded+' '+(discarded===1?'card':'cards');
 $('pileMat').classList?.toggle('pile-preview',preview);
 const pileCount=game.pile.length+(preview?1:0);
 $('pile').innerHTML=visibleTop?
  (pileCount>2?'<span class="pile-under"></span>':'')+
  (pileCount>1?'<span class="pile-under two"></span>':'')+
  card(visibleTop,'disabled','table-card')+
  '<span class="pile-count">'+pileCount+(preview?' · preview':'')+'</span>':
  '<div class="empty-pile">PLACE A CARD</div>';
 if(!visibleTop){
  $('condition').textContent='ANY CARD';$('ruleTip').textContent='The pile is empty.';
 }else{
  $('condition').textContent=(visibleTop.arrow==='up'?'↑ ':'↓ ')+visibleTop.n+
   (visibleTop.arrow==='up'?' OR HIGHER':' OR LOWER');
  $('ruleTip').textContent=preview?'For your OPTIONAL second card. Its arrow must point the other way.':
   'The top arrow sets the next rule.';
 }
 const moves=activeContinuations();
 const allowed=preview?new Set(moves):
  new Set(legal.filter(m=>m.type==='play').map(m=>m.indices[0]));
 const displayHand=!covered&&(opponents==='bot'||(canAct()&&!done()));
 $('hand').innerHTML=displayHand?you.hand.map((c,i)=>
  card(c,'data-index="'+i+'" '+(canAct()&&allowed.has(i)?'':'disabled'),
   preview&&i===pending?'selected':canAct()&&allowed.has(i)?'playable':'blocked')).join(''):
  '<p style="font-size:12px;color:#d8e8da">Hand hidden for the next player.</p>';
 $('chainControls').hidden=!preview||!canAct();
 $('take').hidden=!canAct()||preview||!legal.some(m=>m.type==='take');
 $('handTitle').textContent=opponents==='bot'?'YOUR HAND · '+you.hand.length:
  name(viewer).toUpperCase()+' · YOUR HAND';
 $('handHint').textContent=done()?'Want to challenge your opponent again?':
  covered?'Private cards hidden during handoff.':
  busy?'Your hand remains here while the bot decides.':
  preview?'Bright cards can complete your Zigzag. Or end the turn now.':
  legal.some(m=>m.type==='take')?'Nothing fits. Take the top card.':
  'Tap a bright card. Only if a second card fits will you get a choice to continue.';
 $('message').textContent=preview?
  'Your first card is on the table. Continue with an opposite arrow, or stop to leave your trap.':
  done()?(game.draw?'The game hit its safety limit.':name(game.winner)+' played the last card!'):message;
 $('done').hidden=!done();
 $('done').innerHTML=done()?'<h2>'+(game.draw?'Draw':name(game.winner)+' wins!')+'</h2>'+
  '<p>'+game.turn+' turns · '+game.log.filter(e=>e.cards.length===2).length+
  ' two-card Zigzags · '+game.log.filter(e=>e.action==='take').length+' pickups.</p>'+
  '<button type="button" class="primary" data-rematch="1">Play again</button>':'';
}
function cover(){
 pending=null;covered=true;$('coverTitle').textContent='Pass to '+name(seat());
 $('cover').style.display='flex';render();
}
function bounds(el){
 if(typeof el?.getBoundingClientRect!=='function')return null;
 const r=el.getBoundingClientRect();
 if(!r||!Number.isFinite(r.left)||!Number.isFinite(r.top))return null;
 return{left:r.left,top:r.top,width:r.width,height:r.height};
}
function reduced(){return typeof window!=='undefined'&&window.matchMedia?.('(prefers-reduced-motion: reduce)').matches}
function motion(from,event,pickedCard){
 if(!from||reduced()||!document.body?.appendChild)return;
 const target=event.action==='take'?
  (opponents==='bot'&&event.seat===1?$('opponentHand'):$('hand')):
  event.reason==='match'?$('discard'):$('pile');
 const to=bounds(target);if(!to)return;
 const shown=event.action==='take'?[pickedCard].filter(Boolean):event.cards||[];
 if(!shown.length)return;
 for(let i=0;i<shown.length;i++){
  const ghost=document.createElement('div');
  ghost.className='flying-card';ghost.innerHTML=card(shown[i],'disabled');
  ghost.style.position='fixed';ghost.style.left=from.left+'px';ghost.style.top=from.top+'px';
  ghost.style.pointerEvents='none';document.body.appendChild(ghost);
  const dx=to.left+to.width/2-from.left-from.width/2,
    dy=to.top+to.height/2-from.top-from.height/2;
  if(typeof ghost.animate==='function'){
   const a=ghost.animate([{transform:'translate(0,0) rotate(-5deg)',opacity:1},
    {transform:'translate('+dx+'px,'+dy+'px) rotate('+(i*4-2)+'deg) scale(.9)',opacity:.92}],
    {duration:300,delay:100*i,easing:'cubic-bezier(.2,.75,.22,1)',fill:'forwards'});
   a.onfinish=()=>ghost.remove();a.oncancel=()=>ghost.remove();
  }else ghost.remove();
 }
}
function tapSound(){
 if(!sounds||typeof window==='undefined')return;
 const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)return;
 try{
  voice=voice||new Audio();if(voice.state==='suspended')voice.resume();
  const len=Math.floor(voice.sampleRate*.055),buffer=voice.createBuffer(1,len,voice.sampleRate),
   data=buffer.getChannelData(0);
  for(let i=0;i<len;i++)data[i]=(Math.random()*2-1)*Math.exp(-i/(len*.26));
  const src=voice.createBufferSource(),filter=voice.createBiquadFilter(),gain=voice.createGain();
  filter.type='bandpass';filter.frequency.value=1450;filter.Q.value=.7;gain.gain.value=.055;
  src.buffer=buffer;src.connect(filter);filter.connect(gain);gain.connect(voice.destination);src.start();
 }catch(e){console.debug('Optional audio unavailable',e)}
}
function commit(move,source){
 if(!canAct())return;
 const from=bounds(source),pickedCard=move.type==='take'?game.pile.at(-1):null;
 pending=null;
 let event;
 try{event=E.play(game,seat(),move)}
 catch(e){message='Cannot make that move: '+e.message;render();return}
 try{
  if(event.action==='take')message=name(event.seat)+' picked up the top card. The rest cleared.';
  else{
   const names=event.cards.map(c=>c.n+(c.arrow==='up'?'↑':'↓'));
   message=name(event.seat)+(names.length===2?' built a Zigzag: ':' played ')+names.join(' → ')+
    (event.reason==='match'?' · matching rank cleared the pile!':'.');
  }
  save();
  if(done()){
   covered=false;$('cover').style.display='none';busy=false;render();
  }else if(opponents==='hotseat')cover();
  else{render();queueBot()}
  if(opponents!=='hotseat')motion(from,event,pickedCard);
  tapSound();
 }catch(e){console.warn('Visual feedback failed after a valid move',e);render()}
}
function selectCard(index,source){
 if(!canAct()||!Number.isInteger(index))return;
 const legal=E.legal(game,seat());
 if(pending!==null){
  const action=legal.find(x=>x.type==='play'&&x.indices.length===2&&
   x.indices[0]===pending&&x.indices[1]===index);
  if(action)commit(action,source);
  return;
 }
 const first=legal.find(x=>x.type==='play'&&x.indices.length===1&&x.indices[0]===index);
 if(!first)return;
 const possibleSecond=legal.some(x=>x.type==='play'&&x.indices.length===2&&x.indices[0]===index);
 if(possibleSecond){
  pending=index;render();
  // This is a preview: the underlying engine has not consumed or refilled cards yet.
 }else commit(first,source);
}
function queueBot(){
 if(opponents!=='bot'||done()||seat()!==1||busy)return;
 busy=true;render();const requested=epoch;
 botTimer=setTimeout(()=>{
  if(requested!==epoch||done()||seat()!==1){busy=false;return}
  busy=false;
  const from=$('opponentHand').querySelector?.('.back-card:last-child')||$('opponentHand');
  try{const move=E.choose(game,1,botStyle);
   const source=move.type==='take'?
     ($('pile').querySelector?.('.table-card')||$('pile')):from;
   commitBot(move,source);
  }catch(e){message='Bot could not continue: '+e.message;render()}
 },700);
}
function commitBot(move,source){
 const from=bounds(source),pickedCard=move.type==='take'?game.pile.at(-1):null;
 const event=E.play(game,1,move);
 if(event.action==='take')message='Bot could not follow and took a card.';
 else{
  const seq=event.cards.map(c=>c.n+(c.arrow==='up'?'↑':'↓')).join(' → ');
  message=event.cards.length===2?'Bot made a Zigzag: '+seq:
   'Bot played '+seq;
  if(event.reason==='match')message+=' · pile cleared!';
 }
 save();render();motion(from,event,pickedCard);tapSound();queueBot();
}
function restart(seed){
 if(botTimer!==null)clearTimeout(botTimer);
 epoch++;busy=false;covered=false;pending=null;drag=null;
 game=E.create({seed});message='Make the first move. Play one card, or plan a Zigzag.';
 $('cover').style.display='none';save();
 if(opponents==='hotseat')cover();
 else{render();queueBot()}
}
$('hand').onclick=e=>{
 if(suppressClick){suppressClick=false;return}
 if(!canAct())return;
 const source=e.target.closest?.('[data-index]');if(!source||source.disabled)return;
 selectCard(Number(source.dataset.index),source);
};
$('endTurn').onclick=()=>{
 if(!canAct()||pending===null)return;
 const source=$('hand').querySelector?.('[data-index="'+pending+'"]');
 commit({type:'play',indices:[pending]},source);
};
$('changeCard').onclick=()=>{pending=null;render()};
$('takeButton').onclick=()=>{
 if(!canAct()||pending!==null)return;
 const source=$('pile').querySelector?.('.table-card')||$('pile');
 commit({type:'take'},source);
};
$('reveal').onclick=()=>{covered=false;$('cover').style.display='none';render();queueBot()};
$('newGame').onclick=()=>{
 const seed=Number($('seed').value);
 if(!Number.isInteger(seed)||seed<0||seed>4294967295){alert('Please enter a valid nonnegative seed.');return}
 opponents=$('opponents').value==='hotseat'?'hotseat':'bot';
 botStyle=['strategic','greedy','single','random'].includes($('botStyle').value)?$('botStyle').value:'strategic';
 restart(seed);
};
$('soundEnabled').onchange=e=>{sounds=Boolean(e.target.checked);save()};
$('done').onclick=e=>{
 if(!e.target.closest?.('[data-rematch]'))return;
 const seed=(game.seed+1)>>>0;$('seed').value=String(seed);restart(seed);
};
$('export').onclick=()=>{
 const payload={game,opponents,botStyle,exportedAt:new Date().toISOString()};
 const url=URL.createObjectURL(new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}));
 const link=document.createElement('a');link.href=url;link.download='tilt-zigzag-'+game.seed+'.json';
 link.click();setTimeout(()=>URL.revokeObjectURL(url),1200);
};
// Optional drag-to-center; tap remains the primary accessible interaction.
const hand=$('hand');
hand.addEventListener?.('pointerdown',e=>{
 if(!canAct()||e.button>0)return;
 const source=e.target.closest?.('[data-index]');if(!source||source.disabled)return;
 const r=bounds(source);if(!r)return;
 drag={source,index:Number(source.dataset.index),pointerId:e.pointerId,
  x:e.clientX,y:e.clientY,rect:r,active:false,ghost:null};
 try{source.setPointerCapture?.(e.pointerId)}catch(e){console.debug('Pointer capture unavailable',e)}
});
hand.addEventListener?.('pointermove',e=>{
 if(!drag||e.pointerId!==drag.pointerId)return;
 if(!drag.active&&Math.hypot(e.clientX-drag.x,e.clientY-drag.y)>14){
  drag.active=true;const ghost=drag.source.cloneNode(true);
  ghost.removeAttribute('data-index');ghost.classList.add('drag-ghost');
  ghost.disabled=true;ghost.style.position='fixed';ghost.style.width=drag.rect.width+'px';
  ghost.style.height=drag.rect.height+'px';ghost.style.pointerEvents='none';
  document.body.appendChild(ghost);drag.ghost=ghost;drag.source.classList.add('dragging-original');
 }
 if(!drag.active)return;
 e.preventDefault?.();
 drag.ghost.style.left=e.clientX-drag.rect.width/2+'px';
 drag.ghost.style.top=e.clientY-drag.rect.height/2+'px';
 const r=bounds($('pileMat')),inside=r&&e.clientX>=r.left-22&&e.clientX<=r.left+r.width+22&&
  e.clientY>=r.top-22&&e.clientY<=r.top+r.height+22;
 $('pileMat').classList?.toggle('drop-active',!!inside);
});
function finishDrag(e,cancelled){
 if(!drag||e.pointerId!==drag.pointerId)return;
 const d=drag;drag=null;
 try{d.source.releasePointerCapture?.(e.pointerId)}catch{}
 d.source.classList?.remove('dragging-original');
 $('pileMat').classList?.remove('drop-active');
 if(!d.active)return;
 e.preventDefault?.();suppressClick=true;setTimeout(()=>{suppressClick=false},0);
 const r=bounds($('pileMat')),hit=!cancelled&&r&&e.clientX>=r.left-22&&e.clientX<=r.left+r.width+22&&
  e.clientY>=r.top-22&&e.clientY<=r.top+r.height+22;
 d.ghost?.remove();
 if(hit&&canAct())selectCard(d.index,d.source);
}
hand.addEventListener?.('pointerup',e=>finishDrag(e,false));
hand.addEventListener?.('pointercancel',e=>finishDrag(e,true));
const init=query.get('new')==='1'||!restore();
if(init){
 const n=query.has('seed')?Number(query.get('seed')):20261111;
 game=E.create({seed:Number.isInteger(n)&&n>=0&&n<=4294967295?n:20261111});
 save();
}
$('opponents').value=opponents;$('botStyle').value=botStyle;$('seed').value=String(game.seed);
$('soundEnabled').checked=sounds;
if(opponents==='hotseat'&&!done())cover();else{render();queueBot()}
})();