(function(){'use strict';
const E=globalThis.OneLab,$=id=>document.getElementById(id),KEY='one-card-one-rule-v01';
const query=new URLSearchParams(location.search);
let game=null,opponents='bot',botStyle='thoughtful',busy=false,covered=false,epoch=0,botTimer=null;
let message='Tap one of the bright cards below. That is your whole move.';
function seat(){return E.active(game)}
function done(){return E.finished(game)}
function focus(){return opponents==='bot'?0:seat()}
function name(i){return opponents==='bot'?(i===0?'You':'Bot'):'Player '+(i+1)}
function canAct(){return !busy&&!covered&&!done()&&(opponents==='hotseat'||seat()===0)}
function persist(){try{localStorage.setItem(KEY,JSON.stringify({game,opponents,botStyle,message}))}catch(err){console.warn('Save unavailable',err)}}
function restore(){
 try{
  const old=JSON.parse(localStorage.getItem(KEY)||'null');
  if(!old?.game||old.game.version!==E.VERSION||old.game.people?.length!==2)return false;
  game=old.game;opponents=old.opponents==='hotseat'?'hotseat':'bot';
  botStyle=['thoughtful','basic','random'].includes(old.botStyle)?old.botStyle:'thoughtful';
  message=typeof old.message==='string'?old.message:message;
  return true;
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
 if(!top)return['ANY CARD','The pile is empty. Any number starts it.'];
 if(top.arrow==='up')return['↑ '+top.n+' OR HIGHER','The arrow on the top card points UP.'];
 return['↓ '+top.n+' OR LOWER','The arrow on the top card points DOWN.'];
}
function render(){
 const live=canAct(),p=game.people[focus()],op=game.people[1-focus()],top=game.pile.at(-1);
 $('turn').textContent=done()?'GAME OVER':busy?'Bot playing…':covered?'Pass the phone':name(seat())+' · turn '+(game.turn+1);
 $('stock').textContent='Deck: '+game.stock.length;
 $('other').textContent=name(1-focus())+': '+op.hand.length+' cards';
 const r=rule();$('condition').textContent=r[0];$('ruleTip').textContent=r[1];
 $('pile').innerHTML=top?makeCard(top,'disabled','table-card')+'<span class="pile-count">'+game.pile.length+' in pile</span>':
  '<div class="empty-pile">EMPTY PILE</div>';
 $('message').textContent=done()?(game.draw?'Match ended at the safety turn limit.':name(game.winner)+' got rid of every card!'):message;
 $('handTitle').textContent=opponents==='hotseat'?name(focus())+' · YOUR CARDS':'YOUR '+p.hand.length+' CARDS';
 const legal=live?E.legal(game,seat()):[];
 const playable=new Set(legal.filter(x=>x.type==='play').map(x=>x.index));
 $('hand').innerHTML=live?p.hand.map((c,i)=>makeCard(c,'data-index="'+i+'" '+(playable.has(i)?'':'disabled'),
  playable.has(i)?'playable':'blocked')).join(''):
  '<p style="font-size:13px;color:#647b70">Cards hidden while waiting for the next turn.</p>';
 const take=legal.some(x=>x.type==='take');
 $('take').hidden=!take||!live;
 $('handHint').textContent=done()?'Start a new match to play again.':
  covered?'Hand hidden for the next player.':
  busy?'Opponent is deciding.':
  take?'None of your cards fits. Take one card to clear the pile.':
  live?'Tap any bright card. Dimmed cards cannot be played.':
  'Waiting for the other player.';
 $('done').hidden=!done();
 if(done()){
  $('done').innerHTML='<h2>'+ (game.draw?'It was a draw.':name(game.winner)+' wins!')+
    '</h2><p>'+game.turn+' turns played. Did this feel easier to understand than CROSS or FORGE?</p>'+
    '<button type="button" class="primary" data-rematch="1">Play another match</button>';
 }else $('done').innerHTML='';
}
function cover(){
 covered=true;
 $('coverTitle').textContent='Pass to '+name(seat());
 $('cover').style.display='flex';render();
}
function finish(action){
 const card=action.card;
 if(action.action==='take'){
  message=name(action.seat)+' could not play and took the top card. The remaining pile was cleared.';
 }else if(action.reason==='match'){
  message=name(action.seat)+' played '+card.n+' '+(card.arrow==='up'?'↑':'↓')+
  '. Same number as the previous card: the entire pile cleared!';
 }else{
  message=name(action.seat)+' played '+card.n+' '+(card.arrow==='up'?'↑':'↓')+
  '. The next player must play '+(card.arrow==='up'?'the same number or higher.':'the same number or lower.');
 }
 persist();
 if(done()){covered=false;$('cover').style.display='none';busy=false;render();return}
 if(opponents==='hotseat'){cover();return}
 render();queueBot();
}
function play(move){
 if(!canAct())return;
 try{const result=E.play(game,seat(),move);finish(result)}
 catch(e){message='That move is not allowed: '+e.message;render()}
}
function queueBot(){
 if(opponents!=='bot'||done()||seat()!==1||busy)return;
 busy=true;render();const captured=epoch;
 botTimer=setTimeout(()=>{
  if(epoch!==captured||seat()!==1||done()){busy=false;return}
  busy=false;
  try{const move=E.choose(game,1,botStyle);finish(E.play(game,1,move))}
  catch(e){message='Bot could not continue: '+String(e.message);render()}
 },480);
}
function newMatch(seed){
 if(botTimer!==null)clearTimeout(botTimer);
 epoch++;busy=false;covered=false;
 game=E.create({seed,players:2});
 message='The first turn is easy: tap any bright card to place it on the pile.';
 $('cover').style.display='none';persist();
 if(opponents==='hotseat')cover();else{render();queueBot()}
}
$('hand').onclick=e=>{
 if(!canAct())return;
 const el=e.target.closest('[data-index]');
 if(!el||el.disabled)return;
 play({type:'play',index:Number(el.dataset.index)});
};
$('takeButton').onclick=()=>play({type:'take'});
$('reveal').onclick=()=>{covered=false;$('cover').style.display='none';render();queueBot()};
$('newGame').onclick=()=>{
 const n=Number($('seed').value);
 if(!Number.isInteger(n)||n<0||n>4294967295){alert('Please enter a valid nonnegative seed.');return}
 opponents=$('opponents').value==='hotseat'?'hotseat':'bot';
 botStyle=['thoughtful','basic','random'].includes($('botStyle').value)?$('botStyle').value:'thoughtful';
 newMatch(n);
};
$('done').onclick=e=>{
 if(!e.target.closest('[data-rematch]'))return;
 const seed=(game.seed+1)>>>0;$('seed').value=String(seed);newMatch(seed);
};
$('export').onclick=()=>{
 const payload={version:E.VERSION,game,opponents,botStyle,exportedAt:new Date().toISOString()};
 const url=URL.createObjectURL(new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}));
 const a=document.createElement('a');a.href=url;a.download='tilt-one-'+game.seed+'.json';a.click();
 setTimeout(()=>URL.revokeObjectURL(url),1200);
};
const reset=query.get('new')==='1'||!restore();
if(reset){
 const seed=query.has('seed')?Number(query.get('seed')):20261111;
 game=E.create({seed:Number.isInteger(seed)&&seed>=0&&seed<=4294967295?seed:20261111,players:2});
 persist();
}
$('opponents').value=opponents;$('botStyle').value=botStyle;$('seed').value=String(game.seed);
if(opponents==='hotseat'&&!done())cover();else{render();queueBot()}
})();