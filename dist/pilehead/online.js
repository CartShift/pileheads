/* PILEHEAD Online · private-seat multiplayer on the existing physical table. */
(function(){'use strict';
const params=new URLSearchParams(location.search);
if(!params.has('room')&&!params.has('online'))return;
const root=document.getElementById('app');
const $=id=>document.getElementById(id);
const STORE='pilehead-online-session-',NAME='pilehead-online-name';
const deploymentShare=params.get('_vercel_share');
const safeSessionRead=key=>{try{return localStorage.getItem(key)}catch{return null}};
const safeSessionSave=(key,value)=>{try{localStorage.setItem(key,value)}catch{}};
let room=params.get('room')?.toUpperCase()||'',session=room?safeSessionRead(STORE+room):null;
let data=null,busy=false,polling=false,selection=[],swapCard=null,notice='',networkError='',drag=null;
let lastRevision=-1,lastEvent=null,pollTimer=null,reconnecting=false,sortMode='dealt',endDismissed=false,botTickAt=0,lastChangeAt=0;
const A=globalThis.PileheadCardArt;const symbols=A.glyph;
const safe=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
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
 const prior=selection.map(x=>cards.find(c=>c.id===x)).filter(Boolean);
 selection=prior.length&&prior.every(c=>sameFace(c,picked))?[...selection,id]:
  cards.filter(c=>sameFace(c,picked)).map(c=>c.id);
}
function label(c){return c.kind==='action'?c.action.toUpperCase():String(c.rank)}
function card(c,opts={}){
 if(opts.back)return '<button type="button" class="card back ph-card ph-back'+(opts.can?' playable':'')+'" '+
  (opts.can?'data-blind="'+opts.index+'"':'disabled')+' aria-label="Flip one face-down card">'+A.back()+'</button>';
 const action=c.kind==='action';
 return '<button type="button" class="card ph-card '+(action?'ph-action action-card ':'ph-number ')+(opts.can?'playable ':'')+(opts.selected?'selected':'')+
  '" '+(action?'data-action="'+c.action+'" ':'')+(opts.can?'data-card="'+c.id+'" data-source="'+opts.source+'" draggable="true"':'disabled')+
  ' aria-label="'+safe(action?c.action.toUpperCase()+' action: '+A.rules[c.action]:'Number '+c.rank)+'" aria-pressed="'+Boolean(opts.selected)+'">'+A.face(c)+'</button>';
}
function setMessage(e){const map={
 online_not_configured:'Online games need the room database connection to be configured on Vercel.',
 service_unavailable:'The room server is temporarily unavailable.',
 session_required:'Your saved seat session is missing. Rejoin from your invitation link.',
 not_member:'This browser does not own a seat in this room.',
 invalid_code:'This room link is not valid.',room_not_found:'This room was not found.',
 room_expired:'The room expired after 24 hours.',game_not_finished:'Finish the round before starting another.',not_bot_turn:'Waiting for a player move.',no_snap_available:'The matching-draw opportunity has already passed.',room_rules_changed:'This room uses an older deck. Create a new game for the updated rules.',unready_to_swap:'Choose Change cards first.',bad_ready:'Invalid ready status.',full:'The room is full.',
 already_started:'The game already started.',waiting_for_players:'Waiting for everyone to join.',
 stale_revision:'Someone played at the same time. Refreshing the table.',
  snap_window_open:'A matching number was just drawn. That player gets a moment to SNAP it.',
 rate_limited:'Too many requests from this network. Please try again later.',
 bad_cards:'That group of cards is not legal.',wrong_layer:'Finish your current card layer first.'
 };return map[e]||String(e||'Unexpected room error').replaceAll('_',' ');}
async function api(payload,auth=session){
 const res=await fetch('/api/pilehead',{method:'POST',headers:{'Content-Type':'application/json',...(auth?{Authorization:'Bearer '+auth}:{})},
  body:JSON.stringify(payload),cache:'no-store',credentials:'same-origin'});
 let json;try{json=await res.json()}catch{throw Error('Invalid response from game server')}
 if(!res.ok)throw Error(json.error||'server_error');
 return json;
}
function invite(){return location.origin+location.pathname+'?room='+encodeURIComponent(room)+(deploymentShare?'&_vercel_share='+encodeURIComponent(deploymentShare):'')}
function storeName(value){try{localStorage.setItem(NAME,value)}catch{}}
function updateState(next){
 if(!next||!next.ok)return;
 if(next.session){session=next.session;safeSessionSave(STORE+next.code,session)}
 if(room!==next.code){room=next.code;history.replaceState(null,'',location.pathname+'?room='+encodeURIComponent(room)+(deploymentShare?'&_vercel_share='+encodeURIComponent(deploymentShare):''))}
 if(!data||next.revision!==data.revision)lastChangeAt=Date.now();
 if(data&&next.revision!==data.revision){selection=[];swapCard=null}
 if(data&&next.game?.round!==data.game?.round){endDismissed=false;sortMode='dealt';selection=[];swapCard=null}
 data=next;lastRevision=data.revision;networkError='';render();
}
async function doAction(payload){
 if(busy)return;busy=true;notice='';render();
 try{const next=await api(payload,payload.action==='create'||payload.action==='join'?null:session);updateState(next);
  if(payload.action==='create')notice='Room created. Share your invitation link.';
  if(payload.action==='join')notice='You joined. Choose your face-up cards while waiting.';
  // The table and turn HUD now confirm the start; avoid a redundant persistent message.
   if(payload.action==='rematch')notice='New round dealt! Choose your face-up cards and get ready.';
   if(payload.action==='decline')notice='Passed on SNAP. Next player may continue.';
  networkError='';
 }catch(e){
  notice=setMessage(e.message);
  if(e.message==='stale_revision')await refresh(true);
  if(e.message==='online_not_configured')networkError=notice;
 }finally{busy=false;render()}
}
async function refresh(quiet=false){
 if(!room||!session||polling)return;
 polling=true;
 try{
  const next=await api({action:'state',code:room});
  if(!data||next.revision!==data.revision||next.members.length!==data.members.length||
     next.game.followup?.length!==data.game.followup?.length||reconnecting)updateState(next);
  else networkError='';
  reconnecting=false;
 }catch(e){
  networkError=setMessage(e.message);
  if(!quiet||!data)render();
 }finally{polling=false}
}
function displayName(seat){
 const bots=data?.game?.botSeats||[];
 if(bots.includes(seat))return 'Bot '+(bots.indexOf(seat)+1);
 return data?.members?.find(m=>m.seat===seat)?.name||'Waiting for player';
}
function current(){return data?.game?.players?.[data.me]}
function snapBlocked(){const g=data?.game;return !!g?.snapUntil&&Date.now()<g.snapUntil&&g.snapSeat!==data.me;}
function active(){return data?.game?.turn===data.me&&data?.game?.phase==='play'&&!snapBlocked()}
function statusTitle(){
 const g=data.game;if(g.phase==='setup')return data.members.length+' of '+data.capacity+' players joined';
 if(g.phase==='over')return displayName(g.loser)+' is the PILEHEAD!';
 return snapBlocked()?displayName(g.snapSeat)+' has a matching-draw SNAP chance':
   active()?'Your turn · place a card':displayName(g.turn)+' is playing · watch for SLAM';
}
function numberPolicy(){const l=data.game.limit;return l?.type==='under'?'NEXT: 1–4':l?.type==='min'?'NEXT: '+l.value+' or higher':'ANY NUMBER'}
function opponentCards(){const g=data.game;
 return '<div class="opponents">'+g.players.filter(p=>p.seat!==data.me).map(p=>'<div data-seat="'+p.seat+'" class="opponent '+
  (g.turn===p.seat&&g.phase==='play'?'current ':'')+(p.out?'finished ':'')+((g.botSeats||[]).includes(p.seat)?'is-bot':'')+'"><strong>'+safe(displayName(p.seat))+
  (g.turn===p.seat&&g.phase==='play'?' · TURN':'')+(p.out?' · OUT':'')+'</strong><small>'+p.handCount+
  ' in hand · '+p.up.length+' up · '+p.downCount+' blind</small><div class="held-cards" aria-label="Opponent holds '+p.handCount+' private cards">'+Array.from({length:Math.min(p.handCount,8)},(_,i)=>'<span class="held-back" aria-hidden="true" style="--hold-angle:'+((i-(Math.min(p.handCount,8)-1)/2)*5)+'deg"></span>').join('')+'</div><div class="mini-cards">'+
  p.up.map(c=>A.mini(c)).join('')+
  Array.from({length:p.downCount},()=>A.mini(null)).join('')+'</div></div>').join('')+'</div>';
}
function stack(){const g=data.game,a=g.pile.slice(-4);
 return '<div class="table-center"><div class="stack"><div class="stack-label">DRAW</div><div class="pile-card">'+
  (g.stockCount?'<div class="card back ph-card ph-back" style="pointer-events:none">'+A.back()+'</div>':'<div class="placeholder">EMPTY</div>')+
  '</div><div class="stack-count">'+g.stockCount+' cards</div></div><div class="stack play-drop" data-play-target="pile" role="button" tabindex="0" aria-label="Play selected cards on the pile">'+
  '<div class="stack-label">THE PILE</div><div class="pile-card">'+
  (a.length?a.map((c,i)=>'<div class="card-wrap" style="--offset:'+((i-(a.length-1)/2)*8)+'px;--angle:'+((i-(a.length-1)/2)*5)+'deg">'+card(c)+'</div>').join(''):'<div class="placeholder">CLEAR</div>')+
  '</div><div class="stack-count">'+g.pile.length+' cards</div><div class="stack-count">'+numberPolicy()+
  '</div></div><div class="stack"><div class="stack-label">BURNED</div><div class="pile-card"><div class="placeholder">✕</div></div>'+
  '<div class="stack-count">'+g.ashesCount+' removed</div></div></div>';
}
function bridgeAvailable(){
 const p=current(),g=data?.game;
 return active()&&g.stockCount===0&&p.handCount===1&&p.hand?.[0]?.kind==='number'&&
  p.up.some(c=>c.kind==='number'&&c.rank===p.hand[0].rank);
}
function upDown(){
 const p=current(),stage=stageNow(),upCan=(stage==='up'&&active())||bridgeAvailable(),blindCan=stage==='down'&&active();
 return '<div class="zone your-up"><div class="area-label"><span>FACE UP · '+p.up.length+'</span><span>BLIND · '+p.downCount+'</span></div><div class="card-row">'+
  Array.from({length:Math.max(p.up.length,p.downCount)},(_,i)=>{
   const up=p.up[i],down=i<p.downCount;
   if(up)return '<div class="up-pair">'+(down?'<div class="card back ph-card ph-back" aria-hidden="true">'+A.back()+'</div>':'')+
    card(up,{can:upCan,source:'up',selected:selection.includes(up.id)})+'</div>';
   return down?card(null,{back:true,can:blindCan,index:i}):'';
  }).join('')+'</div></div>';
}
function stageNow(){const p=current(),g=data.game;return p.handCount||g.stockCount?'hand':p.up.length?'up':p.downCount?'down':'out'}
function legalMove(){
 if(!active()||!selection.length)return null;
 const source=stageNow();
 const exact=data.game.legal.find(o=>o.type==='play'&&o.source===source&&
  Array.isArray(o.ids)&&o.ids.length===selection.length&&o.ids.every(id=>selection.includes(id)));
 if(!exact)return null;
 // The engine's bridge move requires the final hand card to be first even
 // when a player taps the matching face-up card before their hand.
 const handIds=source==='hand'&&bridgeAvailable()?selection.filter(id=>current().hand?.some(c=>c.id===id)):[];
 return {type:'play',source,ids:handIds.length?[...handIds,...selection.filter(id=>!handIds.includes(id))]:selection.slice()};
}
const effectInfo={
 reset:'RESET lifts the number restriction. Any number can follow.',
 ghost:'GHOST keeps the previous number restriction in force.',
 under:'UNDER forces the next number to be 1 through 4.',
 skip:'SKIP makes the next player miss a turn.',
 burn:'BURN destroys the entire pile and gives the same player another turn.',
 dump:'DUMP burns itself and forces the next player to collect the existing pile.'
};
function selectedEffect(){
 const cards=[...(current()?.hand||[]),...(current()?.up||[])],picked=cards.find(c=>selection.includes(c.id)&&c.kind==='action');
 if(!picked)return '';
 return '<div class="pilehead-selected-effect"><strong>YOUR '+safe(picked.action.toUpperCase())+' CARD</strong><span>'+safe(effectInfo[picked.action]||'Special action')+'</span></div>';
}
function lastEffect(){
 const e=data?.game?.events?.at(-1);if(!e)return '';
 let message=e.bridgeCount?'HAND + FACE-UP COMBO · '+displayName(e.seat)+' moved matching cards from both layers.':
  e.type==='followup'?'SNAP · '+displayName(e.seat)+' immediately threw a matching drawn '+e.rank+'.':
 e.reason==='four'||e.reason==='slam'?'FOUR OF A KIND · The entire pile burns.':
 e.action?effectInfo[e.action]:
 e.type==='take'||e.type==='blind-fail'?'PICKUP · The pile moves into '+displayName(e.seat)+'’s hand.':
 e.burned?'BURN · The pile is removed from the table.':
 'PLAY · '+displayName(e.seat)+' placed '+e.count+' card'+(e.count===1?'':'s')+'.';
 if(!message)return '';
 return '<div class="pilehead-effect-note" role="status" aria-live="polite"><span class="effect-label">'+
  safe(e.bridgeCount?'COMBO':e.action?e.action.toUpperCase():e.type==='followup'?'SNAP':e.burned?'BURN':'LAST MOVE')+
  '</span><span>'+safe(message)+'</span></div>';
}
function events(){return data.game.events.slice(-7).reverse().map(e=>{
 const n=safe(displayName(e.seat));let s=e.type==='take'?'picked up '+e.count+' cards':e.type==='blind-fail'?'picked up after a blind flip':
 e.type==='followup'?'SNAP! threw the freshly drawn matching '+e.rank:
 e.action==='dump'?'burned DUMP; '+displayName(e.target)+' took '+e.takenCount+' pile cards':e.reason==='slam'?'SLAM! Burned the pile':e.burned?'burned the pile':e.action?'played '+(e.count>1?e.count+' × ':'')+e.action.toUpperCase():'played '+e.count+' × '+e.rank;
 return '<span class="event">'+n+' '+safe(s)+'</span>';
 }).join('')}
function lobby(){
 const joined=data.members.length,humans=data.humanCount||data.capacity,bots=data.game.botSeats||[],me=current(),ready=data.game.setupReady||[];
 const myReady=!!ready[data.me],allReady=joined===humans&&Array.from({length:data.capacity},(_,i)=>ready[i]).every(Boolean);
 return '<section class="setup panel online-lobby"><div class="eyebrow">PRIVATE ONLINE ROOM · '+safe(room)+'</div>'+
  '<h2>Choose your opening cards</h2><p>'+humans+' human '+(humans===1?'player':'players')+' · '+bots.length+' '+(bots.length===1?'bot':'bots')+'. Share the link with your friends; computer players are ready automatically.</p>'+
  '<div class="online-code">'+safe(room)+'</div><div class="toolbar"><button class="action primary" data-do="copy">Copy invite link</button>'+
  '<button class="action secondary" data-do="share">Share</button></div>'+
  '<div class="lobby-seats">'+Array.from({length:data.capacity},(_,i)=>'<div class="lobby-seat '+(i<joined||bots.includes(i)?'filled':'')+(bots.includes(i)?' is-bot':'')+'">'+
  '<span>Seat '+(i+1)+(bots.includes(i)?' · CPU':'')+'</span><strong>'+safe(displayName(i))+'</strong><small>'+(bots.includes(i)?'Ready automatically':i<joined?(ready[i]?'Ready':'Choosing cards'):'Waiting to join')+'</small></div>').join('')+'</div>'+
  '<div class="setup-choice-guide"><strong>Step 1 · Choose your three face-up cards</strong><span>Tap a card in your hand, then tap the face-up card you want to replace. The host cannot start until everyone confirms.</span></div>'+
  '<div class="area-label"><span>FACE-UP CARDS</span></div><div class="card-row">'+me.up.map(c=>card(c,{can:!myReady,source:'up',selected:swapCard?.id===c.id})).join('')+'</div>'+
  '<div class="area-label"><span>YOUR HAND</span></div><div class="card-row hand">'+me.hand.map(c=>card(c,{can:!myReady,source:'hand',selected:swapCard?.id===c.id})).join('')+'</div>'+
  '<div class="setup-ready-controls"><button class="action '+(myReady?'secondary':'primary')+'" data-do="ready" '+(busy?'disabled':'')+'>'+
  (myReady?'Change cards':'Step 2 · I’m ready')+'</button>'+
  (data.host?'<button class="action primary" data-do="start" '+(!allReady||busy?'disabled':'')+'>Start game · '+ready.filter(Boolean).length+'/'+data.capacity+' ready</button>':
  '<span class="small">'+(myReady?'Waiting for the host to start…':'Confirm your cards when ready')+'</span>')+'</div></section>';
}

function tableHUD(){
 const g=data.game;
 const layer=stageNow(),layerText=layer==='hand'?'HAND':layer==='up'?'FACE-UP CARDS':layer==='down'?'BLIND CARDS':'FINISHED';
 const who=g.phase==='over'?'ROUND COMPLETE':active()?'YOUR TURN':displayName(g.turn)+' TO PLAY';
 return '<div class="pilehead-table-hud '+(active()?'is-my-turn':'')+'" role="status">'+
 '<span class="hud-status"><i class="hud-dot" aria-hidden="true"></i>'+safe(who)+'</span>'+
 '<span class="hud-meta"><span>ROUND '+(g.round||1)+'</span><span>'+layerText+'</span><span>'+g.pile.length+' IN PILE</span>'+
 (g.slam?.length?'<span>SLAM READY</span>':'')+
 (g.followup?.length?'<span class="hud-snap">SNAP '+g.followup[0].ids.length+' MATCHING CARD'+(g.followup[0].ids.length>1?'S':'')+'</span>':'')+
 (snapBlocked()?'<span class="hud-snap">SNAP REACTION WINDOW</span>':'')+'</span></div>';
}
function tableActions(){
 const g=data.game,can=active(),legal=legalMove(),take=can&&g.legal?.some(m=>m.type==='take');
 const slam=g.slam?.length>0,snap=g.followup?.length>0;
 let buttons='';
 if(g.phase==='over')buttons='<button class="action primary" data-do="rematch">Play again · same room</button>';
 else {
  if(snap)buttons+='<button class="action snap" data-do="snap" '+(busy?'disabled':'')+'>SNAP · matching draw</button>';
  if(slam)buttons+='<button class="action slam" data-do="slam" '+(busy?'disabled':'')+'>SLAM · '+g.slam[0].ids.length+' cards</button>';
  if(can&&legal){
   const burn=current().hand?.some(c=>selection.includes(c.id)&&c.action==='burn');
   buttons+='<button class="action primary" data-do="play" '+(busy?'disabled':'')+'>'+
    (burn?'BURN PILE':'Play '+selection.length+' card'+(selection.length===1?'':'s'))+
    ' <span aria-hidden="true">↗</span></button>';
  }
  if(take)buttons+='<button class="action secondary" data-do="take" '+(busy?'disabled':'')+'>Take pile</button>';
  if(!buttons){
   const message=can?(selection.length?'Choose a legal combination':'Select a card to play'):
    (snapBlocked()?'SNAP in progress':displayName(g.turn)+' is playing');
   buttons='<span class="table-action-prompt" role="status">'+safe(message)+
    '<small>'+(can?'Tap cards to select · drag onto pile':'Watch the table · SLAM is still possible')+'</small></span>';
  }
 }
 return '<div class="toolbar table-actions" role="group" aria-label="Game actions">'+buttons+'</div>';
}
function playView(){
 const p=current(),g=data.game,can=active(),source=stageNow(),legal=legalMove(),canSlam=g.slam?.length>0;
 return '<div class="pitch"><h1>'+safe(statusTitle())+'</h1><p>ROUND '+(g.round||1)+' · ROOM '+safe(room)+' · '+(data.humanCount||data.capacity)+' humans · '+(data.botCount||0)+' bots</p></div>'+
  '<div class="online-room-tools"><span><span class="online-pulse"></span> Room '+safe(room)+'</span>'+
  '<button class="action secondary" data-do="copy">Copy invitation</button><span>Seat '+(data.me+1)+': '+safe(displayName(data.me))+'</span></div>'+tableHUD()+
  '<section class="table" aria-label="Live physical PILEHEAD table">'+opponentCards()+stack()+upDown()+
  '<div class="hand-area"><div class="area-label"><span>YOUR HAND <b>· '+p.handCount+'</b></span><span class="hand-controls">'+
 (selection.length?'<button type="button" class="hand-clear-button" data-do="clear-selection" aria-label="Clear selected cards">'+selection.length+' selected · Clear</button>':'')+
 '<button type="button" class="hand-sort-button" data-do="sort" title="Sort cards by rank">Sort '+(sortMode==='dealt'?'↑':sortMode==='asc'?'↓':'↺')+'</button></span></div>'+
  '<div class="card-row hand">'+(p.hand?.length?orderedHand(p.hand).map(c=>card(c,{can:can&&source==='hand',source:'hand',selected:selection.includes(c.id)})).join(''):
  '<span style="font-size:12px;color:#b8cfba">No cards in hand</span>')+'</div></div></section>'+
 (g.followup?.length?'<div class="pilehead-snap-choice">You just drew a matching number. Throw it now, or <button class="action secondary" data-do="decline">Let the next player go</button>.</div>':'')+
 (bridgeAvailable()?'<p class="pilehead-bridge-hint">MATCHING FACE-UP: Your last hand card can be played together with the matching face-up cards. Tap either one to select the group.</p>':'')+
 (selectedEffect()||lastEffect())+tableActions()+
  (notice?'<div class="message" role="status" aria-live="polite">'+safe(notice)+'</div>':'')+
  '<div class="meta"><span>Move '+g.moves+'</span><span>Draw '+g.stockCount+'</span><span>Ashes '+g.ashesCount+'</span><span>Synced · rev '+data.revision+'</span></div>'+
  '<div class="event-list">'+events()+'</div>';
}
function endScreen(){
 if(!data||data.game.phase!=='over'||endDismissed)return '';
 const g=data.game;
 return window.PileheadTableFX?.resultHTML({
  players:Array.from({length:data.capacity},(_,seat)=>displayName(seat)),
  finishedOrder:g.finishedOrder||[],loser:g.loser,me:data.me,
  moves:g.moves,ashes:g.ashesCount,online:true,key:room+':'+(g.round||1)+':'+g.moves
 })||'';
}
function welcome(){
 const nick=safe(safeSessionRead(NAME)||'');
 if(room)return '<section class="setup panel"><div class="eyebrow">PILEHEAD · INVITED TABLE</div><h2>Take your seat</h2>'+
  '<p>Room <strong>'+safe(room)+'</strong>. Play with your friends and any bots already at the table. Only your own hand will be visible; no account required.</p>'+
  '<label>Your name<input id="online-name" maxlength="24" autocomplete="nickname" value="'+nick+'" placeholder="Player name"></label>'+
  '<div class="toolbar"><button class="action primary" data-do="join">Join room</button><a class="action secondary" href="?online=1">Create another room</a></div></section>';
 return '<section class="setup panel"><div class="eyebrow">PILEHEAD · REAL PLAYERS</div><h2>A real table, wherever your friends are.</h2>'+
  '<p>Create a private room, send the link, and play together. Everyone gets their own secret hand. SLAM works even during someone else’s turn.</p>'+
  '<div class="fields"><label>Your name<input id="online-name" maxlength="24" autocomplete="nickname" value="'+nick+'" placeholder="Player name"></label>'+
  '<label>Human players (including you)<select id="online-humans">'+[1,2,3,4,5].map(n=>'<option value="'+n+'" '+(n===2?'selected':'')+'>'+n+' '+(n===1?'human':'humans')+'</option>').join('')+'</select></label>'+
  '<label>Computer opponents<select id="online-bots">'+[0,1,2,3,4].map(n=>'<option value="'+n+'">'+n+' '+(n===1?'bot':'bots')+'</option>').join('')+'</select></label></div>'+
  '<p id="online-seat-summary" class="online-seat-summary" role="status">2 players · 2 humans + 0 bots (max 5)</p>'+
  '<button class="action primary" data-do="create">Create online room</button>'+
  '<p class="small">Rooms last for 24 hours. No sign-in required; keep this browser to retain your seat.</p></section>';
}
function render(){
 root.innerHTML='<div class="online-layout">'+(!data?welcome():data.game.phase==='setup'?lobby():playView())+
  ((notice||networkError)&&data?.game.phase==='setup'?'<div class="message" role="status">'+safe(notice||networkError)+'</div>':'')+
  (networkError?'<p class="online-error" role="alert">'+safe(networkError)+'</p>':'')+
  '</div>'+endScreen();
 window.PileheadTableFX?.sync({identity:data?room+':'+data.game.moves:null,
  gameKey:data?room+':round:'+data.game.round:null,
  event:data?.game.events?.[data.game.events.length-1]||null,events:data?.game.events||[],
  ownSeat:data?.me||0,active:data?active():false,turn:data?.game.turn??null,
  selected:selection.length,moveNo:data?.game.moves||0,online:true});
}
async function command(action,more={}){
 if(!data)return;
 if(action==='move'&&more.move?.source){
  window.PileheadTableFX?.captureMove?.({
   gameKey:room+':round:'+data.game.round,
   seat:data.me,moveNo:data.game.moves+1,move:more.move
  });
 }
 await doAction({action,code:room,revision:data.revision,...more});
}
async function play(){const m=legalMove();if(m)await command('move',{move:m});else{notice='That group is not currently legal.';render()}}
async function selectCard(c){
 if(!data)return;
 if(data.game.phase==='setup'){
  if(data.game.setupReady?.[data.me])return;
  if(!swapCard){swapCard=c;selection=[];render();return}
  if(swapCard.source===c.source){swapCard=c;render();return}
  const handId=c.source==='hand'?c.id:swapCard.id,upId=c.source==='up'?c.id:swapCard.id;
  swapCard=null;await command('swap',{handId,upId});return;
 }
 const bridge=bridgeAvailable()&&stageNow()==='hand'&&['up','hand'].includes(c.source);
 if(!active()||(c.source!==stageNow()&&!bridge))return;
 const my=current()[c.source],card=my?.find(x=>x.id===c.id);if(!card)return;
 selectMatching(bridge?[...current().hand,...current().up]:my,c.id);
 if(selection.includes(c.id)){try{navigator.vibrate?.(8)}catch{}}
 render();
}
root.addEventListener('click',async e=>{
 const target=e.target.closest('button');if(!target||busy)return;
 if(target.dataset.card){await selectCard({id:Number(target.dataset.card),source:target.dataset.source});return}
 if(target.dataset.blind!==undefined&&target.dataset.blind!==''){await command('move',{move:{type:'play',source:'down',index:Number(target.dataset.blind)}});return}
 const action=target.dataset.do;if(!action)return;
 if(action==='create'||action==='join'){
  const nick=$('online-name')?.value?.trim();if(!nick){notice='Enter your name to join.';render();return}
  storeName(nick);notice='';
  const humans=Number($('online-humans')?.value??2),bots=Number($('online-bots')?.value??0);
   if(action==='create'&&(humans+bots<2||humans+bots>5)){notice='Choose 2 to 5 players in total.';render();return}
   const opts=action==='create'?{humans,bots,name:nick}:{code:room,name:nick};
  await doAction({action,...opts});return;
 }
 if(action==='dismiss-result'){endDismissed=true;render();return}
 if(action==='rematch'){endDismissed=false;await command('rematch');return}
  if(action==='ready'){swapCard=null;await command('ready',{ready:!data?.game.setupReady?.[data.me]});}
 if(action==='start')await command('start');
 if(action==='clear-selection'){selection=[];render();return}
  if(action==='sort'){sortMode=sortMode==='dealt'?'asc':sortMode==='asc'?'desc':'dealt';selection=[];window.PileheadTableFX?.resetHandScroll?.();render();}
 if(action==='play')await play();
 if(action==='take')await command('move',{move:{type:'take'}});
 if(action==='slam'){const m=data?.game.slam?.[0];if(m)await command('move',{move:m})}
 if(action==='snap'){const m=data?.game.followup?.[0];if(m)await command('move',{move:m})}
 if(action==='decline')await command('decline');
 if(action==='copy'){try{await navigator.clipboard.writeText(invite());notice='Invite link copied.'}catch{notice='Copy this link: '+invite()}render()}
 if(action==='share'){try{if(navigator.share)await navigator.share({title:'PILEHEAD',url:invite(),text:'Join my PILEHEAD card game'});else await navigator.clipboard.writeText(invite())}catch{}}
});
root.addEventListener('change',e=>{
 const select=e.target.closest('#online-humans,#online-bots');
 if(!select)return;
 const humans=Number($('online-humans')?.value??2),bots=Number($('online-bots')?.value??0),total=humans+bots;
 const info=$('online-seat-summary'),button=root.querySelector('[data-do="create"]');
 const valid=total>=2&&total<=5;
 if(info){info.textContent=valid?total+' players · '+humans+' human'+(humans===1?'':'s')+' + '+bots+' bot'+(bots===1?'':'s'):total+' players selected · choose 2 to 5 total';info.classList.toggle('is-invalid',!valid)}
 if(button)button.disabled=!valid;
});
root.addEventListener('click',e=>{
 if(e.target.closest('[data-play-target]')&&selection.length&&!busy)play();
});
root.addEventListener('keydown',e=>{
 if((e.key==='Enter'||e.key===' ')&&e.target.closest('[data-play-target]')){e.preventDefault();play()}
});
root.addEventListener('dragstart',e=>{
 const b=e.target.closest('[data-card]');if(!b||!active())return;
 drag={id:Number(b.dataset.card),source:b.dataset.source};
 if(!selection.includes(drag.id))selectMatching(current()[drag.source]||[],drag.id);
 if(e.dataTransfer){e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain',String(drag.id))}
});
root.addEventListener('dragover',e=>{if(drag&&e.target.closest('[data-play-target]'))e.preventDefault()});
root.addEventListener('drop',e=>{if(!drag||!e.target.closest('[data-play-target]'))return;e.preventDefault();drag=null;play()});
root.addEventListener('dragend',()=>drag=null);

/* Physical gesture support on phones: lift a card, drag it, release on pile. */
let touchGesture=null,ignoreNextClick=false;
root.addEventListener('click',e=>{if(ignoreNextClick){e.preventDefault();e.stopImmediatePropagation();ignoreNextClick=false}},true);
root.addEventListener('pointerdown',e=>{
 if(e.pointerType==='mouse'||!active()||busy||data.game.phase!=='play')return;
 const b=e.target.closest('[data-card]');if(!b)return;
 touchGesture={id:Number(b.dataset.card),source:b.dataset.source,x:e.clientX,y:e.clientY,moving:false,scrolling:false,ghost:null,row:b.closest('.card-row.hand'),startScroll:b.closest('.card-row.hand')?.scrollLeft||0};
});
window.addEventListener('pointermove',e=>{
 const t=touchGesture;if(!t||e.pointerType==='mouse')return;
 const dx=e.clientX-t.x,dy=e.clientY-t.y;
 if(!t.moving&&!t.scrolling&&Math.hypot(dx,dy)>12){
  if(t.row&&t.row.scrollWidth>t.row.clientWidth+2&&Math.abs(dx)>Math.abs(dy)*1.35)t.scrolling=true;
  else t.moving=true;
 }
 if(t.scrolling){e.preventDefault();t.row.scrollLeft=t.startScroll-dx;return}
 if(t.moving&&!t.ghost){const b=root.querySelector('[data-card="'+t.id+'"]');
  if(!b)return;t.ghost=b.cloneNode(true);t.ghost.classList.add('card-ghost');document.body.appendChild(t.ghost);
  if(!selection.includes(t.id))selectMatching(current()[t.source]||[],t.id);
  if(selection.length>1){const badge=document.createElement('span');
   badge.className='drag-count';badge.textContent=selection.length+' cards';t.ghost.appendChild(badge)}
 }
 if(t.moving&&t.ghost){
  e.preventDefault();t.ghost.style.left=e.clientX+'px';t.ghost.style.top=e.clientY+'px';
  const zone=document.elementFromPoint(e.clientX,e.clientY)?.closest('[data-play-target]');
  root.querySelector('[data-play-target]')?.classList.toggle('drop-hover',!!zone);
 }
},{passive:false});
window.addEventListener('pointerup',e=>{
 const t=touchGesture;if(!t)return;touchGesture=null;
 const zone=t.moving?document.elementFromPoint(e.clientX,e.clientY)?.closest('[data-play-target]'):null;
 t.ghost?.remove();root.querySelector('[data-play-target]')?.classList.remove('drop-hover');
 if(!t.moving&&!t.scrolling)return;
 ignoreNextClick=true;setTimeout(()=>ignoreNextClick=false,350);
 if(t.scrolling)return;
 if(zone&&active()&&stageNow()===t.source){
  if(!selection.includes(t.id))selectMatching(current()[t.source]||[],t.id);play()}
});
window.addEventListener('pointercancel',()=>{
 touchGesture?.ghost?.remove();touchGesture=null;root.querySelector('[data-play-target]')?.classList.remove('drop-hover');
});

function startPolling(){
 if(pollTimer)return;pollTimer=setInterval(async()=>{
  if(document.visibilityState==='hidden'||busy||!session||!data)return;
  await refresh(true);
  if(busy||polling||!data||data.game.phase!=='play')return;
  const bots=data.game.botSeats||[];
  // Allow a brief physical reaction window for a freshly drawn matching card.
  if(data.game.followup?.length&&Date.now()-lastChangeAt<4700)return;
  if(data.game.snapUntil&&Date.now()<data.game.snapUntil&&!data.game.botFollowupReady)return;
   if(snapBlocked())return;
   if((bots.includes(data.game.turn)||data.game.botFollowupReady)&&Date.now()-botTickAt>=1250){
   botTickAt=Date.now();
   await command('advance');
  }
 },1750);
 document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&session)refresh(true)});
}
render();startPolling();
if(room&&session){reconnecting=true;refresh(false)}
})();