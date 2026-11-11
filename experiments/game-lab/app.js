(function(){'use strict';
const E=globalThis.SparkGameLab,$=id=>document.getElementById(id);
const LABEL={O:'Orange',B:'Blue',P:'Purple',G:'Green'},ICON={O:'●',B:'◆',P:'✦',G:'▲'},KEY='spark-game-lab-session-01';
const q=new URLSearchParams(location.search);
let mode=q.get('game')==='signal'?'signal':'claim',selected=null,covered=false,busy=false,botTimer=null,epoch=0,session={};
const validKinds=['claim','signal'];
function newGame(kind,seed){return kind==='claim'?E.createClaim({seed,players:2}):E.createSignal({seed})}
function init(){
 try{
  const old=JSON.parse(localStorage.getItem(KEY)||'null');
  if(old&&old.version===1&&old.games?.claim?.kind==='claim'&&old.games?.signal?.kind==='signal'){
   session=old;
   if(validKinds.includes(q.get('game')))mode=q.get('game');
   else mode=validKinds.includes(old.mode)?old.mode:'claim';
  }else throw Error('New playtest');
 }catch{
  session={version:1,mode,games:{claim:newGame('claim',20261111),signal:newGame('signal',20261111)},
    options:{claim:{opponents:'bot',botStyle:'planner'},signal:{opponents:'bot',botStyle:'planner'}},
    feedback:{claim:'Select a card. Every play increases pressure in one lane.',signal:'Select a bidding card, then a prize. Your choice stays secret.'},
    awaitingSignal:false};
 }
 if(q.get('new')==='1'){
  const newSeed=q.get('seed')&&/^\d+$/.test(q.get('seed'))?Number(q.get('seed')):20261111;
  session.games[mode]=newGame(mode,newSeed);
  session.feedback[mode]=mode==='claim'?'Choose one of your four cards, then decide whether to bank or build.':'Choose a bidding card. Then choose one of the three public prizes.';
  if(mode==='signal')session.awaitingSignal=false;
 }
 ensureMeta();
 syncSettings();
 save();
 if(options().opponents==='hotseat'&&!done()&&!(mode==='signal'&&session.awaitingSignal))showCover();
 else{render();scheduleBot()}
}
function ensureMeta(){
 session.options=session.options||{};
 for(const k of validKinds)session.options[k]=session.options[k]||{opponents:'bot',botStyle:'planner'};
 session.feedback=session.feedback||{claim:'Choose a card.',signal:'Choose a card.'};
}
function game(){return session.games[mode]}
function options(){return session.options[mode]}
function save(){session.mode=mode;try{localStorage.setItem(KEY,JSON.stringify(session))}catch(e){console.warn('Save unavailable',e)}}
function done(){return mode==='claim'?E.claimDone(game()):E.signalDone(game())}
function seat(){const g=game();return mode==='claim'?g.turn%g.players.length:E.signalSeat(g)}
function focus(){return options().opponents==='bot'?0:seat()}
function label(p){return options().opponents==='bot'?(p===0?'You':'Bot'):'Player '+(p+1)}
function canAct(){return !covered&&!busy&&!done()&&!(mode==='signal'&&session.awaitingSignal)&&
  (options().opponents==='hotseat'||seat()===0)}
function cardHtml(c,attrs='',extra=''){
 return '<button type="button" class="gamecard '+c.c+' '+extra+'" '+attrs+' aria-label="'+LABEL[c.c]+' '+c.v+'">'+
   '<span class="corner">'+c.v+'</span><span class="symbol" aria-hidden="true">'+ICON[c.c]+'</span><span class="number">'+c.v+'</span></button>';
}
function endLine(){
 const g=game(),s=g.players.map(p=>p.score);
 if(s[0]===s[1])return 'Draw, '+s[0]+' points each.';
 return label(s[0]>s[1]?0:1)+' wins, '+Math.max(...s)+' to '+Math.min(...s)+'!';
}
function renderHeader(){
 const g=game(),turn=seat();
 $('tabClaim').setAttribute('aria-selected',String(mode==='claim'));
 $('tabSignal').setAttribute('aria-selected',String(mode==='signal'));
 $('phase').textContent=done()?'Match finished':mode==='claim'?'Turn '+(g.turn+1)+'/'+(g.turnsPerPlayer*g.players.length)+' · '+label(turn):
  'Round '+(g.round+1)+'/'+g.rounds+' · '+(session.awaitingSignal?'Reveal complete':label(turn)+' bidding');
 $('scores').innerHTML=g.players.map(p=>'<div class="score '+(!done()&&turn===p.seat?'turn':'')+'"><small>'+label(p.seat)+'</small><b>'+p.score+'</b><small>points</small></div>').join('');
}
function renderClaim(){
 const g=game(),p=focus();
 let html='<div class="section-title">Three contested lanes · 3 cards can be banked · 5+ cards score double</div><div class="lanes">';
 for(const c of E.CLAIM_COLORS){
  const arr=g.lanes[c],leader=E.leader(arr,g.players.length),leadName=leader===null?'Contested':label(leader)+' leads';
  const canBank=arr.length>=3&&leader===p;
  html+='<article class="lane"><h3>'+ICON[c]+' '+LABEL[c]+'<span>'+arr.length+'/7</span></h3>'+
    '<div class="strength"><span>'+label(0)+' <b>'+E.strength(arr,0)+'</b></span><span>'+label(1)+' <b>'+E.strength(arr,1)+'</b></span></div>'+
    '<div class="line-cards">'+(arr.map(x=>'<span class="mini-card p'+x.owner+'" title="'+label(x.owner)+' '+LABEL[c]+' '+x.card.v+'">'+x.card.v+'</span>').join('')||'<span class="lane-note">Empty lane</span>')+'</div>'+
    '<div class="lane-note">'+(arr.length>=3?(canBank?'You can bank it':leadName+' · '+(arr.length>=5?arr.length*2:arr.length)+' points'):'Build to 3 cards')+'</div></article>';
 }
 html+='</div>';
 $('stage').innerHTML=html;
 $('instruction').textContent=done()?endLine():covered?'Pass the device to the next player.':
   options().opponents==='bot'&&seat()===1?'Bot is considering the visible lanes.':
   selected===null?'STEP 1: Tap a card from your hand.':'STEP 2: Add your '+LABEL[g.players[p].hand[selected].c]+' '+g.players[p].hand[selected].v+
    ' and choose whether to bank a lane or keep building.';
 $('handTitle').textContent=options().opponents==='bot'?'Your four cards':label(p)+' · your four cards';
 $('handCount').textContent='Opponent cards are hidden. Blue-edge tokens = '+label(0)+'; coral-edge = '+label(1)+'.';
 const show=!covered&&canAct();
 $('hand').innerHTML=show?g.players[p].hand.map((c,i)=>cardHtml(c,'data-hand="'+i+'"',i===selected?'selected':'')).join(''):
    '<span class="lane-note">Hand hidden during handoff or opponent turn.</span>';
 let buttons='',title='Step 1: Choose one card from your hand';
 if(canAct()&&selected!==null){
  const card=g.players[p].hand[selected],opts=E.claimLegal(g,p).filter(m=>m.index===selected);
  title='Step 2: Decide to cash out or press your luck';
  for(const m of opts){
   const analysis=E.claimAnalysis(g,p,m);
   const text=m.bank?'PLAY + BANK '+LABEL[m.bank]+' · '+analysis.immediate+' pts':
     'PLAY + KEEP BUILDING'+(analysis.immediate?' · auto score '+analysis.immediate:'');
   buttons+='<button data-claim-index="'+m.index+'" data-claim-bank="'+(m.bank||'')+'" class="'+(m.bank?'primary':'secondary')+'">'+text+'</button>';
  }
 }
 $('actionTitle').textContent=title;
 $('actionButtons').innerHTML=buttons||'<span class="lane-note">'+(done()?'Match completed.':selected===null?'Select one hand card above.':'Your choices will appear here.')+'</span>';
 $('reveal').hidden=true;$('reveal').innerHTML='';
 $('history').innerHTML=g.log.slice(-7).reverse().map(e=>'<div>Turn '+e.turn+' · '+label(e.seat)+' played '+LABEL[e.lane]+' '+e.card.v+
  (e.bank?' · banked '+LABEL[e.bank.lane]+' for '+e.bank.points:' · pressed')+
  (e.trigger?' · overload: '+(e.trigger.winner===null?'lost to tie':e.trigger.points+' points'):'')+'</div>').join('');
}
function renderSignal(){
 const g=game(),p=focus(),actor=seat();
 $('stage').innerHTML='<div class="section-title">Three public prizes · secret bids · stronger bid wins if you collide</div><div class="prizes">'+
  g.prizes.map((c,i)=>'<article class="prize">'+cardHtml(c,'disabled')+
  '<strong>PRIZE '+(i+1)+'</strong><div class="hint">'+c.v+' points · matching color gives +2 bid strength</div></article>').join('')+'</div>';
 $('instruction').textContent=done()?endLine():session.awaitingSignal?'ROUND COMPLETE: See the revealed bids below.':
  covered?'Pass the device. Your bid will stay secret.':
  options().opponents==='bot'&&actor===1?'The bot is making its secret bid.':
  selected===null?'STEP 1: Tap one of your five cards to bid.':'STEP 2: Pick the prize you want. Your bid is hidden until both players choose.';
 $('handTitle').textContent=label(p)+' · your bidding hand';
 $('handCount').textContent='Higher card wins on a collision. Same color as prize: +2 strength.';
 const show=!covered&&canAct();
 $('hand').innerHTML=show?g.players[p].hand.map((c,i)=>cardHtml(c,'data-hand="'+i+'"',i===selected?'selected':'')).join(''):
  '<span class="lane-note">Hidden while commitments are exchanged or results are revealed.</span>';
 let buttons='',title=selected===null?'Step 1: Choose a card to bid':'Step 2: Select your prize secretly';
 if(canAct()&&selected!==null){
  const card=g.players[p].hand[selected];
  for(let slot=0;slot<g.prizes.length;slot++){
   const prize=g.prizes[slot],strength=E.signalPower(card,prize);
   buttons+='<button data-signal-index="'+selected+'" data-signal-slot="'+slot+'" class="primary">'+
    'Bid for PRIZE '+(slot+1)+' · '+prize.v+' pts · strength '+strength+'</button>';
  }
 }
 $('actionTitle').textContent=title;
 $('actionButtons').innerHTML=buttons||'<span class="lane-note">'+(done()?'Match completed.':selected===null?'Select a hand card above.':'Wait for both bids.')+'</span>';
 $('reveal').hidden=!session.awaitingSignal||!g.lastEvent;
 if(session.awaitingSignal&&g.lastEvent){
  const e=g.lastEvent,bids=e.bids.map(b=>'Player '+(b.seat+1)+' bid '+LABEL[b.card.c]+' '+b.card.v+
    ' on Prize '+(b.slot+1)+' (strength '+E.signalPower(b.card,e.claims[b.slot].prize)+')');
  const outcomes=e.claims.filter(c=>c.winner!==null).map(c=>
    label(c.winner)+' won Prize '+(c.slot+1)+' ('+c.prize.v+' pts)').join('; ')||'No prizes awarded';
  $('reveal').innerHTML='<h3>Round '+e.round+' · Bids revealed</h3><p>'+bids.join(' · ')+'</p><p>'+outcomes+'.</p>'+
   '<p>'+(e.claims.some(c=>c.contested)?'A contested prize went to the stronger bid, or was lost on a tie.':'You chose different prizes; both selections succeeded.')+'</p>'+
   (!done()?'<button class="primary" data-next-round="1">Continue to next round</button>':'<strong>'+endLine()+'</strong>');
 }else $('reveal').innerHTML='';
 $('history').innerHTML=g.log.slice(-5).reverse().map(e=>'<div>Round '+e.round+' · '+
  e.claims.filter(x=>x.winner!==null).map(x=>label(x.winner)+' took '+x.prize.v+' points').join('; ')+
  (e.claims.some(x=>x.contested)?' · collision':'')+'</div>').join('');
}
function renderRules(){
 if(mode==='claim'){
  $('ruleTitle').textContent='CLAIM · 60-second rules';
  $('rules').innerHTML='<ol><li>Hold <strong>4 ranked colored cards</strong>. Three colored lanes are shared.</li>'+
   '<li>Each turn, play <strong>one card</strong> to its matching-color lane. Draw a replacement.</li>'+
   '<li>After playing, you may <strong>bank one lane</strong> that holds 3+ cards if your printed number total strictly beats every opponent.</li>'+
   '<li>Banking 3 or 4 cards scores that many points. Banking <strong>5 or more scores double</strong>. Waiting is risky: an opponent may overtake you.</li>'+
   '<li>At 7 cards a lane <strong>automatically resolves</strong> to the unique strength leader; a tie loses those cards. After 14 turns each, highest score wins.</li></ol>'+
   '<p><strong>Prototype question:</strong> Would you settle for 3 points or leave the lane exposed hoping to earn 10?</p>';
 }else{
  $('ruleTitle').textContent='SIGNAL · 60-second rules';
  $('rules').innerHTML='<ol><li>See <strong>3 prizes</strong> worth 1–5 points each. Hold <strong>5 cards</strong> with colors and numbers.</li>'+
   '<li>Both players secretly choose <strong>one card</strong> and <strong>one prize</strong>.</li>'+
   '<li>Different prizes: both win theirs. Same prize: the stronger bid takes it. Your card gains <strong>+2 strength</strong> if its color matches the prize.</li>'+
   '<li>Equal-strength bids on the same prize: <strong>nobody wins it</strong>. Bids and unclaimed prizes are discarded. Draw a replacement and reveal new prizes.</li>'+
   '<li>After <strong>10 rounds</strong>, add the numbers on your captured prizes. Highest score wins.</li></ol>'+
   '<p><strong>Prototype question:</strong> Would you risk fighting for 5 points or safely take 3 with a weaker bid?</p>';
 }
}
function syncSettings(){
 $('seed').value=String(game().seed);
 $('opponents').value=options().opponents;
 $('botStyle').value=options().botStyle;
 $('tabClaim').setAttribute('aria-selected',String(mode==='claim'));
 $('tabSignal').setAttribute('aria-selected',String(mode==='signal'));
}
function render(){
 renderHeader();renderRules();
 if(mode==='claim')renderClaim();else renderSignal();
 $('feedback').textContent=done()?endLine()+' '+(session.feedback[mode]||''):session.feedback[mode];
}
function showCover(){
 covered=true;
 $('coverTitle').textContent='Pass to '+label(seat());
 $('coverDescription').textContent=mode==='signal'?'Your secret bid remains hidden. Only the next player may reveal their hand.':
   'The next player needs to see their four private cards.';
 $('cover').style.display='flex';render();
}
function finishMove(event){
 selected=null;
 if(mode==='claim'){
  const bank=event.bank,trigger=event.trigger;
  session.feedback.claim=label(event.seat)+' placed '+LABEL[event.card.c]+' '+event.card.v+'. '+
   (bank?'Banked '+bank.cards+' cards for '+bank.points+' points.':
    trigger?(trigger.winner===null?'The lane overloaded in a tie; nobody scored.':'Lane overloaded: '+label(trigger.winner)+' scored '+trigger.points+'.'):
    'Pressed onward instead of banking. The opponent may challenge your lead.');
 }else if(event.type==='waiting')session.feedback.signal=label(event.seat)+' committed a secret bid. Opponent is next.';
 else {
  session.awaitingSignal=true;
  session.feedback.signal='Reveal the bids. Decide whether the outcome was predictable or surprising.';
 }
 save();
 if(done()){covered=false;$('cover').style.display='none';busy=false;render();return}
 if(mode==='signal'&&session.awaitingSignal){covered=false;$('cover').style.display='none';render();return}
 if(options().opponents==='hotseat'){showCover();return}
 render();scheduleBot();
}
function humanMove(move){
 if(!canAct())return;
 const g=game(),p=seat();
 try{const result=mode==='claim'?E.playClaim(g,p,move):E.playSignal(g,p,move);finishMove(result)}
 catch(error){session.feedback[mode]='That move is not legal: '+String(error.message);render()}
}
function scheduleBot(){
 const g=game();
 if(options().opponents!=='bot'||done()||seat()!==1||(mode==='signal'&&session.awaitingSignal)||busy)return;
 busy=true;render();const capturedEpoch=epoch,kind=mode;
 botTimer=setTimeout(()=>{
  if(epoch!==capturedEpoch||mode!==kind||done()||seat()!==1){busy=false;return}
  busy=false;
  try{
   const policy=options().botStyle,move=kind==='claim'?E.claimChoose(g,1,policy):E.signalChoose(g,1,policy);
   const event=kind==='claim'?E.playClaim(g,1,move):E.playSignal(g,1,move);
   finishMove(event);
  }catch(err){session.feedback[kind]='Bot error: '+String(err.message);render()}
 },500);
}
function chooseMode(to){
 if(!validKinds.includes(to)||to===mode)return;
 if(botTimer!==null)clearTimeout(botTimer);
 epoch++;busy=false;covered=false;selected=null;mode=to;
 $('cover').style.display='none';syncSettings();save();
 if(options().opponents==='hotseat'&&!done()&&!(mode==='signal'&&session.awaitingSignal))showCover();
 else{render();scheduleBot()}
}
$('tabClaim').onclick=()=>chooseMode('claim');
$('tabSignal').onclick=()=>chooseMode('signal');
$('hand').onclick=event=>{
 if(!canAct())return;
 const el=event.target.closest('[data-hand]');if(!el)return;
 selected=Number(el.dataset.hand);render();
};
$('actionButtons').onclick=event=>{
 if(!canAct()||selected===null)return;
 const claim=event.target.closest('[data-claim-index]');
 const sig=event.target.closest('[data-signal-index]');
 if(mode==='claim'&&claim){
  humanMove({type:'play',index:Number(claim.dataset.claimIndex),bank:claim.dataset.claimBank||null});
 }else if(mode==='signal'&&sig){
  humanMove({type:'bid',index:Number(sig.dataset.signalIndex),slot:Number(sig.dataset.signalSlot)});
 }
};
$('reveal').onclick=event=>{
 if(!event.target.closest('[data-next-round]')||mode!=='signal'||!session.awaitingSignal||done())return;
 session.awaitingSignal=false;selected=null;
 session.feedback.signal='Next round: choose a card and prize. Think about what your opponent values.';
 save();
 if(options().opponents==='hotseat')showCover();
 else{render();scheduleBot()}
};
$('revealButton').onclick=()=>{covered=false;$('cover').style.display='none';render();scheduleBot()};
$('newGame').onclick=()=>{
 const seed=Number($('seed').value);
 if(!Number.isInteger(seed)||seed<0||seed>4294967295){alert('Enter a nonnegative seed below 4294967296.');return}
 if(botTimer!==null)clearTimeout(botTimer);
 epoch++;busy=false;covered=false;selected=null;
 session.options[mode]={opponents:$('opponents').value,botStyle:$('botStyle').value};
 session.games[mode]=newGame(mode,seed);
 if(mode==='signal')session.awaitingSignal=false;
 session.feedback[mode]='New '+mode.toUpperCase()+' game. Step 1: choose a hand card.';
 $('cover').style.display='none';save();
 if(options().opponents==='hotseat')showCover();
 else render();
};
$('export').onclick=()=>{
 const record={format:'spark-game-design-lab-v1',kind:mode,game:game(),options:options(),feedback:session.feedback[mode],exportedAt:new Date().toISOString()};
 const url=URL.createObjectURL(new Blob([JSON.stringify(record,null,2)],{type:'application/json'}));
 const a=document.createElement('a');a.href=url;a.download='spark-'+mode+'-'+game().seed+'.json';a.click();
 setTimeout(()=>URL.revokeObjectURL(url),2000);
};
init();
})();