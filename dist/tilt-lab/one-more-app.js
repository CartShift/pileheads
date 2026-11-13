(function(){
'use strict';
const E=window.TiltOneMore,P=window.TiltPlaytest;
const $=id=>document.getElementById(id),SAVE='tilt-one-more-local-v1';
let g=null,selected=null,playAs='bot',privacy=false,focused=false,runId='',startedAt=null,botQueued=false,usedBots=false,completedRecord=null;
const get=k=>{try{return localStorage.getItem(k)}catch(e){return null}};
const set=(k,v)=>{try{localStorage.setItem(k,v)}catch(e){}};
const id=()=>Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,10);
function keep(){set(SAVE,JSON.stringify({g,playAs,runId,startedAt,usedBots}))}
function seedRandom(){
 if(window.crypto&&typeof window.crypto.getRandomValues==='function'){const v=new Uint32Array(1);window.crypto.getRandomValues(v);return v[0]}
 return Math.floor(Math.random()*4294967296);
}
function start(){
 const players=Number($('playerCount').value),value=Number($('seed').value);
 const seed=$('shuffleSeed').checked?seedRandom():Number.isInteger(value)&&value>=0&&value<=4294967295?value:20261113;
 g=E.start({players,seed});$('seed').value=String(seed);
 playAs=$('seats').value;runId=id();startedAt=Date.now();usedBots=false;selected=null;
 privacy=playAs==='hotseat';completedRecord=null;keep();render();
}
function restore(){
 const saved=get(SAVE);
 if(saved){try{
  const data=JSON.parse(saved);
  E.check(data.g);if(data.g.version!==E.VERSION)throw Error('Older rules');
  g=data.g;playAs=data.playAs==='hotseat'?'hotseat':'bot';
  runId=typeof data.runId==='string'?data.runId:id();startedAt=Number.isFinite(data.startedAt)?data.startedAt:null;
  usedBots=Boolean(data.usedBots);
  $('playerCount').value=String(g.people.length);$('seed').value=String(g.seed);
  $('seats').value=playAs;privacy=playAs==='hotseat'&&g.winner===null&&!g.draw;
 }catch(e){start();return}}else{start();return}
 captureResult();render();
}
function captureResult(){
 if(!P||!(g.winner!==null||g.draw))return;
 completedRecord=P.record(localStorage,{game:g,runId,playAs:usedBots?'bot':playAs,startedAt});
 if(completedRecord){
  $('feedbackNote').value=completedRecord.notes||'';
  $('feedbackStatus').textContent=(completedRecord.sessionType==='human-hotseat'?'Human game':'Game involving bots')+' completed · '+completedRecord.turns+' turns. Add your observations.';
 }
}
function card(c,extraClass='',isButton=false,index=0,disabled=false){
 const face='<span class="corner">TILT / '+String(c.id).padStart(2,'0')+'</span>'+
   '<span class="rank">'+c.n+'</span><span class="arrow" aria-hidden="true">'+(c.arrow==='up'?'↑':'↓')+'</span>'+
   '<span class="footer">ONE MORE</span>';
 if(!isButton)return'<span class="card '+extraClass+'" data-dir="'+c.arrow+'">'+face+'</span>';
 const rot=(index-(g.people[g.current].hand.length-1)/2)*-2.5;
 return'<button type="button" class="card '+extraClass+'" data-index="'+index+'" data-dir="'+c.arrow+'"'+
  ' style="--tilt:'+rot+'deg;--z:'+(index+1)+'" aria-label="Card '+c.n+' arrow '+(c.arrow==='up'?'up':'down')+
  (extraClass.includes('bounce')?', BOUNCE available':'')+'" aria-pressed="'+(selected===index)+'"'+
  (disabled?' disabled':'')+'>'+face+'</button>';
}
function backs(count){
 const n=Math.min(5,count);let html='<div class="backs">';
 for(let i=0;i<n;i++)html+='<span class="back" aria-hidden="true" style="--rot:'+((i-(n-1)/2)*6)+'deg">T</span>';
 return html+'</div>';
}
function selectedMove(){
 if(selected===null)return null;
 const moves=E.legal(g);
 return moves.find(x=>x.index===selected&&x.type==='bounce')||
  moves.find(x=>x.index===selected&&x.type==='extra')||
  moves.find(x=>x.index===selected&&x.type==='play')||
  moves.find(x=>x.index===selected&&x.type==='trade')||null;
}
function describe(event){
 const labels={played:'played a card.',clear:'matched the number and cleared the pile!',
  bonus:'risked ONE MORE. Can the next player bounce it?',bounce:'BOUNCE! Sent the whole pile back.',
  stop:'stopped safely.',trade:'traded a card for the pile top.', 'bonus-survived':'the final bonus survived. Game over!'};
 $('lastAction').textContent='Player '+(event.seat+1)+' '+(labels[event.effect]||'finished a move.');
}
function move(m){
 if(!m||privacy)return;
 const from=g.current;let e;
 try{e=E.play(g,m)}catch(err){$('hint').textContent='That play is not legal. Select a highlighted card.';return}
 selected=null;describe(e);keep();captureResult();
 if(playAs==='hotseat'&&g.current!==from&&g.winner===null&&!g.draw)privacy=true;
 render();
}
function stage(){
 if(g.winner!==null)return ['Player '+(g.winner+1)+' wins!','The stock ran out and their hand is empty. Would you want another round?','PLAY AGAIN · NEW SHUFFLE'];
 if(g.draw)return ['Game stopped at the safety limit','This needs a rule review.','TRY ANOTHER DEAL'];
 const moves=E.legal(g),bot=playAs==='bot'&&g.current!==0;
 if(bot)return ['Opponent is choosing…','Their hand is hidden.',''];
 if(g.phase==='choice'){
  return ['Your one decision: STOP or ONE MORE?','STOP ends your turn. Or lift a highlighted card and tap the pile to risk a bounce.','STOP · END TURN'];
 }
 if(g.pending){
  const matching=moves.filter(x=>x.type==='bounce');
  if(matching.length)return ['BOUNCE AVAILABLE!','The last card is '+g.pending.rank+'. Play the SAME number to send the entire pile to the previous player. Or play another legal card normally.',''];
  return ['They risked ONE MORE','Their bonus card is '+g.pending.rank+'. You do not have a matching number. Play a legal card normally.',''];
 }
 if(moves.length&&moves.every(x=>x.type==='trade'))
  return ['No legal card: TRADE','Choose any card to discard from your hand, then tap the pile to take its top card.',''];
 return ['Play one card','Tap a highlighted card, then tap the pile. The arrow on the pile shows what is legal.',''];
}
function render(){
 if(!g)return;
 $('turn').textContent='TURN '+(g.turn+1);
 $('currentSeat').textContent=g.winner!==null?'Game finished':'Player '+(g.current+1);
 $('phaseLabel').textContent=g.phase==='choice'?'YOUR CHOICE':g.pending?'BOUNCE?':'PLAY';
 $('stock').textContent=g.stock.length;$('burn').textContent=g.burn.length;
 $('stockVisual').classList.toggle('empty',!g.stock.length);
 $('opponents').innerHTML=g.people.map((p,i)=>i===g.current?'':'<div class="opponent">PLAYER '+(i+1)+backs(p.hand.length)+p.hand.length+' cards</div>').join('');
 const last=E.top(g);
 const bonus=g.pending&&g.pile.at(-1)?.id===g.pending.id;
 let stack='';
 if(g.pile.length){
  const visible=g.pile.slice(-3);
  for(let i=0;i<visible.length;i++){
   const c=visible[i],offset=(i-visible.length+1)*5;
   const isBonus=bonus&&i===visible.length-1;
   stack+='<div style="position:absolute;inset:0;display:grid;place-items:center;--x:'+(offset+(isBonus?12:0))+'px;--y:'+(-offset)+'px;--rotation:'+((i-visible.length+1)*-3)+'deg">'+card(c,isBonus?'bonus-card':'')+'</div>';
  }
 }
 $('piles').innerHTML='<button type="button" class="pile-zone'+(selectedMove()?' can-drop':'')+'" data-pile="1" aria-label="Place selected card on the shared pile; '+g.pile.length+' cards">'+
  '<span class="pile-label">SHARED PILE</span><span class="stack">'+(stack||'<span class="empty-pile">ANY CARD</span>')+
  '</span><span class="pile-count">'+g.pile.length+' cards</span></button>';
 $('ruleFocus').textContent=last?(last.arrow==='up'?'↑ NEXT: '+last.n+' OR HIGHER':'↓ NEXT: '+last.n+' OR LOWER'):'EMPTY PILE · ANY NUMBER';
 if(bonus)$('ruleFocus').textContent='ONE MORE: '+g.pending.rank+' · MATCH IT TO BOUNCE';
 const moves=E.legal(g),h=g.people[g.current].hand,hidden=privacy||(playAs==='bot'&&g.current!==0&&g.winner===null&&!g.draw);
 $('seatName').textContent='PLAYER '+(g.current+1)+' · HAND';
 $('handNote').textContent=hidden?'Hidden until your turn is revealed':'Tap a card, then tap the central pile';
 $('hand').innerHTML=hidden?backs(h.length):h.map((c,i)=>{
  const legal=moves.some(x=>x.index===i),bounce=moves.some(x=>x.type==='bounce'&&x.index===i);
  return card(c,(selected===i?'selected ':'')+(bounce?'bounce-card':''),true,i,!legal);
 }).join('');
 const [title,hint,button]=stage();$('prompt').textContent=title;$('hint').textContent=hint;
 $('actions').innerHTML=button?'<button type="button" class="action" id="mainAction">'+button+'</button>':'';
 $('roundInfo').textContent=g.people.map(p=>'P'+(p.seat+1)+': '+p.hand.length+' cards').join(' · ')+
  ' · '+g.stock.length+' in deck · '+g.stats.extra+' ONE MORE plays';
 $('privacy').hidden=!privacy||g.winner!==null||g.draw;
 $('privacyTitle').textContent='Player '+(g.current+1)+', take your seat';
 if(!privacy)scheduleBot();
}
function scheduleBot(){
 if(botQueued||playAs!=='bot'||g.current===0||g.winner!==null||g.draw)return;
 botQueued=true;const oldRun=runId,oldGame=g;
 setTimeout(()=>{
  botQueued=false;
  if(oldRun!==runId||oldGame!==g){scheduleBot();return}
  if(playAs!=='bot'||g.current===0||g.winner!==null||g.draw)return;
  usedBots=true;
  move(E.bot(g,g.current%3===0?'safe':g.current%2===0?'bold':'mixed'));
 },g.phase==='choice'?250:580);
}
$('hand').addEventListener('click',e=>{
 if(privacy||playAs==='bot'&&g.current!==0)return;
 const c=e.target.closest('[data-index]');if(!c||c.disabled)return;
 const i=Number(c.dataset.index);selected=selected===i?null:i;render();
});
$('piles').addEventListener('click',()=>{
 if(privacy||playAs==='bot'&&g.current!==0)return;
 const m=selectedMove();if(m)move(m);else $('hint').textContent='Lift a playable card first.';
});
$('actions').addEventListener('click',e=>{
 if(!e.target.closest('#mainAction'))return;
 if(g.winner!==null||g.draw){start();return}
 if(g.phase==='choice')move({type:'stop'});
});
$('new').addEventListener('click',()=>{
 if(g&&g.winner===null&&!g.draw&&g.actions&&!confirm('Start over and replace this unfinished game?'))return;
 start();
});
$('seats').addEventListener('change',()=>{
 playAs=$('seats').value;privacy=playAs==='hotseat'&&g.winner===null&&!g.draw;keep();render();
});
$('seed').addEventListener('change',()=>{$('shuffleSeed').checked=false});
$('focus').addEventListener('click',()=>{
 focused=!focused;document.body.classList.toggle('focus',focused);
 $('focus').textContent=focused?'Exit table focus':'Table focus';$('focus').setAttribute('aria-pressed',String(focused));
});
$('reveal').addEventListener('click',()=>{privacy=false;render()});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&selected!==null){selected=null;render()}});
$('saveFeedback').addEventListener('click',()=>{
 if(!completedRecord){$('feedbackStatus').textContent='Finish a game first. Feedback is attached to a completed playtest.';return}
 P.updateNotes(localStorage,completedRecord.id,{replay:'not-recorded',notes:$('feedbackNote').value});
 $('feedbackStatus').textContent='Feedback saved on this device. Thank you for testing the rules.';
});
$('exportFeedback').addEventListener('click',()=>{
 if(!P)return;const blob=new Blob([P.exportData(localStorage)],{type:'application/json'});
 const url=URL.createObjectURL(blob),a=document.createElement('a');
 a.href=url;a.download='tilt-one-more-playtests-'+new Date().toISOString().slice(0,10)+'.json';
 document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url);
});
$('clearFeedback').addEventListener('click',()=>{
 if(!confirm('Delete saved TILT Mechanics Lab playtest observations from this browser?'))return;
 P.clear(localStorage);completedRecord=null;$('feedbackNote').value='';$('feedbackStatus').textContent='Local playtest observations cleared.';
});
restore();
})();
