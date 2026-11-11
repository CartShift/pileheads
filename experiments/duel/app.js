(function(){'use strict';
const E=globalThis.SparkDuel, $=id=>document.getElementById(id);
const NAME={O:'Orange',B:'Blue',P:'Purple',G:'Green'};
const ICON={O:'●',B:'◆',P:'✦',G:'▲'},KEY='spark-duel-lab-v01';
let game=null,selected=0,opponents='bots',botStyle='tactical',covered=false,busy=false,botTimer=null,epoch=0;
let message='Choose a card from your hand, then swap it with a different-colored row card.';
function seat(){return game?game.turn%game.players.length:0}
function done(){return !!game&&(!!game.blocked||game.turn>=game.turnsPerPlayer*game.players.length)}
function focus(){return opponents==='bots'?0:seat()}
function label(index){return opponents==='bots'?(index===0?'You':'Bot'):'Player '+(index+1)}
function canPlay(){return !!game&&!done()&&!busy&&!covered&&(opponents==='hotseat'||seat()===0)}
function card(color,attrs='',css=''){
 return '<button type="button" class="card '+color+' '+css+'" '+attrs+' aria-label="'+NAME[color]+' card">'+
  '<span class="corner" aria-hidden="true">'+ICON[color]+'</span><b aria-hidden="true">'+ICON[color]+'</b><small>'+NAME[color]+'</small></button>';
}
function persist(){try{localStorage.setItem(KEY,JSON.stringify({game,opponents,botStyle,message}))}catch(error){console.warn('Save unavailable',error)}}
function restore(){
 try{const saved=JSON.parse(localStorage.getItem(KEY)||'null');
  if(saved?.game?.version!=='duel-lab-0.1'||!['open','hidden'].includes(saved.game.information))return false;
  game=saved.game;opponents=saved.opponents==='hotseat'?'hotseat':'bots';botStyle=saved.botStyle==='basic'?'basic':'tactical';message=saved.message||message;
  return true;
 }catch{return false}
}
function winnerText(){
 if(!done())return '';
 if(game.blocked)return 'Game stopped: '+game.blocked+'. Deck rule needs a replay.';
 const points=game.players.map(p=>p.score);
 if(points[0]===points[1])return 'Draw: '+points[0]+' points each.';
 return label(points[0]>points[1]?0:1)+' wins with '+Math.max(...points)+' points!';
}
function render(){
 if(!game)return;
 const active=seat(),player=focus(),other=1-player,available=canPlay(),ended=done(),p=game.players[player],op=game.players[other];
 if(selected>=p.hand.length)selected=0;
 const chosen=p.hand[selected];
 $('status').textContent=ended?'Game over':opponents==='bots'&&active===1?'Bot planning · '+(game.turn+1)+'/'+(game.turnsPerPlayer*2):
  'Turn '+(game.turn+1)+'/'+(game.turnsPerPlayer*2)+' · '+label(active);
 $('scores').innerHTML=game.players.map((x,i)=>'<div class="score '+(!ended&&active===i?'current':'')+'"><small>'+
  label(i)+' · '+(Math.max(0,game.turnsPerPlayer-Math.floor((game.turn+1-i)/2)))+' turns left</small><strong>'+
  x.score+'</strong><small>captured cards</small></div>').join('');
 $('stockCount').textContent=String(game.stock.length);
 $('discardCount').textContent=String(game.discard.length);
 $('ownTitle').textContent=opponents==='bots'?'Your hand':label(player)+' hand';
 $('otherTitle').textContent=opponents==='bots'?'Bot hand':label(other)+' hand';
 $('ownCount').textContent=p.hand.length+' cards';
 $('otherCount').textContent=op.hand.length+' cards';
 const visible=!covered||ended;
 const openInfo=game.information==='open';
 $('hand').innerHTML=visible?p.hand.map((c,i)=>card(c,available?'data-index="'+i+'"':'disabled',
  available&&i===selected?'selected':'')).join(''):'<div class="hidden">Pass the device to reveal</div>';
 $('otherHand').innerHTML=visible&&openInfo?op.hand.map(c=>card(c,'disabled')).join(''):
  '<div class="hidden">'+op.hand.length+' cards hidden'+(visible?'':' · device handoff')+'</div>';
 const opts=available?E.legal(game,active).filter(x=>x.move.index===selected):[];
 $('board').innerHTML=game.row.map((c,pos)=>{
  const playable=opts.some(x=>x.move.pos===pos);
  return card(c,playable?'data-pos="'+pos+'"':'disabled',
   available?(playable?'available':'unavailable'):'');
 }).join('');
 $('instructions').textContent=ended?'The match has finished.':covered?'Pass the device.':
  opponents==='bots'&&active===1?'The bot is choosing a counter-move.':
  'Swap '+(chosen?NAME[chosen]:'a hand card')+' with any different-colored card in the row.';
 $('message').textContent=ended?winnerText()+' '+message:message;
 $('log').innerHTML=game.log.slice(-7).reverse().map(record=>
  '<div>Turn '+record.turn+' · '+label(record.seat)+': '+NAME[record.handBefore[record.move.index]]+
  ' for '+NAME[record.exchanged]+' · '+(record.score?'captured '+record.score:'set up the row')+'</div>').join('');
}
function showCover(){
 if(done())return;
 covered=true;
 $('passTitle').textContent='Pass to '+label(seat());
 $('cover').style.display='flex';
 render();
}
function next(){
 persist();
 if(done()){covered=false;$('cover').style.display='none';busy=false;render();return}
 if(opponents==='hotseat'&&game.information==='hidden'){showCover();return}
 covered=false;$('cover').style.display='none';render();
 if(opponents==='bots'&&seat()===1)queueBot();
}
function move(who,m){
 if(!game||done()||game.turn%2!==who)return;
 const record=E.play(game,who,m);
 selected=0;
 message=label(who)+' exchanged '+NAME[record.handBefore[record.move.index]]+' for '+NAME[record.exchanged]+
  (record.score?', captured '+record.score+' card'+(record.score===1?'':'s')+'.':'. You may have prepared a later combination.');
 next();
}
function queueBot(){
 if(!game||done()||opponents!=='bots'||seat()!==1||busy)return;
 busy=true;render();
 const session=epoch;
 botTimer=setTimeout(()=>{
  if(epoch!==session||!game||done()||seat()!==1){busy=false;render();return}
  busy=false;
  const policy=botStyle==='basic'?'greedy':game.information==='open'?'counter':'planner';
  try{move(1,E.choose(game,1,policy))}catch(error){
   game.blocked='bot_error';message='Bot error: '+String(error.message);next();
  }
 },550);
}
function start(){
 if(botTimer!==null)clearTimeout(botTimer);
 epoch++;busy=false;selected=0;covered=false;
 const seed=Number($('seed').value);
 if(!Number.isInteger(seed)||seed<0||seed>4294967295){alert('Seed must be a nonnegative integer under 2^32.');return}
 opponents=$('opponents').value==='hotseat'?'hotseat':'bots';botStyle=$('botStyle').value==='basic'?'basic':'tactical';
 game=E.create({seed,players:2,turnsPerPlayer:10,deckSize:144,action:'exchange',refillRule:'safe',
  rowSize:9,handSize:3,colorCount:4,information:$('information').value});
 message='Think ahead: the row card you exchange becomes part of your next hand.';
 $('cover').style.display='none';
 persist();
 if(opponents==='hotseat'&&game.information==='hidden')showCover();
 else render();
}
$('start').onclick=start;
$('rematch').onclick=start;
$('reveal').onclick=()=>{covered=false;$('cover').style.display='none';render()};
$('hand').onclick=event=>{
 if(!canPlay())return;
 const node=event.target.closest('[data-index]');
 if(!node)return;
 selected=Number(node.dataset.index);render();
};
$('board').onclick=event=>{
 if(!canPlay())return;
 const node=event.target.closest('[data-pos]');
 if(!node)return;
 const pos=Number(node.dataset.pos),index=selected,active=seat();
 const legal=E.legal(game,active).some(x=>x.move.index===index&&x.move.pos===pos);
 if(!legal)return;
 move(active,{index,pos});
};
$('export').onclick=()=>{
 if(!game)return;
 const payload={format:'spark-duel-playtest-v0.1',information:game.information,seed:game.seed,
  opponents,game,results:game.players.map(p=>({seat:p.seat,score:p.score})),collectedAt:new Date().toISOString()};
 const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});
 const url=URL.createObjectURL(blob),link=document.createElement('a');
 link.href=url;link.download='spark-duel-'+game.seed+'.json';link.click();
 setTimeout(()=>URL.revokeObjectURL(url),800);
};
const query=typeof location!=='undefined'?new URLSearchParams(location.search):null;
if(['open','hidden'].includes(query?.get('information')))$('information').value=query.get('information');
if(['bots','hotseat'].includes(query?.get('opponents')))$('opponents').value=query.get('opponents');
if(['tactical','basic'].includes(query?.get('bot')))$('botStyle').value=query.get('bot');
if(query?.get('seed')&&/^\d+$/.test(query.get('seed')))$('seed').value=query.get('seed');
if(query?.get('new')==='1')start();
else if(restore()){
 $('information').value=game.information;
 $('opponents').value=opponents;
 $('botStyle').value=botStyle;
 $('seed').value=String(game.seed);
 if(opponents==='hotseat'&&game.information==='hidden'&&!done())showCover();
 else {render();if(opponents==='bots'&&seat()===1)queueBot()}
}else start();
})();