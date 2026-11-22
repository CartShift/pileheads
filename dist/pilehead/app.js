/* STACK physical playtest UI; preserve its existing local storage key. */
(function(){'use strict';
if(new URLSearchParams(location.search).has('online')||new URLSearchParams(location.search).has('room'))return;
const E=globalThis.PileheadEngine,A=globalThis.PileheadCardArt,$=id=>document.getElementById(id),app=$('app'),KEY='pilehead-playtest-v11';
let g=null,mode='bots',seats=4,setupSeat=0,selection=[],swapFrom=null,covered=false,challengeOpen=false,timer=null,botQueuedFor=null,notice='',lastMove=null,sortMode='dealt',endDismissed=false,dumpDraft=null,starterTimer=null,practiceMode=false;
function sameFace(a,b){return !!a&&!!b&&a.kind===b.kind&&
 (a.kind==='number'?a.rank===b.rank:a.action===b.action)}
function orderedHand(cards){
 const out=cards.slice();if(sortMode==='dealt')return out;
 const rank=c=>c.kind==='number'?c.rank:11+['reset','ghost','under','skip','burn','dump'].indexOf(c.action);
 return out.sort((a,b)=>(sortMode==='asc'?1:-1)*(rank(a)-rank(b))||a.id-b.id);
}
function selectMatching(cards,id){
 const picked=cards.find(c=>c.id===id);if(!picked)return;
 if(selection.includes(id)){selection=selection.filter(x=>x!==id);return}
 const prev=selection.map(x=>cards.find(c=>c.id===x)).filter(Boolean);
 // One tap selects one physical card. Matching copies can be added deliberately.
 selection=prev.length&&prev.every(c=>sameFace(c,picked))?[...selection,id]:[id];
}
function playerName(i){return mode==='bots'?(i===0?'You':'Bot '+i):'Player '+(i+1)}
// The next player can use the shared screen even while the prior SNAP is available.
function viewSeat(){return mode==='bots'?0:g?.turn??0}
function getPlayer(){return g.people[viewSeat()]}
function currentStage(){return E.stage(g,viewSeat())}
function isTurn(){return g.phase==='play'&&g.turn===viewSeat()}
function save(){try{localStorage.setItem(KEY,JSON.stringify({g,mode,seats,setupSeat,covered,notice,lastMove,practiceMode}))}catch(e){console.warn('Save unavailable',e)}}
function restore(){try{const x=JSON.parse(localStorage.getItem(KEY)||'null');
 if(!x||!['pilehead-1.1.0','pilehead-1.2.0','pilehead-1.3.0','pilehead-1.4.0','pilehead-1.5.0','pilehead-1.6.0',E.VERSION].includes(x.g?.version)||!['bots','hotseat'].includes(x.mode))return false;
 // Keep the existing 1.2 DUMP behavior during saved games.
 // 1.1 sessions stay on the 52-card rules rather than acquiring non-dealt cards.
 if(x.g.version==='pilehead-1.1.0')x.g.version='pilehead-1.2.0';
 E.invariant(x.g);g=x.g;mode=x.mode;seats=x.seats;setupSeat=x.setupSeat??0;practiceMode=x.practiceMode===true&&mode==='bots'&&seats===2;
 covered=mode==='hotseat'&&g.phase!=='over';challengeOpen=false;notice=x.notice||'';lastMove=x.lastMove||null;return true;
 }catch{return false}}
function card(c,{interactive=false,selected=false,back=false,source='',small=false}={}){
 if(back)return '<button type="button" class="card back ph-card ph-back" '+(interactive?'draggable="true" data-card="'+c.id+'" data-source="'+source+'"':'disabled')+
  ' aria-label="Flip face-down card">'+A.back()+'</button>';
 const action=c.kind==='action',name=action?c.action.toUpperCase():String(c.rank);
 return '<button type="button" class="card ph-card '+(action?'ph-action action-card ':'ph-number ')+(interactive?'playable ':'')+(selected?'selected':'')+
  '" '+(action?'data-action="'+c.action+'" ':'')+(interactive?'draggable="true" data-card="'+c.id+'" data-source="'+source+'"':'disabled')+
  ' aria-label="'+(action?name+' action: '+A.rules[c.action]:'Number '+c.rank)+'" aria-pressed="'+Boolean(selected)+'">'+A.face(c)+'</button>';
}
function rowCards(cards,source,interact=false){return '<div class="card-row '+(source==='hand'?'hand':'')+'">'+
 (source==='hand'&&g?.phase==='play'?orderedHand(cards):cards).map(c=>card(c,{interactive:interact,selected:selection.includes(c.id),source})).join('')+
 (!cards.length?'<span style="font-size:12px;color:#a8c4b4">No cards left</span>':'')+'</div>'}
function mini(c){return A.mini(c)}
function opponents(){return '<div class="opponents">'+g.people.filter(p=>p.seat!==viewSeat()).map(p=>{
 const isCurrent=g.turn===p.seat&&g.phase==='play';
 return '<div class="opponent '+(isCurrent?'current ':'')+(p.out?'finished':'')+'" data-seat="'+p.seat+'"><strong>'+
 playerName(p.seat)+(isCurrent?' · TURN':'')+(p.out?' · OUT':'')+'</strong><small>'+p.hand.length+
 ' in hand · '+p.up.length+' up · '+p.down.length+' blind</small><div class="held-cards" aria-label="Opponent holds '+p.hand.length+' private cards">'+Array.from({length:Math.min(p.hand.length,8)},(_,i)=>'<span class="held-back" aria-hidden="true" style="--hold-angle:'+((i-(Math.min(p.hand.length,8)-1)/2)*5)+'deg"></span>').join('')+'</div><div class="mini-cards">'+
 p.up.map(mini).join('')+p.down.slice(0,3).map(()=>mini(null)).join('')+'</div></div>'}).join('')+'</div>'}
function pile(){const top=E.topRun(g),a=g.pile.slice(-4);return '<div class="table-center"><div class="stack">'+
 '<div class="stack-label">DRAW</div><div class="pile-card">'+(g.stock.length?'<div class="card back ph-card ph-back" style="pointer-events:none">'+A.back()+'</div>':'<div class="placeholder">EMPTY</div>')+'</div>'+
 '<div class="stack-count">'+g.stock.length+' cards</div></div><div class="stack" data-play-target="pile" role="button" tabindex="0" aria-label="Play selected cards on the pile"><div class="stack-label">THE PILE</div>'+
 '<div class="pile-card">'+(a.length?a.map((c,i)=>'<div class="card-wrap" style="--offset:'+((i-(a.length-1)/2)*8)+
 'px;--angle:'+((i-(a.length-1)/2)*5)+'deg">'+card(c)+'</div>').join(''):'<div class="placeholder">CLEAR</div>')+
 '</div><div class="stack-count">'+g.pile.length+' cards'+(top.count>=2?' · '+top.count+' × '+top.rank:'')+'</div>'+
 '<div class="stack-count">'+(g.limit?.type==='under'?'NEXT: 1–4':g.limit?.type==='min'?'NEXT: '+g.limit.value+' or higher':'ANY NUMBER')+'</div>'+
 '</div><div class="stack"><div class="stack-label">BURNED</div><div class="pile-card"><div class="placeholder">✕</div></div>'+
 '<div class="stack-count">'+g.ashes.length+' removed</div></div></div>'}
function bridgeAvailable(){
 if(!g||g.phase!=='play'||!isTurn())return false;
 return !!E.finalHandBridge(g,viewSeat());
}
function upAndDown(p,allow){return '<div class="zone your-up"><div class="area-label"><span>FACE UP · '+p.up.length+'</span><span>BLIND · '+p.down.length+'</span></div>'+
 '<div class="card-row">'+Array.from({length:Math.max(p.up.length,p.down.length)},(_,i)=>{
  const u=p.up[i],d=p.down[i],canUp=allow&&(currentStage()==='up'||bridgeAvailable()),canDown=allow&&currentStage()==='down';
  if(u)return '<div class="up-pair">'+(d?'<div class="card back ph-card ph-back">'+A.back()+'</div>':'')+
   card(u,{interactive:canUp,selected:selection.includes(u.id),source:'up'})+'</div>';
  return d?card(d,{back:true,interactive:canDown,source:'down'}):'';
 }).join('')+'</div></div>'}
const effectInfo={
 reset:'RESET removed the number restriction. Any number can follow.',
 ghost:'GHOST keeps the same number restriction.',
 under:'UNDER means the next number must be 1 through 4.',
 skip:'SKIP makes the next player miss a turn.',
 burn:'BURN removes the pile and gives another turn.',
 dump:'DUMP burns itself; choose any active rival to take the existing pile. You play again.'
};
function selectedEffect(){
 const p=getPlayer(),cards=[...p.hand,...p.up],selected=cards.find(c=>selection.includes(c.id)&&c.kind==='action');
 return selected?'<div class="pilehead-selected-effect"><strong>YOUR '+selected.action.toUpperCase()+' CARD</strong><span>'+
  effectInfo[selected.action]+'</span></div>':'';
}
function lastEffect(){
 const e=g?.events?.at(-1);if(!e)return '';
 const message=e.bridgeCount?'HAND + FACE-UP COMBO · '+playerName(e.seat)+' played matching cards from both layers.':
  e.type==='followup'?'SNAP · '+playerName(e.seat)+' instantly played the matching card they just drew.':
 e.reason==='four'||e.reason==='slam'?'FOUR OF A KIND · The pile burns and the player acts again.':
 e.action==='dump'?'DUMP · '+playerName(e.target)+' takes the pile. '+playerName(e.seat)+' plays again.':e.action?effectInfo[e.action]:
 e.type==='take'||e.type==='blind-fail'?'PICKUP · The pile goes into '+playerName(e.seat)+'’s hand.':
 e.burned?'BURN · The pile has been removed from play.':
 'PLAY · '+playerName(e.seat)+' placed '+e.count+' card'+(e.count===1?'':'s')+'.';
 return '<div class="pilehead-effect-note" role="status" aria-live="polite"><span class="effect-label">'+
  (e.bridgeCount?'COMBO':e.action?e.action.toUpperCase():e.type==='followup'?'SNAP':e.burned?'BURN':'LAST MOVE')+
  '</span><span>'+message+(e.erodedCount?' Final Duel: the visible top card is permanently burned.':'')+'</span></div>';
}
function eventName(e){const who=playerName(e.seat),erosion=e.erodedCount?' · top card burned (Final Duel)':'';
 if(e.type==='take')return who+' picked up '+(e.takenCount??e.count)+erosion;
 if(e.type==='blind-fail')return who+' flipped an illegal card and took '+(e.takenCount??e.count)+erosion;
 if(e.type==='followup')return who+' snapped the just-drawn '+e.rank+' onto the pile';
 if(e.type==='dump-pending')return who+' revealed DUMP! Choose who must take the pile.';
 if(e.action==='dump')return who+' burned DUMP: '+playerName(e.target)+' took '+e.takenCount+' pile cards'+erosion+'; '+who+' plays again';
 if(e.reason==='slam')return who+' SLAM! Burned the pile';
 if(e.burned)return who+' burned the pile';
 if(e.action)return who+' played '+(e.count>1?e.count+' × ':'')+e.action.toUpperCase();
 return who+' played '+e.count+' × '+e.rank}
function setupView(){if(!g)return '<section class="setup panel"><div class="eyebrow">STACK / THE CARD GAME</div>'+
 '<h2>ONE PILE. ONE LOSER.</h2><p>Make your move, stack the pressure, and be the first to lose every card. Six action types can turn the table, including four BURN cards. The last player holding cards loses.</p>'+
 '<div class="fields"><label>Players<select id="seat-count">'+[2,3,4,5].map(n=>'<option value="'+n+'" '+(seats===n?'selected':'')+'>'+n+' players</option>').join('')+'</select></label>'+
 '<label>Play against<select id="game-mode"><option value="bots" '+(mode==='bots'?'selected':'')+'>Computer opponents</option><option value="hotseat" '+(mode==='hotseat'?'selected':'')+'>Local pass-and-play</option></select></label></div>'+
 '<div class="toolbar"><button class="action primary" data-do="practice">Learn with a bot</button><button class="action secondary" data-do="create">Deal cards</button><a class="action secondary" href="?online=1">Play with friends online</a></div><p class="stack-intro-note">New here? Learn by playing one round. Already know the rules? Deal cards or invite friends.</p></section>';
 const p=g.people[setupSeat],had=swapFrom!==null;
 return '<section class="setup panel"><div class="eyebrow">STACK / OPENING HAND · '+playerName(setupSeat)+'</div><h2>SET THE TABLE.</h2>'+
 '<p>Tap a card in your hand, then a face-up card to swap them. Face-up cards become playable after your draw deck and hand are gone. Three blind cards stay hidden.</p>'+(practiceMode?'<p class="stack-practice-setup"><strong>Practice · Step 1:</strong> Pick three cards you want to keep face-up for later, then select Start the game. You can play normally against a bot.</p>':'')+
 '<div class="area-label"><span>YOUR FACE-UP CARDS</span></div>'+rowCards(p.up,'up',true)+
 '<div class="area-label"><span>YOUR HAND</span><span>'+(had?'Now tap the card to exchange':'Tap any card to select')+'</span></div>'+
 rowCards(p.hand,'hand',true)+'<div class="toolbar"><button class="action primary" data-do="ready">'+
 (mode==='hotseat'&&setupSeat<seats-1?'Pass to next player':'Start the game')+'</button></div></section>';
}

function tableHUD(){
 const viewer=viewSeat(),layer=currentStage(),turn=isTurn(),can=turn&&!covered;
 const who=g.phase==='over'?'ROUND COMPLETE':can?'YOUR TURN':playerName(g.turn)+' TO PLAY';
 const guide=g.phase==='over'?'Round finished · view results':
 E.slamOptions(g,viewer).length?'SLAM available · interrupt any turn':
 can?(layer==='down'?'Choose one blind card to flip':
  layer==='up'?'Choose a face-up card':
  selection.length?'Confirm your selected cards':'Tap a card to select matching copies'):
 'Waiting for '+playerName(g.turn)+' · watch for SLAM';
 const rule=g.limit?.type==='under'?'NUMBERS 1–4':
  g.limit?.type==='min'?'NUMBERS '+g.limit.value+'+':'ANY NUMBER';
 return '<div class="pilehead-table-hud '+(can?'is-my-turn':'is-waiting')+'" aria-label="Table status">'+
  '<div class="hud-main"><span class="hud-status"><i class="hud-dot" aria-hidden="true"></i>'+who+'</span>'+
  '<span class="hud-guidance">'+guide+'</span></div>'+
  '<div class="hud-meta"><span>'+layer.toUpperCase()+'</span><span class="hud-rule">'+rule+'</span>'+
  (E.slamOptions(g,viewer).length?'<span class="hud-urgent">SLAM READY</span>':'')+
  '</div></div>';
}
function tableActions({turn,legal,pick,slams,snap,stage}){
 let buttons='';
 if(g.phase==='over')buttons='<button class="action primary" data-do="rematch">Play again</button>';
 else {
  if(snap.length)buttons+='<button class="action snap" data-do="snap">SNAP · matching draw</button>';
  if(slams.length)buttons+='<button class="action slam" data-do="slam">SLAM · '+slams[0].ids.length+' cards</button>';
  if(turn&&stage!=='down'&&selection.length){
   const canPlace=legal.some(o=>o.type==='play'&&o.source===stage&&o.ids?.length===selection.length&&o.ids.every(id=>selection.includes(id)));
   if(canPlace){
    const burn=getPlayer().hand.some(c=>selection.includes(c.id)&&c.action==='burn');
    buttons+='<button class="action primary" data-do="play">'+(burn?'BURN PILE':'Play '+selection.length+' card'+(selection.length===1?'':'s'))+
      ' <span aria-hidden="true">↗</span></button>';
   }
  }
  if(turn&&pick)buttons+='<button class="action secondary" data-do="take">Take pile · '+g.pile.length+'</button>';
  if(mode==='hotseat')buttons+='<button class="action secondary" data-do="hot-snap" aria-label="Attempt SNAP">SNAP!</button>';
  if(mode==='hotseat'&&g.people.some(p=>E.slamOptions(g,p.seat).length))buttons+='<button class="action secondary" data-do="challenge">Other player SLAM</button>';
  if(!buttons){
   const message=turn?(stage==='down'?'Choose a blind card':selection.length?'Choose a legal combination':'Select a card to play'):
    playerName(g.turn)+' is playing';
   buttons='<span class="table-action-prompt" role="status">'+message+
    '<small>'+(turn?'Tap cards to select · drag onto pile':'Watch the table · SLAM is still possible')+'</small></span>';
  }
 }
 return '<div class="toolbar table-actions" role="group" aria-label="Game actions">'+buttons+'</div>';
}
function gameView(){const viewer=viewSeat(),p=getPlayer(),isHuman=mode==='hotseat'||viewer===0,turn=isTurn(),stage=currentStage();
 const selectable=turn&&g.phase==='play'&&!covered,slams=E.slamOptions(g,viewer),snap=E.followUpOptions(g,viewer),legal=E.options(g,viewer),pick=legal.some(o=>o.type==='take');
 const top=E.topRun(g),summary=g.phase==='over'?'Game over. '+playerName(g.loser)+' is the PILEHEAD.':
  turn?'Your turn · '+(stage==='down'?'Flip one blind card':stage==='up'?'Play from your face-up row':'Choose cards from your hand'):
  playerName(g.turn)+' is playing · watch for a SLAM!';
 return '<div class="pitch"><h1>'+summary+'</h1><p>'+E.deck(g.version).length+' custom cards · 40 numbers · '+(E.deck(g.version).length-40)+' actions · '+g.people.length+' players</p></div>'+
 tableHUD()+(E.finalDuelActive(g)?'<p class="pilehead-bridge-hint" role="status">FINAL DUEL · Two players remain. Each pile pickup permanently burns its top card.</p>':'')+'<section class="table" aria-label="PILEHEAD physical table">'+opponents()+pile()+
 upAndDown(p,selectable)+
 '<div class="hand-area"><div class="area-label"><span>YOUR HAND <b>· '+p.hand.length+'</b></span><span class="hand-controls">'+
 (selection.length?'<button type="button" class="hand-clear-button" data-do="clear-selection" aria-label="Clear selected cards">'+selection.length+' selected · Clear</button>':'')+
 '<button type="button" class="hand-sort-button" data-do="sort">Sort '+(sortMode==='dealt'?'↑':sortMode==='asc'?'↓':'↺')+'</button></span></div>'+
 rowCards(p.hand,'hand',selectable&&stage==='hand')+'</div></section>'+
 (bridgeAvailable()?'<p class="pilehead-bridge-hint">MATCHING FACE-UP · Your final matching hand cards can be played with matching exposed cards, including a four-card SLAM. Tap either to select the group.</p>':'')+
 (selectedEffect()||lastEffect())+tableActions({turn,legal,pick,slams,snap,stage})+
 '<details class="playtest-tools"><summary>Playtest tools</summary><button class="action secondary" data-do="export">Export QA state</button></details>'+
 (notice?'<div class="message" role="status" aria-live="polite">'+notice+'</div>':'')+
 '<div class="meta"><span>Moves <strong>'+g.moves+'</strong></span><span>Draw stock <strong>'+g.stock.length+'</strong></span>'+
 '<span>Burned <strong>'+g.ashes.length+'</strong></span><span>Pickups <strong>'+g.people.reduce((n,x)=>n+x.pickups,0)+'</strong></span></div>'+
 '<details class="move-history"><summary>Move history <span>'+g.moves+' moves</span></summary>'+
      '<div class="event-list" role="list" aria-label="Recent moves">'+g.events.slice(-8).reverse().map(e=>'<span class="event" role="listitem">'+eventName(e)+'</span>').join('')+'</div></details>';
}
function endScreen(){
 if(!g||g.phase!=='over'||endDismissed)return '';
 return window.PileheadTableFX?.resultHTML({
  players:g.people.map(p=>playerName(p.seat)),
  finishedOrder:g.finishedOrder||[],loser:g.loser,me:mode==='bots'?0:null,
  moves:g.moves,ashes:g.ashes.length,online:false,key:g.seed+':'+g.moves
 })||'';
}
function overlay(){
 if((dumpDraft||g?.pendingDump?.seat===viewSeat())&&g?.phase==='play'){
  const targets=E.dumpTargets(g,viewSeat());
  return '<div class="overlay"><div class="panel" role="dialog" aria-modal="true" aria-label="Choose DUMP target">'+
   '<div class="eyebrow">DUMP · CHOOSE YOUR TARGET</div><h2>Who takes the pile?</h2>'+
   '<p>Choose any opponent still in the game. They take the current pile; you play again.</p>'+
   '<div class="toolbar">'+targets.map(seat=>'<button class="action primary" data-do="dump-target" data-seat="'+seat+'">'+playerName(seat)+'</button>').join('')+'</div>'+
   (dumpDraft?'<button class="action secondary" data-do="cancel-dump">Cancel</button>':'')+'</div></div>';
 }
 if(challengeOpen&&g?.phase==='play'){
 return '<div class="overlay"><div class="panel"><div class="eyebrow">OUT-OF-TURN INTERRUPT</div><h2>SLAM!</h2>'+
 '<p>Choose the player who is placing the missing matching card(s). The game checks legality without showing anyone\'s private hand.</p>'+
 g.people.filter(p=>!p.out).map(p=>'<button class="action secondary" data-do="hot-slam" data-seat="'+p.seat+'">'+playerName(p.seat)+'</button>').join('')+
 '<button class="action" data-do="cancel-challenge">Cancel</button></div></div>';
 }
 if(!covered||!g||mode!=='hotseat')return'';
 const isSetup=g.phase==='setup',name=playerName(isSetup?setupSeat:g.turn);
 return '<div class="overlay"><div class="panel"><div class="eyebrow">PASS THE DEVICE</div><h2>'+name+'</h2>'+
 '<p>Only this player should reveal their cards. Other players can call SLAM while the screen is covered.</p>'+
 '<button class="action primary" data-do="reveal">Reveal '+name+' cards</button>'+
 (!isSetup?'<button class="action secondary" data-do="hot-snap">SNAP!</button>':'')+
 (!isSetup&&g.people.some(p=>E.slamOptions(g,p.seat).length)?'<hr style="border-color:#66857565;margin:16px 0"><p>Out-of-turn SLAM? Choose the player attempting it:</p>'+
 g.people.filter(p=>!p.out).map(p=>'<button class="action secondary" data-do="hot-slam" data-seat="'+p.seat+'">'+playerName(p.seat)+'</button>').join(''):'')+
 '</div></div>';
}
function render(){
 const focused=app.contains(document.activeElement)?document.activeElement:null;
 const historyOpen=!!app.querySelector('.move-history')?.open;
 const key=focused?.tagName==='SUMMARY'&&focused.parentElement?.classList.contains('move-history')?{type:'history'}:
  focused?.dataset?.card?{type:'card',id:focused.dataset.card,source:focused.dataset.source}:
  focused?.dataset?.do?{type:'action',name:focused.dataset.do}:null;
 app.innerHTML=(g&&g.phase!=='setup'?gameView():setupView())+overlay()+
  (g&&g.phase==='play'?(window.PileheadTableFX?.starterHTML?.({
   names:g.people.map(p=>playerName(p.seat)),seat:g.starterSeat??0,
   reason:g.starterReason||'draw',startedAt:g.startedAt
  })||''):'')+endScreen();
 if(starterTimer!==null){clearTimeout(starterTimer);starterTimer=null}
 if(g?.phase==='play'&&Number.isFinite(g.startedAt)){
  const left=3300-(Date.now()-g.startedAt);
  if(left>0)starterTimer=setTimeout(()=>{starterTimer=null;render()},left+25);
 }
 if(historyOpen&&app.querySelector('.move-history'))app.querySelector('.move-history').open=true;
 if(key){
  const next=key.type==='history'?app.querySelector('.move-history summary'):
   key.type==='card'?app.querySelector('[data-card="'+key.id+'"][data-source="'+key.source+'"]'):
   app.querySelector('[data-do="'+key.name+'"]');
  try{next?.focus({preventScroll:true})}catch{}
 }
 const announcer=document.getElementById('pilehead-announcer');
 if(announcer&&g){
  const key=g.seed+':'+g.moves+':'+g.phase+':'+covered+':'+setupSeat;
  if(announcer.dataset.lastKey!==key){
   announcer.dataset.lastKey=key;
   announcer.textContent=g.phase==='over'?'Round finished. '+playerName(g.loser)+' is the Pilehead.':
    covered?'Pass the device to '+playerName(g.phase==='setup'?setupSeat:g.turn)+'.':
    g.phase==='setup'?'Choose your three face-up cards.':
    isTurn()?'Your turn. Select a card.':playerName(g.turn)+' is playing.';
  }
 }
 window.PileheadTableFX?.sync({identity:g?g.seed+':'+g.moves:null,gameKey:g?'local:'+g.seed:null,
  event:g?.events?.[g.events.length-1]||null,events:g?.events||[],
  ownSeat:g?viewSeat():0,active:g?isTurn()&&!covered:false,turn:g?.turn??null,
  selected:selection.length,moveNo:g?.moves||0,online:false});
 window.StackUX?.sync({practice:practiceMode,active:g?isTurn()&&!covered:false,
  moveNo:g?.moves||0,stage:g?.phase==='play'?currentStage():null});
 save();queueBot();
}
function celebrate(ev){
 if(!ev?.burned)return;
 const table=app.querySelector('.table');if(!table)return;
 table.classList.add('just-burned');
 try{if(navigator.vibrate)navigator.vibrate(ev.reason==='slam'?[25,30,45]:20)}catch{}
 if(ev.reason==='slam'){
  const text=document.createElement('div');text.className='slam-banner';text.textContent='SLAM!';
  table.appendChild(text);setTimeout(()=>text.remove(),850);
 }
 setTimeout(()=>table.classList.remove('just-burned'),550);
}
function queueBot(){
 if(!g||g.phase!=='play'||mode!=='bots'){
  if(timer!==null)clearTimeout(timer);
  timer=null;botQueuedFor=null;return;
 }
 // Do not let bots act behind the visible first-turn lottery.
 if(g.startedAt&&Date.now()-g.startedAt<3300)return;
 if(g.pendingDump?.seat===0)return;
  const botDump=!!g.pendingDump;
  const canSlam=g.people.some(p=>p.seat!==0&&E.slamOptions(g,p.seat).length);
 const botSnap=g.followUp&&g.followUp.seat!==0&&E.followUpOptions(g,g.followUp.seat).length;
 if(g.turn===0&&!canSlam&&!botSnap&&!botDump){
  if(timer!==null)clearTimeout(timer);
  timer=null;botQueuedFor=null;return;
 }
 // Sorting cards, switching focus and normal table renders cannot restart the
 // bot's thinking delay. The SNAP race stays open only until the next play.
 const key=[g.seed,g.moves,g.turn,g.followUp?.seat??'',g.pendingDump?.seat??''].join(':');
 if(timer!==null&&botQueuedFor===key)return;
 if(timer!==null)clearTimeout(timer);
 botQueuedFor=key;
 timer=setTimeout(()=>{timer=null;botQueuedFor=null;if(!g||g.phase!=='play')return;
 try{let ev=botDump?E.resolveDump(g,g.pendingDump.seat,E.botDumpTarget(g,g.pendingDump.seat)):
    botSnap?E.move(g,g.followUp.seat,E.followUpOptions(g,g.followUp.seat)[0]):E.autoSlam(g,'greedy',0);
  if(!ev&&g.turn!==0)ev=E.move(g,g.turn,E.choose(g,g.turn,['greedy','saver','random'][g.turn%3]));
  if(ev){lastMove=ev;notice=eventName(ev);selection=[];render()}
 }catch(e){notice='Bot error: '+e.message;render()}
 },canSlam?780:600);
}
function startGame(previousWinner=null){endDismissed=false;dumpDraft=null;g=E.create({players:seats,seed:Date.now()>>>0});
 const starter=practiceMode?0:previousWinner===null?Math.floor(Math.random()*seats):previousWinner;
 g.starterSeat=starter;g.starterReason=practiceMode?'practice':previousWinner===null?'draw':'winner';
 setupSeat=0;selection=[];swapFrom=null;challengeOpen=false;covered=false;notice='';if(mode==='bots')for(let i=1;i<seats;i++)E.autoSetup(g,i);render()}
function afterMove(ev,previousTurn=ev.seat){lastMove=ev;selection=[];challengeOpen=false;notice=eventName(ev);
 // The prior seat's optional SNAP must not suddenly hide the current seat.
 // Only a real change of the active turn requires passing the device.
 if(mode==='hotseat'&&g.phase!=='over'&&g.turn!==previousTurn)covered=!g.pendingDump;
 render()}
// A final-hand bridge requires the complete hand to precede face-up copies.
// Every input path (button, pile tap, keyboard and drag) must use this order.
function selectedPlay(){
 // Normalize any tap, drag, keyboard or touch bridge to the complete hand-first group.
 if(bridgeAvailable()&&selection.some(id=>getPlayer().up.some(c=>c.id===id)))
  selection=[...getPlayer().hand.map(c=>c.id),...selection.filter(id=>getPlayer().up.some(c=>c.id===id))];
 const source=currentStage(),p=getPlayer(),ids=selection.slice();
 if(bridgeAvailable()&&source==='hand'){
  const fromHand=ids.filter(id=>p.hand.some(c=>c.id===id));
  return {type:'play',source:'hand',ids:[...fromHand,...ids.filter(id=>!fromHand.includes(id))]};
 }
 return {type:'play',source,ids};
}
function submitPlay(choice){
 const p=g.people[viewSeat()];
 const first=[...p.hand,...p.up].find(c=>choice.ids?.includes(c.id));
 if(first?.action==='dump'&&g.version!=='pilehead-1.2.0'&&E.dumpTargets(g,viewSeat()).length>1){
  dumpDraft=choice;render();return;
 }
 perform(choice);
}
function perform(choice,seat=viewSeat()){
 try{
  if(choice?.source)window.PileheadTableFX?.captureMove?.({
   gameKey:'local:'+g.seed,seat,moveNo:g.moves+1,move:choice
  });
  const previousTurn=g.turn,ev=E.move(g,seat,choice);afterMove(ev,previousTurn)
 }catch(e){notice=e.message;render()}
}
function handleCard(id,source){const seat=g.phase==='setup'?setupSeat:viewSeat(),p=g.people[seat];
 if(g.phase==='setup'){
  if(swapFrom===null){swapFrom={id,source};selection=[id];render();return}
  if(source===swapFrom.source){swapFrom={id,source};selection=[id];render();return}
  const handId=source==='hand'?id:swapFrom.id,upId=source==='up'?id:swapFrom.id;
  try{E.swap(g,seat,handId,upId)}catch(e){notice=e.message}
  swapFrom=null;selection=[];render();return;
 }
 if(!isTurn()||covered)return;
 if(source==='down'){perform({type:'play',source:'down',ids:[id]});return}
 const arr=p[source],picked=arr.find(c=>c.id===id);if(!picked)return;
 if(source!==currentStage()&&!bridgeAvailable())return;
 if(!E.isLegal(g,picked)){notice='Not playable with the current restriction';render();return}
 const bridged=bridgeAvailable();
 selectMatching(bridged?[...p.hand,...p.up]:arr,id);
 if(bridged&&selection.some(selected=>p.up.some(c=>c.id===selected))){
  // Face-up bridge plays must include every remaining matching hand card.
  selection=[...p.hand.map(c=>c.id),...selection.filter(selected=>p.up.some(c=>c.id===selected))];
 }
 if(selection.includes(id)){try{navigator.vibrate?.(8)}catch{}}
 notice='';render();
}
function execute(action,button){
 if(action==='practice'){mode='bots';seats=2;practiceMode=true;window.StackUX?.resetPractice();startGame();return}
 if(action==='create'){practiceMode=false;seats=Number($('seat-count')?.value)||seats;mode=$('game-mode')?.value==='hotseat'?'hotseat':'bots';startGame();return}
 if(action==='dismiss-result'){endDismissed=true;render();return}
 if(action==='rematch'){startGame(g?.finishedOrder?.[0]??null);return}
 if(action==='new'){g=null;dumpDraft=null;selection=[];swapFrom=null;covered=false;endDismissed=false;practiceMode=false;render();return}
 if(action==='ready'){
  selection=[];swapFrom=null;
  if(mode==='hotseat'&&setupSeat<seats-1){setupSeat++;covered=true}
  else{E.start(g);covered=mode==='hotseat'}
  render();return;
 }
 if(action==='reveal'){covered=false;render();return}
 if(action==='challenge'){challengeOpen=true;render();return}
 if(action==='cancel-challenge'){challengeOpen=false;render();return}
 if(action==='cancel-dump'){dumpDraft=null;render();return}
 if(action==='dump-target'){
  const target=Number(button.dataset.seat);
  if(dumpDraft){const move={...dumpDraft,target};dumpDraft=null;perform(move);return}
  if(g.pendingDump?.seat===viewSeat()){
   try{const previousTurn=g.turn;afterMove(E.resolveDump(g,viewSeat(),target),previousTurn)}
   catch(e){notice=e.message;render()}
  }
  return;
 }
 if(action==='play'){
  if(!selection.length)return;
  submitPlay(selectedPlay());return;
 }
 if(action==='clear-selection'){selection=[];render();return}
 if(action==='sort'){sortMode=sortMode==='dealt'?'asc':sortMode==='asc'?'desc':'dealt';selection=[];
  window.PileheadTableFX?.resetHandScroll?.();render();return}
 if(action==='snap'){const move=E.followUpOptions(g,viewSeat())[0];if(move)perform(move);return}
 if(action==='hot-snap'&&mode==='hotseat'){
  const seat=g.followUp?.seat,choice=seat===undefined?null:E.followUpOptions(g,seat)[0];
  if(choice)perform(choice,seat);
  else{notice='No SNAP is currently available.';render()}
  return;
 }
 if(action==='take'){perform({type:'take'});return}
 if(action==='slam'){const choice=E.slamOptions(g,viewSeat())[0];if(choice)perform(choice);return}
 if(action==='hot-slam'){const seat=Number(button.dataset.seat);const choice=E.slamOptions(g,seat)[0];
  if(choice)perform(choice,seat);else{challengeOpen=false;notice='No valid four-of-a-kind for '+playerName(seat);render()}return;
 }
 if(action==='export'&&g){const a=document.createElement('a'),u=URL.createObjectURL(new Blob([JSON.stringify(g,null,2)],{type:'application/json'}));a.href=u;a.download='pilehead-state-seed-'+g.seed+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(u),1200)}
}
app.addEventListener('click',e=>{
 const b=e.target.closest('button');
 if(b?.dataset.card){handleCard(Number(b.dataset.card),b.dataset.source);return}
 if(b?.dataset.do){execute(b.dataset.do,b);return}
 if(e.target.closest('[data-play-target]')&&selection.length&&isTurn())submitPlay(selectedPlay());
});
app.addEventListener('keydown',e=>{
 if(e.key==='Escape'&&!e.target.closest('[role="dialog"]')&&selection.length){
  e.preventDefault();selection=[];render();return;
 }
 if(e.target.closest('[data-play-target]')&&(e.key==='Enter'||e.key===' ')&&selection.length&&isTurn()){
  e.preventDefault();submitPlay(selectedPlay());
 }
});
let dragCard=null;
app.addEventListener('dragstart',e=>{
 const b=e.target.closest('[data-card]');if(!b||!isTurn()||covered||g.phase!=='play')return;
 dragCard={id:Number(b.dataset.card),source:b.dataset.source};
 if(!selection.includes(dragCard.id))selectMatching(bridgeAvailable()?[...getPlayer().hand,...getPlayer().up]:(getPlayer()[dragCard.source]||[]),dragCard.id);
 if(e.dataTransfer){e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain',String(dragCard.id))}
});
app.addEventListener('dragover',e=>{if(dragCard&&e.target.closest('[data-play-target]'))e.preventDefault()});
app.addEventListener('drop',e=>{
 if(!dragCard||!e.target.closest('[data-play-target]'))return;
 e.preventDefault();const move=dragCard;dragCard=null;
 if(isTurn()&&(currentStage()===move.source||bridgeAvailable()))submitPlay(selectedPlay());
});
app.addEventListener('dragend',()=>{dragCard=null});

/* Touch and pen: physically drag a lifted card onto the centre pile.
   Desktop HTML Drag and Drop remains available; a tap still selects cards. */
let touchGesture=null,suppressTap=false;
app.addEventListener('click',e=>{if(suppressTap){e.preventDefault();e.stopImmediatePropagation();suppressTap=false}},true);
app.addEventListener('pointerdown',e=>{
 if(e.pointerType==='mouse')return;
 const b=e.target.closest('button[data-card]');
 if(!b||!isTurn()||covered||g.phase!=='play')return;
 touchGesture={id:Number(b.dataset.card),source:b.dataset.source,x:e.clientX,y:e.clientY,dragging:false,scrolling:false,el:null,row:b.closest('.card-row.hand'),startScroll:b.closest('.card-row.hand')?.scrollLeft||0};
});
window.addEventListener('pointermove',e=>{
 const d=touchGesture;if(!d||e.pointerType==='mouse')return;
 const dx=e.clientX-d.x,dy=e.clientY-d.y;
 if(!d.dragging&&!d.scrolling&&Math.hypot(dx,dy)>12){
  if(d.row&&d.row.scrollWidth>d.row.clientWidth+2&&Math.abs(dx)>Math.abs(dy)*1.35)d.scrolling=true;
  else d.dragging=true;
 }
 if(d.scrolling){e.preventDefault();d.row.scrollLeft=d.startScroll-dx;return}
 if(d.dragging&&!d.el){const b=app.querySelector('[data-card="'+d.id+'"]');if(!b)return;
  d.el=b.cloneNode(true);d.el.classList.add('card-ghost');document.body.appendChild(d.el);
  if(!selection.includes(d.id))selectMatching(bridgeAvailable()?[...getPlayer().hand,...getPlayer().up]:(getPlayer()[d.source]||[]),d.id);
  if(selection.length>1){const badge=document.createElement('span');
   badge.className='drag-count';badge.textContent=selection.length+' cards';d.el.appendChild(badge)}
 }
 if(d.dragging&&d.el){e.preventDefault();d.el.style.left=e.clientX+'px';d.el.style.top=e.clientY+'px';
  const to=document.elementFromPoint(e.clientX,e.clientY)?.closest('[data-play-target]');
  app.querySelector('[data-play-target]')?.classList.toggle('drop-hover',!!to);}
},{passive:false});
function endTouch(e){
 const d=touchGesture;if(!d)return;touchGesture=null;
 const target=d.dragging?document.elementFromPoint(e.clientX,e.clientY)?.closest('[data-play-target]'):null;
 d.el?.remove();app.querySelector('[data-play-target]')?.classList.remove('drop-hover');
 if(!d.dragging&&!d.scrolling)return;
 suppressTap=true;setTimeout(()=>suppressTap=false,350);
 if(d.scrolling)return;
 if(target&&isTurn()&&(currentStage()===d.source||bridgeAvailable())){
  if(!selection.includes(d.id))selectMatching(getPlayer()[d.source]||[],d.id);
  submitPlay(selectedPlay())}
}
window.addEventListener('pointerup',endTouch);
window.addEventListener('pointercancel',e=>{const d=touchGesture;touchGesture=null;d?.el?.remove();app.querySelector('[data-play-target]')?.classList.remove('drop-hover')});


$('new').addEventListener('click',()=>{if(g&&!confirm('Start a new game and replace the current local save?'))return;g=null;notice='';selection=[];challengeOpen=false;covered=false;render()});
window.addEventListener('stack-deck-theme-change',()=>render());
restore();render();
})();