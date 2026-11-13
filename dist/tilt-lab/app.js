(function(){
'use strict';
const E=window.TiltMechanics;
const $=id=>document.getElementById(id);
const modeButtons=['chain','twin'];
const rules={
 chain:{
  title:'CONTROL / CHAIN',
  points:[
   'Play a card on the pile. The visible arrow says whether the next number must be equal/higher (↑) or equal/lower (↓). Matching numbers clear the pile.',
   'After a normal card, STOP: rotate it to choose the next direction, ↑ or ↓. Or PRESS: add one or two more legal cards sideways, with a different rank from the preceding card.',
   'The next player may counter a press with any card matching a sideways number. That card is discarded; the challenger takes the last 2 or 3 pile cards. The rest of that pile is discarded. The counter uses the defender’s turn.',
   'If they accept, play continues from the final sideways card. If you cannot play, exchange the pile’s top card with a card in your hand; the surrendered card is discarded.',
   'Refill to 4 at the end of your turn, while cards remain. Once the stock is empty, the first player to empty their hand wins. A final press must survive its counter window.'
  ],
  caveat:'Design test: Does choosing control instead of a chain make both options worth using?'
 },
 twin:{
  title:'TWIN PILES / CROSS-CLEAR',
  points:[
   'Two piles begin with one face-up card each. Every turn, choose either pile for a legal play using that pile’s visible ↑ or ↓ arrow.',
   'Matching the top number of your chosen pile clears that pile.',
   'COLLISION: match the number on top of the other pile. Both piles are discarded, and you may discard one extra card from your hand for free.',
   'If neither pile accepts any card, choose a card from your hand and a pile. Trade your card for its top card. Your surrendered card and the rest of that pile are discarded.',
   'Refill to 4 at the end of each turn, while cards remain. Once the stock is empty, the first player to empty their hand wins.'
  ],
  caveat:'Design test: Does choosing between lanes create interesting positioning, or merely obvious collisions?'
 }
};
let mode='chain',g=null,selected=null,playAs='bot',botScheduled=false,privacy=false,focused=false;
const key=m=>'tilt-mechanics-lab-'+m+'-v1';
function storageGet(k){try{return localStorage.getItem(k)}catch(e){return null}}
function storageSet(k,v){try{localStorage.setItem(k,v)}catch(e){}}
function keep(){storageSet(key(mode),JSON.stringify({game:g,playAs}));}
function makeGame(){let seed=Number($('seed').value);if(!Number.isInteger(seed)||seed<0||seed>4294967295)seed=20261113;
 const players=Number($('playerCount').value)||2;
 playAs=$('seats').value;g=E.start({mode,players,seed});
 selected=null;privacy=playAs==='hotseat';$('seed').value=String(seed);keep();render();}
function loadMode(next){
 mode=next;selected=null;privacy=false;
 const saved=storageGet(key(mode));
 if(saved){try{const data=JSON.parse(saved);E.check(data.game);if(data.game.mode!==mode)throw Error('Wrong mode');
  g=data.game;playAs=data.playAs==='hotseat'?'hotseat':'bot';$('playerCount').value=String(g.people.length);
  $('seats').value=playAs;$('seed').value=String(g.seed);privacy=playAs==='hotseat'&&g.winner===null&&!g.draw;
 }catch(e){makeGame();return}}
 else{makeGame();return}
 render();
}
function card(c,classes='',extra=''){
 const actual=E.face(c),rotate=c.face&&c.face!==c.arrow;
 return '<span class="card '+classes+(rotate?' rotated':'')+'" data-dir="'+actual+'" '+extra+'>'+
 '<span class="corner">TILT / '+String(c.id).padStart(2,'0')+'</span>'+
 '<span class="rank">'+c.n+'</span><span class="arrow" aria-hidden="true">'+(actual==='up'?'↑':'↓')+'</span>'+
 '<span class="footer">'+(rotate?'CONTROLLED':'TILT • EXPERIMENT')+'</span></span>';
}
function clearSelected(){selected=null}
function getSelectedMove(lane){
 if(selected===null)return null;
 const actions=E.legal(g);const t=g.phase==='extend'?'extend':g.phase==='counter'?'counter':g.phase==='bonus'?'burnBonus':'play';
 return actions.find(m=>m.type===t&&m.index===selected&&(m.lane===undefined||m.lane===lane))||
  actions.find(m=>m.type==='exchange'&&m.index===selected&&(m.lane===undefined||m.lane===lane))||null;
}
function commit(move){
 if(!move)return;
 const before=g.current;
 let event;
 try{event=E.play(g,move)}catch(err){$('hint').textContent='That card cannot be played there.';return}
 clearSelected();keep();describe(event);if(playAs==='hotseat'&&g.current!==before&&g.winner===null&&!g.draw)privacy=true;render();
}
function describe(ev){
 const label='Player '+(ev.seat+1);
 const effect={match:'cleared a pile by matching the rank.',press:'added a sideways card.', 'press-finished':'issued a challenge.',
  accepted:'accepted the challenge.',counter:'countered the chain!','control-up':'chose ↑ for the next card.',
  'control-down':'chose ↓ for the next card.',collision:'caused a collision: BOTH piles clear!',
  bonus:'discarded an extra card.',exchange:'traded a card for the pile top.',pickup:'picked up the pile top.'};
 $('lastAction').textContent=label+' '+(effect[ev.effect]||'played a card.');
}
function backs(handN){
 const n=Math.min(5,handN);let html='';
 for(let i=0;i<n;i++)html+='<span aria-hidden="true" class="back" style="--rot:'+((i-(n-1)/2)*6)+'deg">T</span>';
 return '<div class="backs">'+html+'</div>';
}
function pileMarkup(p,lane){
 const playable=E.legal(g);
 const action=selected!==null?getSelectedMove(lane):null;
 const pickup=playable.some(m=>m.type==='pickup'&&m.lane===lane);
 const topCards=p.slice(-3),offset=Math.max(0,p.length-3);
 let stack='';
 for(let i=0;i<topCards.length;i++){
  const c=topCards[i],absIndex=i+offset;
  const sideways=mode==='chain'&&g.piles[0]===p&&(
   (g.pending&&absIndex>=p.length-g.pending.count+1)||
   (g.chain&&absIndex>=p.length-g.chain.count+1));
  stack+='<div style="position:absolute;inset:0;display:grid;place-items:center;--x:'+((i-1)*4)+'px;--y:'+((2-i)*4)+'px;--rotation:'+((i-1)*4)+'deg">'+card(c,sideways?'sideways':'')+'</div>';
 }
 const empty='<div class="empty-pile">PLAY<br>HERE</div>';
 return '<button type="button" class="pile-zone'+(action||pickup?' can-drop':'')+'" data-lane="'+lane+'" aria-label="'+(mode==='chain'?'Shared pile':'Pile '+(lane+1))+' with '+p.length+' cards">'+
  '<span class="pile-label">'+(mode==='chain'?'SHARED PILE':'PILE '+(lane+1))+'</span>'+
  '<span class="stack">'+(p.length?stack:empty)+'</span><span class="pile-count">'+p.length+' cards</span></button>';
}
function drawHand(){
 const hiddenBot=playAs==='bot'&&g.current!==0&&g.winner===null&&!g.draw;
 const h=g.people[g.current].hand,legal=E.legal(g);
 if(hiddenBot){$('hand').innerHTML=backs(h.length);return}
 const cards=h.map((c,i)=>{
  const allowed=legal.some(a=>a.index===i&&['play','extend','counter','exchange','burnBonus'].includes(a.type));
  const degrees=(i-(h.length-1)/2)*Math.max(-4,-1.3);
  return '<button type="button" class="card'+(selected===i?' selected':'')+'" data-dir="'+E.face(c)+'" data-index="'+i+'" '+
   'style="--tilt:'+degrees+'deg;--z:'+(i+1)+'" '+(!allowed?'disabled':'')+
   ' aria-pressed="'+(selected===i)+'" aria-label="Card '+c.n+' arrow '+E.face(c)+(allowed?', playable':'')+'">'+
    '<span class="corner">TILT / '+String(c.id).padStart(2,'0')+'</span><span class="rank">'+c.n+'</span>'+
    '<span class="arrow" aria-hidden="true">'+(E.face(c)==='up'?'↑':'↓')+'</span>'+
    '<span class="footer">TILT • EXPERIMENT</span></button>';
 });
 $('hand').innerHTML=cards.join('');
}
function actionButton(type,label,secondary=false,other=''){
 return '<button type="button" class="action'+(secondary?' secondary':'')+'" data-action="'+type+'" '+other+'>'+label+'</button>';
}
function setPrompt(){
 const legal=E.legal(g),seat=g.current,botTurn=playAs==='bot'&&seat!==0;
 let title='',hint='',acts='';
 if(g.winner!==null){title='Player '+(g.winner+1)+' wins';hint='The stock is empty and their hand is empty. Start another game to compare a new strategy.'}
 else if(g.draw){title='Time limit reached';hint='The prototype exceeded its safety limit. Try a different seed.'}
 else if(botTurn){title='Player '+(seat+1)+' is thinking…';hint='Watching the opponent’s real cards is disabled.'}
 else if(mode==='chain'&&g.phase==='extend'){
  if(g.chain.count===1){
   title='Stop safely, or press your luck?';hint='STOP lets you control the next arrow. PRESS puts another legal card sideways and risks a counter.';
   acts=actionButton('stop-up','STOP · choose ↑')+actionButton('stop-down','STOP · choose ↓')+
    '<span class="sr-only">Or select another card and tap the central pile to press.</span>';
  }else{
   title='The pile is at risk';hint='Stop now to challenge the next player, or place one more legal card sideways.';
   acts=actionButton('stop','CHALLENGE NOW');
  }
 }else if(mode==='chain'&&g.phase==='counter'){
  title='Counter the chain?';hint='Match the rank of a sideways card to make the challenger take '+g.pending.count+' cards. Otherwise accept and play.';
  acts=actionButton('accept','ACCEPT & PLAY',true);
  if(legal.some(m=>m.type==='counter'))acts+=actionButton('counter','COUNTER WITH SELECTED CARD');
 }else if(mode==='twin'&&g.phase==='bonus'){
  title='Collision! Both piles cleared';hint='Choose any one card to discard for free. This is the reward for lining up both pile numbers.';
  acts=actionButton('bonus','DISCARD SELECTED CARD');
  if(legal.some(x=>x.type==='skipBonus'))acts=actionButton('skipBonus','CONTINUE');
 }else if(legal.every(m=>['exchange','pickup'].includes(m.type))){
  title='No legal card: exchange';
  hint=mode==='chain'?'Select a card to surrender, then tap the central pile to trade it for the top card.':'Select a card to surrender, then tap either pile to trade. This burns a card and prevents endless loops.';
 }else{
  title=mode==='chain'?'Choose a card to place':'Choose a card and a lane';
  hint=mode==='chain'?'Play a legal card on the pile, then choose whether to stop or extend.':'Each pile has its own arrow. A rank matching the OTHER pile clears both.';
 }
 $('prompt').textContent=title;$('hint').textContent=hint;$('actions').innerHTML=acts;
}
function render(){
 if(!g)return;
 modeButtons.forEach(m=>$('tab-'+m).setAttribute('aria-pressed',String(mode===m)));
 $('modeLabel').textContent=mode==='chain'?'CONTROL / CHAIN':'TWIN PILES';
 $('phaseLabel').textContent=String(g.phase).toUpperCase();
 $('turn').textContent='TURN '+(g.turn+1);
 $('currentSeat').textContent=g.winner!==null?'Finished':g.draw?'Draw':'Player '+(g.current+1)+' at the table';
 $('stock').textContent=g.stock.length;$('burn').textContent=g.burn.length;
 $('stockVisual').classList.toggle('empty',!g.stock.length);
 $('opponents').innerHTML=g.people.map((p,i)=>i===g.current?'':('<div class="opponent">PLAYER '+(i+1)+backs(p.hand.length)+'<span>'+p.hand.length+' cards</span></div>')).join('');
 $('piles').innerHTML=g.piles.map((p,i)=>pileMarkup(p,i)).join('');
 $('seatName').textContent='PLAYER '+(g.current+1)+' · '+(playAs==='bot'&&g.current===0?'YOUR HAND':'HAND');
 $('handNote').textContent=mode==='chain'?'Tap a card to lift it. Tap the pile to place it.':'Tap a card to lift it. Tap either valid pile to place it.';
 drawHand();setPrompt();
 $('roundInfo').textContent=g.people.map(p=>'P'+(p.seat+1)+': '+p.hand.length).join(' · ')+
 ' · '+g.stock.length+' left in stock · '+g.actions+' actions';
 $('privacy').hidden=!privacy||g.winner!==null||g.draw;
 $('privacyTitle').textContent='Player '+(g.current+1)+', take your seat';
 const rule=rules[mode];$('ruleTitle').textContent=rule.title;
 $('ruleList').innerHTML=rule.points.map(p=>'<li>'+p+'</li>').join('');
 $('ruleCaveat').textContent=rule.caveat;
 if(!privacy)scheduleBot();
}
function scheduleBot(){
 if(botScheduled||playAs!=='bot'||g.current===0||g.winner!==null||g.draw)return;
 botScheduled=true;
 setTimeout(()=>{
  botScheduled=false;if(playAs!=='bot'||g.current===0||g.winner!==null||g.draw)return;
  const next=E.bot(g,g.current%3===0?'careful':g.current%2===0?'bold':'mixed');
  commit(next);
 },g.phase==='extend'?260:520);
}
$('hand').addEventListener('click',event=>{
 if(privacy)return;
 const item=event.target.closest('[data-index]');if(!item||item.disabled)return;
 const index=Number(item.dataset.index);selected=selected===index?null:index;render();
});
$('piles').addEventListener('click',event=>{
 if(privacy||g.winner!==null||g.draw)return;
 const item=event.target.closest('[data-lane]');if(!item)return;
 const lane=Number(item.dataset.lane),move=getSelectedMove(lane);
 if(move){commit(move);return}
 const pickup=E.legal(g).find(m=>m.type==='pickup'&&m.lane===lane);
 if(pickup)commit(pickup);
 else $('hint').textContent=selected===null?'Lift a playable card first.':'That card cannot be played on this pile.';
});
$('actions').addEventListener('click',event=>{
 if(privacy)return;const action=event.target.closest('[data-action]');if(!action)return;
 const type=action.dataset.action;
 let move=null;
 if(type==='stop-up')move={type:'stop',arrow:'up'};
 if(type==='stop-down')move={type:'stop',arrow:'down'};
 if(type==='stop')move={type:'stop'};
 if(type==='accept')move={type:'accept'};
 if(type==='skipBonus')move={type:'skipBonus'};
 if(type==='counter'||type==='bonus'){
  const a=getSelectedMove(0);
  if(a&&(type==='counter'?a.type==='counter':a.type==='burnBonus'))move=a;
  else $('hint').textContent='Select a playable card from your hand first.';
 }
 if(move)commit(move);
});
modeButtons.forEach(m=>$('tab-'+m).addEventListener('click',()=>{if(m!==mode)loadMode(m)}));
$('new').addEventListener('click',()=>{if(g&&g.actions&&!confirm('Replace the current '+rules[mode].title+' game?'))return;makeGame()});
$('seats').addEventListener('change',()=>{playAs=$('seats').value;privacy=playAs==='hotseat'&&g.winner===null&&!g.draw;keep();render()});
$('focus').addEventListener('click',()=>{
 focused=!focused;document.body.classList.toggle('focus',focused);
 $('focus').textContent=focused?'Exit table focus':'Table focus';$('focus').setAttribute('aria-pressed',String(focused));
});
$('reveal').addEventListener('click',()=>{privacy=false;render()});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&selected!==null){selected=null;render()}});
loadMode('chain');
})();
