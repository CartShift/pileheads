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
let lastRevision=-1,lastEvent=null,pollTimer=null,reconnecting=false,sortMode='dealt',endDismissed=false;
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
 room_expired:'The room expired after 24 hours.',room_rules_changed:'This room uses an older deck. Create a new game for the updated rules.',unready_to_swap:'Choose Change cards first.',bad_ready:'Invalid ready status.',full:'The room is full.',
 already_started:'The game already started.',waiting_for_players:'Waiting for everyone to join.',
 stale_revision:'Someone played at the same time. Refreshing the table.',
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
 if(data&&next.revision!==data.revision){selection=[];swapCard=null}
 data=next;lastRevision=data.revision;networkError='';render();
}
async function doAction(payload){
 if(busy)return;busy=true;notice='';render();
 try{const next=await api(payload,payload.action==='create'||payload.action==='join'?null:session);updateState(next);
  if(payload.action==='create')notice='Room created. Share your invitation link.';
  if(payload.action==='join')notice='You joined. Choose your face-up cards while waiting.';
  if(payload.action==='start')notice='Cards are on the table. Good luck!';
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
  if(!data||next.revision!==data.revision||next.members.length!==data.members.length||reconnecting)updateState(next);
  else networkError='';
  reconnecting=false;
 }catch(e){
  networkError=setMessage(e.message);
  if(!quiet||!data)render();
 }finally{polling=false}
}
function displayName(seat){return data?.members?.find(m=>m.seat===seat)?.name||'Waiting for player'}
function current(){return data?.game?.players?.[data.me]}
function active(){return data?.game?.turn===data.me&&data?.game?.phase==='play'}
function statusTitle(){
 const g=data.game;if(g.phase==='setup')return data.members.length+' of '+data.capacity+' players joined';
 if(g.phase==='over')return displayName(g.loser)+' is the PILEHEAD!';
 return active()?'Your turn · place a card':displayName(g.turn)+' is playing · watch for SLAM';
}
function numberPolicy(){const l=data.game.limit;return l?.type==='under'?'NEXT: 1–4':l?.type==='min'?'NEXT: '+l.value+' or higher':'ANY NUMBER'}
function opponentCards(){const g=data.game;
 return '<div class="opponents">'+g.players.filter(p=>p.seat!==data.me).map(p=>'<div data-seat="'+p.seat+'" class="opponent '+
  (g.turn===p.seat&&g.phase==='play'?'current ':'')+(p.out?'finished':'')+'"><strong>'+safe(displayName(p.seat))+
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
function upDown(){
 const p=current(),stage=stageNow(),upCan=stage==='up'&&active(),blindCan=stage==='down'&&active();
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
 return exact?{type:'play',source,ids:selection.slice()}:null;
}
function events(){return data.game.events.slice(-7).reverse().map(e=>{
 const n=safe(displayName(e.seat));let s=e.type==='take'?'picked up '+e.count+' cards':e.type==='blind-fail'?'picked up after a blind flip':
 e.action==='dump'?'burned DUMP; '+displayName(e.target)+' took '+e.takenCount+' pile cards':e.reason==='slam'?'SLAM! Burned the pile':e.burned?'burned the pile':e.action?'played '+(e.count>1?e.count+' × ':'')+e.action.toUpperCase():'played '+e.count+' × '+e.rank;
 return '<span class="event">'+n+' '+safe(s)+'</span>';
 }).join('')}
function lobby(){
 const joined=data.members.length,me=current(),ready=data.game.setupReady||[];
 const myReady=!!ready[data.me],allReady=joined===data.capacity&&Array.from({length:data.capacity},(_,i)=>ready[i]).every(Boolean);
 return '<section class="setup panel online-lobby"><div class="eyebrow">PRIVATE ONLINE ROOM · '+safe(room)+'</div>'+
  '<h2>Invite your friends to the table</h2><p>Share the room link. Every participant receives a private hand and can reconnect after refreshing.</p>'+
  '<div class="online-code">'+safe(room)+'</div><div class="toolbar"><button class="action primary" data-do="copy">Copy invite link</button>'+
  '<button class="action secondary" data-do="share">Share</button></div>'+
  '<div class="lobby-seats">'+Array.from({length:data.capacity},(_,i)=>'<div class="lobby-seat '+(i<joined?'filled':'')+'">'+
  '<span>Seat '+(i+1)+'</span><strong>'+safe(displayName(i))+'</strong><small>'+(i<joined?(ready[i]?'Ready':'Choosing cards'):'Waiting')+'</small></div>').join('')+'</div>'+
  '<div class="setup-choice-guide"><strong>Step 1 · Choose your three face-up cards</strong><span>Tap a card in your hand, then tap the face-up card you want to replace. The host cannot start until everyone confirms.</span></div>'+
  '<div class="area-label"><span>FACE-UP CARDS</span></div><div class="card-row">'+me.up.map(c=>card(c,{can:!myReady,source:'up',selected:swapCard?.id===c.id})).join('')+'</div>'+
  '<div class="area-label"><span>YOUR HAND</span></div><div class="card-row hand">'+me.hand.map(c=>card(c,{can:!myReady,source:'hand',selected:swapCard?.id===c.id})).join('')+'</div>'+
  '<div class="setup-ready-controls"><button class="action '+(myReady?'secondary':'primary')+'" data-do="ready" '+(busy?'disabled':'')+'>'+
  (myReady?'Change cards':'Step 2 · I’m ready')+'</button>'+
  (data.host?'<button class="action primary" data-do="start" '+(!allReady||busy?'disabled':'')+'>Start game · '+ready.filter(Boolean).length+'/'+data.capacity+' ready</button>':
  '<span class="small">'+(myReady?'Waiting for the host to start…':'Confirm your cards when ready')+'</span>')+'</div></section>';
}
function playView(){
 const p=current(),g=data.game,can=active(),source=stageNow(),legal=legalMove(),canSlam=g.slam?.length>0;
 return '<div class="pitch"><h1>'+safe(statusTitle())+'</h1><p>LIVE ROOM · '+safe(room)+' · '+data.capacity+' players</p></div>'+
  '<div class="online-room-tools"><span><span class="online-pulse"></span> Room '+safe(room)+'</span>'+
  '<button class="action secondary" data-do="copy">Copy invitation</button><span>Seat '+(data.me+1)+': '+safe(displayName(data.me))+'</span></div>'+
  '<section class="table" aria-label="Live physical PILEHEAD table">'+opponentCards()+stack()+upDown()+
  '<div class="hand-area"><div class="area-label"><span>YOUR HAND · '+p.handCount+' cards</span><button type="button" class="hand-sort-button" data-do="sort" title="Change card order">Sort '+(sortMode==='dealt'?'↑':sortMode==='asc'?'↓':'↺')+'</button></div>'+
  '<div class="card-row hand">'+(p.hand?.length?orderedHand(p.hand).map(c=>card(c,{can:can&&source==='hand',source:'hand',selected:selection.includes(c.id)})).join(''):
  '<span style="font-size:12px;color:#b8cfba">No cards in hand</span>')+'</div></div></section>'+
  '<div class="toolbar"><button class="action primary" data-do="play" '+(!legal||busy?'disabled':'')+'>'+(legal&&p.hand?.some(c=>selection.includes(c.id)&&c.action==='burn')?'BURN PILE · '+selection.length:'Place '+(selection.length?selection.length+' card'+(selection.length>1?'s':''):'cards'))+'</button>'+
  '<button class="action secondary" data-do="take" '+(!can||!g.legal.some(x=>x.type==='take')||busy?'disabled':'')+'>Take pile</button>'+
  '<button class="action slam" data-do="slam" '+(!canSlam||busy?'disabled':'')+'>SLAM!'+(canSlam?' ×'+g.slam[0].ids.length+' NOW':'')+'</button></div>'+
  '<div class="message" role="status" aria-live="polite">'+safe(notice||'Tap once for all matching cards, tap one to remove it. SLAM interrupts when ready.')+'</div>'+
  '<div class="meta"><span>Move '+g.moves+'</span><span>Draw '+g.stockCount+'</span><span>Ashes '+g.ashesCount+'</span><span>Synced · rev '+data.revision+'</span></div>'+
  '<div class="event-list">'+events()+'</div>';
}
function endScreen(){
 if(!data||data.game.phase!=='over'||endDismissed)return '';
 const g=data.game,order=[...(g.finishedOrder||[]),...(g.loser===null?[]:[g.loser])];
 const won=g.loser!==data.me,champion=g.finishedOrder?.[0];
 return '<div class="pilehead-result-backdrop" role="dialog" aria-modal="true" aria-labelledby="pilehead-result-title">'+
  '<section class="pilehead-result-panel"><div class="result-glow" aria-hidden="true">✦ ✧ ✦</div>'+
  '<div class="eyebrow">PILEHEAD · GAME COMPLETE</div>'+
  '<div class="result-medal" aria-hidden="true">'+(won?'★':'♠')+'</div>'+
  '<h2 id="pilehead-result-title">'+(won?'Congratulations!':'Game over!')+'</h2>'+
  '<p class="result-lead">'+(won?'You escaped the pile!':'You are the PILEHEAD this round.')+'</p>'+
  '<div class="result-winner">First to finish <strong>'+safe(displayName(champion))+'</strong></div>'+
  '<div class="result-ranking">'+order.map((seat,i)=>'<div class="result-rank"><span class="result-position">'+(i===order.length-1?'LAST':('#'+(i+1)))+'</span>'+
   '<strong>'+safe(displayName(seat))+(seat===data.me?' · You':'')+'</strong>'+
   '<small>'+(seat===g.loser?'PILEHEAD':'Escaped')+'</small></div>').join('')+'</div>'+
  '<div class="result-actions"><a class="action primary" href="?online=1">Create a new game</a>'+
  '<button class="action secondary" data-do="dismiss-result">View final table</button></div>'+
  '<p class="result-footnote">New games start with fresh hands and a new invitation link.</p></section></div>';
}
function welcome(){
 const nick=safe(safeSessionRead(NAME)||'');
 if(room)return '<section class="setup panel"><div class="eyebrow">PILEHEAD · INVITED TABLE</div><h2>Take your seat</h2>'+
  '<p>Room <strong>'+safe(room)+'</strong>. Only your own hand will be visible. No account required.</p>'+
  '<label>Your name<input id="online-name" maxlength="24" autocomplete="nickname" value="'+nick+'" placeholder="Player name"></label>'+
  '<div class="toolbar"><button class="action primary" data-do="join">Join room</button><a class="action secondary" href="?online=1">Create another room</a></div></section>';
 return '<section class="setup panel"><div class="eyebrow">PILEHEAD · REAL PLAYERS</div><h2>A real table, wherever your friends are.</h2>'+
  '<p>Create a private room, send the link, and play together. Everyone gets their own secret hand. SLAM works even during someone else’s turn.</p>'+
  '<div class="fields"><label>Your name<input id="online-name" maxlength="24" autocomplete="nickname" value="'+nick+'" placeholder="Player name"></label>'+
  '<label>Seats<select id="online-seats">'+[2,3,4,5].map(n=>'<option value="'+n+'" '+(n===2?'selected':'')+'>'+n+' players</option>').join('')+'</select></label></div>'+
  '<button class="action primary" data-do="create">Create online room</button>'+
  '<p class="small">Rooms last for 24 hours. No sign-in required; keep this browser to retain your seat.</p></section>';
}
function render(){
 root.innerHTML='<div class="online-layout">'+(!data?welcome():data.game.phase==='setup'?lobby():playView())+
  ((notice||networkError)&&data?.game.phase==='setup'?'<div class="message" role="status">'+safe(notice||networkError)+'</div>':'')+
  (networkError?'<p class="online-error" role="alert">'+safe(networkError)+'</p>':'')+
  '</div>'+endScreen();
 window.PileheadTableFX?.sync({identity:data?room+':'+data.game.moves:null,
  event:data?.game.events?.[data.game.events.length-1]||null,
  ownSeat:data?.me||0,active:data?active():false,
  selected:selection.length,moveNo:data?.game.moves||0,online:true});
}
async function command(action,more={}){
 if(!data)return;
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
 if(!active()||c.source!==stageNow())return;
 const my=current()[c.source],card=my?.find(x=>x.id===c.id);if(!card)return;
 selectMatching(my,c.id);
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
  const opts=action==='create'?{capacity:Number($('online-seats')?.value||2),name:nick}:{code:room,name:nick};
  await doAction({action,...opts});return;
 }
 if(action==='dismiss-result'){endDismissed=true;render();return}
 if(action==='ready'){swapCard=null;await command('ready',{ready:!data?.game.setupReady?.[data.me]});}
 if(action==='start')await command('start');
 if(action==='sort'){sortMode=sortMode==='dealt'?'asc':sortMode==='asc'?'desc':'dealt';selection=[];window.PileheadTableFX?.resetHandScroll?.();render();}
 if(action==='play')await play();
 if(action==='take')await command('move',{move:{type:'take'}});
 if(action==='slam'){const m=data?.game.slam?.[0];if(m)await command('move',{move:m})}
 if(action==='copy'){try{await navigator.clipboard.writeText(invite());notice='Invite link copied.'}catch{notice='Copy this link: '+invite()}render()}
 if(action==='share'){try{if(navigator.share)await navigator.share({title:'PILEHEAD',url:invite(),text:'Join my PILEHEAD card game'});else await navigator.clipboard.writeText(invite())}catch{}}
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
 if(pollTimer)return;pollTimer=setInterval(()=>{
  if(document.visibilityState!=='hidden'&&!busy&&session&&data)refresh(true);
 },1750);
 document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&session)refresh(true)});
}
render();startPolling();
if(room&&session){reconnecting=true;refresh(false)}
})();