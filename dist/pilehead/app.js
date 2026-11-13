/* PILEHEAD physical playtest UI. No SPARK or TILT persistence keys touched. */
(function(){'use strict';
if(new URLSearchParams(location.search).has('online')||new URLSearchParams(location.search).has('room'))return;
const E=globalThis.PileheadEngine,A=globalThis.PileheadCardArt,$=id=>document.getElementById(id),app=$('app'),KEY='pilehead-playtest-v11';
let g=null,mode='bots',seats=4,setupSeat=0,selection=[],swapFrom=null,covered=false,challengeOpen=false,timer=null,notice='',lastMove=null;
function playerName(i){return mode==='bots'?(i===0?'You':'Bot '+i):'Player '+(i+1)}
function viewSeat(){return mode==='bots'?0:g?.turn??0}
function getPlayer(){return g.people[viewSeat()]}
function currentStage(){return E.stage(g,viewSeat())}
function isTurn(){return g.phase==='play'&&g.turn===viewSeat()}
function save(){try{localStorage.setItem(KEY,JSON.stringify({g,mode,seats,setupSeat,covered,notice,lastMove}))}catch(e){console.warn('Save unavailable',e)}}
function restore(){try{const x=JSON.parse(localStorage.getItem(KEY)||'null');
 if(!x||!['pilehead-1.1.0',E.VERSION].includes(x.g?.version)||!['bots','hotseat'].includes(x.mode))return false;
 // Same state schema and physical deck; migrate saved games without wiping the hand.
 x.g.version=E.VERSION;
 E.invariant(x.g);g=x.g;mode=x.mode;seats=x.seats;setupSeat=x.setupSeat??0;
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
 cards.map(c=>card(c,{interactive:interact,selected:selection.includes(c.id),source})).join('')+
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
function upAndDown(p,allow){return '<div class="zone your-up"><div class="area-label"><span>FACE UP · '+p.up.length+'</span><span>BLIND · '+p.down.length+'</span></div>'+
 '<div class="card-row">'+Array.from({length:Math.max(p.up.length,p.down.length)},(_,i)=>{
  const u=p.up[i],d=p.down[i],canUp=allow&&currentStage()==='up',canDown=allow&&currentStage()==='down';
  if(u)return '<div class="up-pair">'+(d?'<div class="card back ph-card ph-back">'+A.back()+'</div>':'')+
   card(u,{interactive:canUp,selected:selection.includes(u.id),source:'up'})+'</div>';
  return d?card(d,{back:true,interactive:canDown,source:'down'}):'';
 }).join('')+'</div></div>'}
function eventName(e){const who=playerName(e.seat);if(e.type==='take')return who+' picked up '+e.count;
 if(e.type==='blind-fail')return who+' flipped an illegal card and took '+e.count;
 if(e.action==='dump')return who+' used DUMP: '+playerName(e.target)+' took '+e.takenCount+' cards; '+who+' plays again';
 if(e.reason==='slam')return who+' SLAM! Burned the pile';
 if(e.burned)return who+' burned the pile';
 if(e.action)return who+' played '+(e.count>1?e.count+' × ':'')+e.action.toUpperCase();
 return who+' played '+e.count+' × '+e.rank}
function setupView(){if(!g)return '<section class="setup panel"><div class="eyebrow">One deck. One pile. Last player loses.</div>'+
 '<h2>Welcome to PILEHEAD</h2><p>A standalone Shithead-inspired card game with independent action cards, three layers and out-of-turn SLAM burns. The physical rules are identical for humans and bots.</p>'+
 '<div class="fields"><label>Players<select id="seat-count">'+[2,3,4,5].map(n=>'<option value="'+n+'" '+(seats===n?'selected':'')+'>'+n+' players</option>').join('')+'</select></label>'+
 '<label>Play against<select id="game-mode"><option value="bots" '+(mode==='bots'?'selected':'')+'>Computer opponents</option><option value="hotseat" '+(mode==='hotseat'?'selected':'')+'>Local pass-and-play</option></select></label></div>'+
 '<div class="toolbar"><button class="action primary" data-do="create">Deal cards</button><a class="action secondary" href="?online=1">Play with friends online</a></div></section>';
 const p=g.people[setupSeat],had=swapFrom!==null;
 return '<section class="setup panel"><div class="eyebrow">Before the first turn · '+playerName(setupSeat)+'</div><h2>Choose your face-up cards</h2>'+
 '<p>Tap a card in your hand, then a face-up card to swap them. Face-up cards become playable after your draw deck and hand are gone. Three blind cards stay hidden.</p>'+
 '<div class="area-label"><span>YOUR FACE-UP CARDS</span></div>'+rowCards(p.up,'up',true)+
 '<div class="area-label"><span>YOUR HAND</span><span>'+(had?'Now tap the card to exchange':'Tap any card to select')+'</span></div>'+
 rowCards(p.hand,'hand',true)+'<div class="toolbar"><button class="action primary" data-do="ready">'+
 (mode==='hotseat'&&setupSeat<seats-1?'Pass to next player':'Start the game')+'</button></div></section>';
}
function gameView(){const viewer=viewSeat(),p=getPlayer(),isHuman=mode==='hotseat'||viewer===0,turn=isTurn(),stage=currentStage();
 const selectable=turn&&g.phase==='play'&&!covered,slams=E.slamOptions(g,viewer),legal=E.options(g,viewer),pick=legal.some(o=>o.type==='take');
 const top=E.topRun(g),summary=g.phase==='over'?'Game over. '+playerName(g.loser)+' is the PILEHEAD.':
  turn?'Your turn · '+(stage==='down'?'Flip one blind card':stage==='up'?'Play from your face-up row':'Choose cards from your hand'):
  playerName(g.turn)+' is playing · watch for a SLAM!';
 return '<div class="pitch"><h1>'+summary+'</h1><p>52 custom cards · 40 numbers · 12 actions · '+g.people.length+' players</p></div>'+
 '<section class="table" aria-label="PILEHEAD physical table">'+opponents()+pile()+
 upAndDown(p,selectable)+
 '<div class="hand-area"><div class="area-label"><span>'+playerName(viewer)+' · HAND</span><span>'+p.hand.length+' cards</span></div>'+
 rowCards(p.hand,'hand',selectable&&stage==='hand')+'</div></section>'+
 '<div class="toolbar">'+(g.phase==='over'?'<button class="action primary" data-do="new">Play again</button>':
 '<button class="action primary" data-do="play" '+(!selection.length||!turn?'disabled':'')+'>Play selected</button>'+
 '<button class="action secondary" data-do="take" '+(!turn||!pick?'disabled':'')+'>Take pile</button>'+
 '<button class="action slam" data-do="slam" '+(!slams.length?'disabled':'')+'>SLAM!'+(slams.length&&top.rank!==null?' ×'+top.rank:'')+'</button>')+
 (mode==='hotseat'&&g.phase==='play'&&g.slamOpen?'<button class="action secondary" data-do="challenge">Other player SLAM</button>':'')+
 '</div><details class="playtest-tools"><summary>Playtest tools</summary><button class="action secondary" data-do="export">Export QA state</button></details>'+
 '<div class="message" role="status" aria-live="polite">'+(notice||'Tap matching numbers or identical special cards to play together. Drag onto the pile.')+'</div>'+
 '<div class="meta"><span>Moves <strong>'+g.moves+'</strong></span><span>Draw stock <strong>'+g.stock.length+'</strong></span>'+
 '<span>Burned <strong>'+g.ashes.length+'</strong></span><span>Pickups <strong>'+g.people.reduce((n,x)=>n+x.pickups,0)+'</strong></span></div>'+
 '<div class="event-list" aria-label="Recent moves">'+g.events.slice(-8).reverse().map(e=>'<span class="event">'+eventName(e)+'</span>').join('')+'</div>';
}
function overlay(){
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
 (!isSetup&&g.slamOpen?'<hr style="border-color:#66857565;margin:16px 0"><p>Out-of-turn SLAM? Choose the player attempting it:</p>'+
 g.people.filter(p=>!p.out).map(p=>'<button class="action secondary" data-do="hot-slam" data-seat="'+p.seat+'">'+playerName(p.seat)+'</button>').join(''):'')+
 '</div></div>';
}
function render(){
 app.innerHTML=(g&&g.phase!=='setup'?gameView():setupView())+overlay();
 window.PileheadTableFX?.sync({identity:g?g.seed+':'+g.moves:null,
  event:g?.events?.[g.events.length-1]||null,
  ownSeat:g?viewSeat():0,active:g?isTurn()&&!covered:false,
  selected:selection.length,moveNo:g?.moves||0,online:false});
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
function queueBot(){if(timer!==null){clearTimeout(timer);timer=null}
 if(!g||g.phase!=='play'||mode!=='bots')return;
 const canSlam=g.people.some(p=>p.seat!==0&&E.slamOptions(g,p.seat).length);
 if(g.turn===0&&!canSlam)return;
 timer=setTimeout(()=>{timer=null;if(!g||g.phase!=='play')return;
 try{let ev=E.autoSlam(g,'greedy',0);
  if(!ev&&g.turn!==0)ev=E.move(g,g.turn,E.choose(g,g.turn,['greedy','saver','random'][g.turn%3]));
  if(ev){lastMove=ev;notice=eventName(ev);selection=[];render()}
 }catch(e){notice='Bot error: '+e.message;render()}
 },canSlam?780:600);
}
function startGame(){g=E.create({players:seats,seed:Date.now()>>>0});setupSeat=0;selection=[];swapFrom=null;challengeOpen=false;covered=false;notice='';if(mode==='bots')for(let i=1;i<seats;i++)E.autoSetup(g,i);render()}
function afterMove(ev){lastMove=ev;selection=[];challengeOpen=false;notice=eventName(ev);
 if(mode==='hotseat'&&g.phase!=='over')covered=true;
 render()}
function perform(choice,seat=viewSeat()){try{const ev=E.move(g,seat,choice);afterMove(ev)}catch(e){notice=e.message;render()}}
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
 if(!E.isLegal(g,picked)){notice='Not playable with the current restriction';render();return}
 if(selection.includes(id))selection=selection.filter(x=>x!==id);
 else{const prior=selection.map(i=>arr.find(c=>c.id===i)).filter(Boolean);
  if(prior.length&&!prior.every(c=>c.kind===picked.kind&&
   (picked.kind==='number'?c.rank===picked.rank:c.action===picked.action)))selection=[];
  selection.push(id);
 }
 notice='';render();
}
function execute(action,button){
 if(action==='create'){seats=Number($('seat-count')?.value)||seats;mode=$('game-mode')?.value==='hotseat'?'hotseat':'bots';startGame();return}
 if(action==='new'){g=null;selection=[];swapFrom=null;covered=false;render();return}
 if(action==='ready'){
  selection=[];swapFrom=null;
  if(mode==='hotseat'&&setupSeat<seats-1){setupSeat++;covered=true}
  else{E.start(g);covered=mode==='hotseat'}
  render();return;
 }
 if(action==='reveal'){covered=false;render();return}
 if(action==='challenge'){challengeOpen=true;render();return}
 if(action==='cancel-challenge'){challengeOpen=false;render();return}
 if(action==='play'){
  if(!selection.length)return;
  perform({type:'play',source:currentStage(),ids:selection.slice()});return;
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
 if(e.target.closest('[data-play-target]')&&selection.length&&isTurn())perform({type:'play',source:currentStage(),ids:selection.slice()});
});
app.addEventListener('keydown',e=>{
 if(e.target.closest('[data-play-target]')&&(e.key==='Enter'||e.key===' ')&&selection.length&&isTurn()){
  e.preventDefault();perform({type:'play',source:currentStage(),ids:selection.slice()});
 }
});
let dragCard=null;
app.addEventListener('dragstart',e=>{
 const b=e.target.closest('[data-card]');if(!b||!isTurn()||covered||g.phase!=='play')return;
 dragCard={id:Number(b.dataset.card),source:b.dataset.source};
 if(!selection.includes(dragCard.id))selection=[dragCard.id];
 if(e.dataTransfer){e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain',String(dragCard.id))}
});
app.addEventListener('dragover',e=>{if(dragCard&&e.target.closest('[data-play-target]'))e.preventDefault()});
app.addEventListener('drop',e=>{
 if(!dragCard||!e.target.closest('[data-play-target]'))return;
 e.preventDefault();const move=dragCard;dragCard=null;
 if(isTurn()&&currentStage()===move.source)perform({type:'play',source:move.source,ids:selection.slice()});
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
  if(!selection.includes(d.id))selection=[d.id];
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
 if(target&&isTurn()&&currentStage()===d.source){
  if(!selection.includes(d.id))selection=[d.id];
  perform({type:'play',source:d.source,ids:selection.slice()})}
}
window.addEventListener('pointerup',endTouch);
window.addEventListener('pointercancel',e=>{const d=touchGesture;touchGesture=null;d?.el?.remove();app.querySelector('[data-play-target]')?.classList.remove('drop-hover')});


$('new').addEventListener('click',()=>{if(g&&!confirm('Start a new game and replace the current local save?'))return;g=null;notice='';selection=[];challengeOpen=false;covered=false;render()});
restore();render();
})();