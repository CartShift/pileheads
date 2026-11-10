(function(){'use strict';
const E=globalThis.SparkAttack,$=id=>document.getElementById(id);
const SYMBOL={O:'●',B:'◆',P:'✦',G:'▲'},NAME={O:'Orange',B:'Blue',P:'Purple',G:'Green'};
const STORAGE='spark-attack-lab-v02';
let game=null,selected=0,busy=false,covered=false,opponents='bots',botTimer=null,epoch=0,message='Choose a card and place it before a row card.';
function card(color,attrs='',css=''){
 return '<button class="card '+color+' '+css+'" '+attrs+' aria-label="'+NAME[color]+'"><span class="corner" aria-hidden="true">'+SYMBOL[color]+'</span><b>'+SYMBOL[color]+'</b><em>'+NAME[color]+'</em><span class="corner bottom" aria-hidden="true">'+SYMBOL[color]+'</span></button>';
}
function seat(){return game?.turn%2||0}
function label(i){return opponents==='bots'?(i===0?'You':'Bot'):'Player '+(i+1)}
function done(){return !!game&&(game.winner!==null||game.drawn||!!game.blocked)}
function record(){try{localStorage.setItem(STORAGE,JSON.stringify({game,opponents,message}))}catch{}}
function restore(){try{const x=JSON.parse(localStorage.getItem(STORAGE)||'null');if(x?.game?.version==='attack-lab-0.2'){
 game=x.game;opponents=x.opponents||'bots';message=x.message||message;return true;
 }}catch{}return false}
function cleanGhosts(){document.querySelectorAll?.('.fx-ghost,.fx-numeric')?.forEach(x=>x.remove())}
function start(){
 if(botTimer!==null)clearTimeout(botTimer);
 epoch++;cleanGhosts();
 const seed=Number($('seed').value);
 if(!Number.isInteger(seed)||seed<0||seed>4294967295){alert('Seed must be a valid nonnegative integer.');return}
 game=E.create({seed,mode:$('rules').value,initialHand:Number($('initialHand').value),turnLimit:240});
 opponents=$('opponents').value;selected=0;busy=false;covered=opponents==='hotseat';$('cover').style.display='none';
 message='Choose a card, then insert it before a row card.';record();
 if(covered)showCover();else render();
}
function showCover(){
 if(done())return;
 covered=true;$('passHeading').textContent='Pass to '+label(seat());
 $('cover').style.display='flex';render();
}
function reveal(){covered=false;$('cover').style.display='none';render();if(opponents==='bots'&&seat()!==0)queueBot()}
function render(){
 if(!game)return;
 const current=seat(),p=game.players[current],over=done(),hidden=covered||(opponents==='bots'&&current!==0);
 const canPlay=!over&&!hidden&&!busy,bonus=game.pending?.kind==='bonus';
 $('status').textContent=over?(game.winner!==null?'Winner: '+label(game.winner):game.blocked?'Deck blocked: '+game.blocked:'Turn limit reached'):'Turn '+(game.turn+1)+' · '+label(current)+(bonus?' · BONUS MOVE':'');
 $('scores').innerHTML=game.players.map((player,i)=>'<div class="score '+(!over&&i===current?'active ':'')+(game.winner===i?'leader':'')+'" data-seat="'+i+'"><small>'+label(i)+'</small><strong class="score-count">'+player.hand.length+'</strong><small>cards remaining</small></div>').join('');
 $('stockCount').textContent=String(game.stock.length);$('discardCount').textContent=String(game.discard.length);
 $('rowHint').textContent=over?'Game finished':bonus?'BONUS MOVE: Play another card or end your turn.':'Choose a card and a gap. Match 3+ to earn a bonus move.';
 $('turnLabel').textContent=hidden?'Hand hidden':over?'Final hand':label(current)+' · '+p.hand.length+' cards';
 const options=canPlay?E.legal(game,current).filter(m=>m.move.index===selected):[];
 $('board').innerHTML=game.row.map(c=>card(c,'disabled','inactive')).join('');
 $('gaps').style.display=over?'none':'flex';
 $('gaps').innerHTML=!over?game.row.map((_,i)=>'<button data-pos="'+i+'" '+(!canPlay||!options.some(o=>o.move.pos===i)?'disabled':'')+' aria-label="Insert before position '+(i+1)+'">+'+(i+1)+'</button>').join(''):'';
 $('hand').innerHTML=!hidden&&!over?p.hand.map((c,i)=>card(c,canPlay?'data-index="'+i+'"':'disabled',selected===i?'picked':'' )).join(''):'<p class="muted">'+(over?'Match complete':hidden?'Hand hidden until your turn':'Resolving action')+'</p>';
 if(!hidden&&over&&game.winner===current)$('hand').innerHTML='<p class="winner">No cards left. You won!</p>';
 $('endBonus').style.display=bonus&&!over&&!hidden?'inline-flex':'none';
 $('endBonus').disabled=!canPlay;
 $('message').textContent=over?(game.winner!==null?label(game.winner)+' wins by emptying their hand. '+message:message):bonus?(label(current)+': You earned one more placement. Another Merge can attack but cannot earn a third move.'):message;
 $('attackFx').textContent=over?'Match over':busy?'Cards in motion':bonus?'BONUS MOVE · PLAY OR PASS':'Make your move';
 $('log').innerHTML=game.log.slice(-7).reverse().map(r=>'<div>Turn '+r.turn+' · '+label(r.seat)+' · '+(r.scored?'MERGE, '+r.received.length+' to opponent'+(r.bonusUsed?', BONUS played':''):'No run, edge card taken')+'</div>').join('');
 if(canPlay)attachDrag();
}
function sleep(ms){return new Promise(r=>setTimeout(r,ms))}
function rect(el){return el?.getBoundingClientRect?.()||null}
function selector(sel){return document.querySelector?.(sel)||null}
function physical(){
 return $('motion').value==='on'&&typeof $('board').querySelectorAll==='function'&&
  typeof document.createElement==='function'&&
  typeof Element!=='undefined'&&typeof Element.prototype.animate==='function'&&
  !(typeof matchMedia==='function'&&matchMedia('(prefers-reduced-motion: reduce)').matches);
}
function status(text){$('attackFx').textContent=text}
function ghost(el,dimensions){
 if(!el||!dimensions||!el.cloneNode)return null;
 const copy=el.cloneNode(true);
 copy.classList?.add('fx-ghost');copy.classList?.remove('picked','clickable','inactive','discardable');
 copy.removeAttribute?.('data-index');copy.removeAttribute?.('data-pos');copy.setAttribute?.('aria-hidden','true');
 Object.assign(copy.style,{left:dimensions.left+'px',top:dimensions.top+'px',width:dimensions.width+'px',height:dimensions.height+'px'});
 document.body.appendChild(copy);return copy;
}
function ghostColor(color,r){
 const parent=document.createElement('div');parent.innerHTML=card(color,'disabled');
 return ghost(parent.firstElementChild,r);
}
function fly(el,from,to,duration=500,arc=-44,rotation=9){
 if(!el||!from||!to)return Promise.resolve();
 const dx=to.left-from.left,dy=to.top-from.top;
 const sx=from.width?to.width/from.width:1,sy=from.height?to.height/from.height:1;
 if(!el.animate){el.remove();return Promise.resolve()}
 const a=el.animate([
  {transform:'translate3d(0,0,0) rotate(0deg)',opacity:1,offset:0},
  {transform:'translate3d('+(dx*.52)+'px,'+(dy*.5+arc)+'px,0) rotate('+rotation+'deg) scale(1.07)',offset:.53,opacity:1},
  {transform:'translate3d('+dx+'px,'+dy+'px,0) scale('+sx+','+sy+')',opacity:.85,offset:1}
 ],{duration,easing:'cubic-bezier(.22,.76,.2,1)',fill:'forwards'});
 return a.finished.catch(()=>{}).finally(()=>el.remove());
}
function stage(row){$('board').innerHTML=row.map(c=>card(c,'disabled','inactive')).join('')}
function stageHand(cards,owner){
 if(opponents==='bots'&&owner!==0){$('hand').innerHTML='<p class="muted">Opponent hand hidden</p>';return}
 $('hand').innerHTML=cards.map(c=>card(c,'disabled','inactive')).join('');
}
async function reflow(after,fromMap){
 const old=Array.from($('board').querySelectorAll('.card')),before=old.map(rect);
 stage(after);
 const now=Array.from($('board').querySelectorAll('.card')),animations=[];
 for(let i=0;i<now.length;i++){
  const origin=before[fromMap[i]],end=rect(now[i]);if(!origin||!end||!now[i].animate)continue;
  const dx=origin.left-end.left,dy=origin.top-end.top;
  if(Math.abs(dx)+Math.abs(dy)>1){
   const a=now[i].animate([{transform:'translate('+dx+'px,'+dy+'px)'},{transform:'translate(0,0)'}],
    {duration:330,easing:'cubic-bezier(.18,.8,.22,1)'});
   animations.push(a.finished.catch(()=>{}));
  }
 }
 await Promise.all(animations);
}
async function refillFrom(current,next){
 if(next.length<current.length||!next.slice(0,current.length).every((c,i)=>c===current[i])){
  stage(next);return next.slice();
 }
 const row=current.slice();
 for(let i=row.length;i<next.length;i++){
  const from=rect($('deckStack'));row.push(next[i]);stage(row);
  const target=Array.from($('board').querySelectorAll('.card')).at(-1),to=rect(target);
  target?.classList.add('fx-cover');
  const flyCard=ghostColor(next[i],from);
  if(flyCard){
   const back=document.createElement('span');back.className='fx-face-down';flyCard.appendChild(back);
   back.animate?.([{opacity:1,transform:'scaleX(1)'},{opacity:1,transform:'scaleX(.1)'},{opacity:0}],{duration:280,fill:'forwards'});
  }
  await fly(flyCard,from,to,260,-28);
  target?.classList.remove('fx-cover');
 }
 return row;
}
async function animatePlace(record){
 let row=record.before.slice();
 const {move,placed}=record;
 status('Place a card');
 const handCard=Array.from($('hand').querySelectorAll('.card'))[move.index];
 const handFrom=rect(handCard)||rect(selector('.score[data-seat="'+record.seat+'"]'));
 row.splice(move.pos,0,placed);
 const oldRects=Array.from($('board').querySelectorAll('.card')).map(rect);
 stage(row);
 const target=Array.from($('board').querySelectorAll('.card'))[move.pos],end=rect(target);
 target?.classList.add('fx-cover');
 const moving=handCard?ghost(handCard,handFrom):ghostColor(placed,handFrom);
 if(handCard)handCard.classList.add('fx-cover');
 await Promise.all([
   fly(moving,handFrom,end,480,-55),
   ...Array.from($('board').querySelectorAll('.card')).map((el,i)=>{
     if(i===move.pos)return Promise.resolve();
     const original=oldRects[i<move.pos?i:i-1],dest=rect(el);
     if(!original||!dest||!el.animate)return Promise.resolve();
     return el.animate([{transform:'translate('+(original.left-dest.left)+'px,0px)'},{transform:'translate(0,0)'}],{duration:360}).finished.catch(()=>{});
   })
 ]);
 target?.classList.remove('fx-cover');
 stageHand(record.handBefore.filter((_,i)=>i!==move.index),record.seat);
 for(let w=0;w<record.waves.length;w++){
  const wave=record.waves[w];
  if(row.join('')!==wave.before.join('')){row=wave.before.slice();stage(row)}
  status(w===0?'ATTACK!':'CHAIN REACTION!');
  const source=Array.from($('board').querySelectorAll('.card'));
  for(const idx of wave.indices)source[idx]?.classList.add('fx-matched');
  await sleep(190);
  const removed=new Set(wave.indices),tasks=[];
  // Penalties are the first N captured cards, in wave-removal order.
  const capturedBefore=record.waves.slice(0,w).reduce((n,x)=>n+x.removed.length,0);
  for(let j=0;j<wave.indices.length;j++){
   const index=wave.indices[j],el=source[index],from=rect(el);
   const toOpponent=record.penaltyIndices.includes(capturedBefore+j);
   const dest=rect(toOpponent?selector('.score[data-seat="'+(1-record.seat)+'"]'):$('discardCount'));
   if(el&&from&&dest){el.classList.add('fx-cover');tasks.push(fly(ghost(el,from),from,dest,410+j*18,-67,j%2?12:-10))}
  }
  await Promise.all(tasks);
  row=row.filter((_,i)=>!removed.has(i));
  await reflow(row,wave.before.map((_,i)=>i).filter(i=>!removed.has(i)));
 }
 if(!record.scored&&record.taken!==null&&row.length>game.rowSize){
  status('Take the rightmost card');
  const edge=Array.from($('board').querySelectorAll('.card')).at(-1),from=rect(edge);
  const destination=rect(selector('.score[data-seat="'+record.seat+'"]'))||rect($('hand'));
  edge?.classList.add('fx-cover');
  await fly(ghost(edge,from),from,destination,400,-25);
  row.pop();await reflow(row,row.map((_,i)=>i));
 }
 await refillFrom(row,record.after);
 stageHand(game.players[record.seat].hand,record.seat);
 status(record.scored?(record.received.length?'Card sent to opponent!':'Combo!'):'Card added to your hand');
 await sleep(170);
}

function progress(){
 if(done()){covered=false;$('cover').style.display='none';record();render();return}
 if(game.pending){record();busy=false;render();if(opponents==='bots'&&seat()===1)queueBot();return}
 if(opponents==='hotseat'){covered=true;record();showCover();return}
 record();busy=false;render();if(seat()===1)queueBot();
}
async function playAt(pos){
 if(!game||busy||covered||done()||(opponents==='bots'&&seat()!==0))return;
 const who=seat(),choice=E.legal(game,who).find(o=>o.move.index===selected&&o.move.pos===pos);
 if(!choice)return;
 await performPlacement(who,choice.move);
}
async function performPlacement(who,move){
 if(busy||!game||done())return;
 const current=++epoch;busy=true;
 const animated=physical();
 const result=E.place(game,who,move.index,move.pos),rec=result.record;
 record();
 try{if(animated)await animatePlace(rec)}
 catch(error){console.warn('Animation interrupted; game remains saved',error)}
 if(epoch!==current)return;
 message=rec.scored?(label(who)+' created '+rec.waves.length+' matching wave(s). '+rec.received.length+' card(s) sent to opponent.'):(label(who)+' took the rightmost card instead of scoring.');
 busy=false;progress();
}

function queueBot(){
 if(!game||done()||opponents!=='bots'||seat()!==1||busy)return;
 busy=true;render();
 botTimer=setTimeout(async()=>{
  if(!game||done()||seat()!==1){busy=false;render();return}
  busy=false;
  const options=E.legal(game,1);
  if(!options.length&&game.pending){
   E.endBonus(game,1);message='Bot finished its bonus move.';progress();
  }else if(options.length)await performPlacement(1,E.choose(game,1,'planner'));
 },420);
}
function attachDrag(){
 for(const el of $('hand').querySelectorAll('[data-index]')){
  let dragging=null;
  el.onpointerdown=e=>{
   if(e.button!==0&&e.pointerType==='mouse')return;
   dragging={id:e.pointerId,x:e.clientX,y:e.clientY,index:Number(el.dataset.index),target:null,ghost:null};
   el.setPointerCapture?.(e.pointerId);
  };
  el.onpointermove=e=>{
   if(!dragging||dragging.id!==e.pointerId)return;
   if(!dragging.ghost&&Math.hypot(e.clientX-dragging.x,e.clientY-dragging.y)<8)return;
   e.preventDefault?.();
   if(!dragging.ghost){
    dragging.ghost=ghost(el,rect(el));
    el.style.opacity='.2';
   }
   if(dragging.ghost){const box=rect(el);dragging.ghost.style.left=(e.clientX-box.width*.5)+'px';dragging.ghost.style.top=(e.clientY-box.height*.5)+'px'}
   let min=Infinity,best=null;
   const legal=E.legal(game,seat()).filter(x=>x.move.index===dragging.index);
   for(const node of $('gaps').querySelectorAll('[data-pos]')){
    const box=rect(node),x=Math.max(box.left-e.clientX,0,e.clientX-box.left-box.width);
    const y=Math.max(box.top-e.clientY,0,e.clientY-box.top-box.height);
    const distance=Math.hypot(x,y),pos=Number(node.dataset.pos);
    if(distance<48&&distance<min&&legal.some(x=>x.move.pos===pos)){best=node;min=distance}
   }
   document.querySelectorAll?.('.drop-target').forEach(el=>el.classList.remove('drop-target'));
   dragging.target=best;best?.classList.add('drop-target');
  };
  const finish=e=>{
   if(!dragging||dragging.id!==e.pointerId)return;
   const d=dragging;dragging=null;d.ghost?.remove();el.style.opacity='';
   document.querySelectorAll?.('.drop-target').forEach(x=>x.classList.remove('drop-target'));
   if(d.ghost&&d.target){selected=d.index;playAt(Number(d.target.dataset.pos))}
  };
  el.onpointerup=finish;
  el.onpointercancel=e=>{if(dragging){dragging.target=null;finish(e)}};
 }
}
async function simulation(){
 const panel=$('panel');panel.style.display='block';const target=$('simResults');
 $('simulate').disabled=true;
 const seedStart=572010,results=[];
 for(const mode of ['attack','chains','no-penalty']){
  const series=[];
  for(let i=0;i<12;i++){
   const policies=i%2?['planner','greedy']:['greedy','planner'];
   series.push(E.run({seed:seedStart+i,mode,initialHand:Number($('initialHand').value),turnLimit:240},policies));
   target.textContent='Simulating '+mode+' '+(i+1)+'/12...';
   await sleep(0);
  }
  const sorted=series.map(s=>s.turns).sort((a,b)=>a-b);
  results.push({mode,completed:series.filter(s=>s.endedBy==='winner').length,
   median:sorted[6],p90:sorted[10],blocked:series.filter(s=>s.endedBy!=='winner').length});
 }
 target.innerHTML='<table><thead><tr><th>Variant</th><th>Finished /12</th><th>Median turns</th><th>P90</th></tr></thead><tbody>'+
  results.map(r=>'<tr><td>'+r.mode+'</td><td>'+r.completed+'/12</td><td>'+r.median+'</td><td>'+r.p90+'</td></tr>').join('')+'</tbody></table>'+
  '<p>Seeded bot matches, not evidence of enjoyment. One turn is one player action, excluding mandatory discard selections.</p>';
 $('simulate').disabled=false;
}
$('start').onclick=start;
$('reveal').onclick=reveal;
$('endBonus').onclick=()=>{
 if(!game?.pending||busy||covered||done()||(opponents==='bots'&&seat()!==0))return;
 const who=seat();E.endBonus(game,who);message=label(who)+' ended the bonus move.';progress();
};
$('simulate').onclick=()=>simulation().catch(e=>{$('simResults').textContent='Simulation failed: '+e.message;$('simulate').disabled=false});
$('gaps').onclick=e=>{const node=e.target.closest('[data-pos]');if(node)playAt(Number(node.dataset.pos))};
$('hand').onclick=e=>{
 const n=e.target.closest('[data-index]');if(!n||busy)return;
 selected=Number(n.dataset.index);render()
};
$('export').onclick=()=>{if(!game)return;const payload={format:'spark-attack-v0.2',mode:game.mode,seed:game.seed,initialHand:game.initialHand,log:game.log,winner:game.winner,handSizes:game.players.map(p=>p.hand.length),blocked:game.blocked};const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='spark-attack-playtest.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),700)};
const query=typeof location!=='undefined'?new URLSearchParams(location.search):null;
const mode=query?.get('mode');
if(['attack','chains','no-penalty'].includes(mode))$('rules').value=mode;
if(['7','9','11','13'].includes(query?.get('hand')))$('initialHand').value=query.get('hand');
if(['bots','hotseat'].includes(query?.get('opponents')))$('opponents').value=query.get('opponents');
if(query?.get('seed')&&/^\d+$/.test(query.get('seed')))$('seed').value=query.get('seed');
if(mode)start();
else if(restore()){
 $('rules').value=game.mode;$('initialHand').value=String(game.initialHand);
 $('cover').style.display='none';
 covered=opponents==='hotseat';if(covered)showCover();else{render();if(opponents==='bots'&&seat()===1)queueBot()}
}else start();
})();