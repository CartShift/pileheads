/* STACK social layer: no game moves are ever sent through this socket. */
(function(root){'use strict';
const KINDS=Object.freeze({
 fire:{glyph:'🔥',label:'Fire'},
 wow:{glyph:'😮',label:'Wow'},
 laugh:{glyph:'😂',label:'Laugh'},
 ouch:{glyph:'😬',label:'Ouch'},
 gg:{glyph:'👏',label:'Good game'}
});
let socket=null,room='',token='',refresh=null,getRevision=null,retryTimer=null;
let retries=0,ready=false,stopped=false,data=null,seeded=false;
const seen=new Set();
const $=q=>document.querySelector(q);
function buttonMarkup(){
 return '<div class="stack-live-social" role="group" aria-label="React to the round">'+
  '<div class="stack-reaction-buttons">'+Object.entries(KINDS).map(([kind,v])=>
  '<button type="button" data-do="react" data-kind="'+kind+'" aria-label="React: '+v.label+'" title="'+v.label+'">'+v.glyph+'</button>').join('')+'</div>'+
  '<span class="stack-live-status" role="status" data-live-status>Connecting…</span></div>';
}
function updateStatus(){
 const indicator=$('[data-live-status]');
 if(indicator){
  indicator.textContent=ready?'Live table':'Auto-sync';
  indicator.classList.toggle('is-live',ready);
  indicator.title=ready?'Updates arrive through the live connection':'The game still syncs automatically';
 }
}
function showReaction(reaction){
 if(!reaction||!KINDS[reaction.kind]||typeof reaction.id!=='string'||seen.has(reaction.id))return;
 seen.add(reaction.id);
 if(seen.size>100)for(const id of [...seen].slice(0,50))seen.delete(id);
 if(!data||!Array.isArray(data.members))return;
 const own=Number(reaction.seat)===Number(data.me);
 const seat=Number(reaction.seat);
 const who=own?'You':data.members.find(m=>m.seat===seat)?.name||'A player';
 const target=own?$('.table .hand-area'):$('.table .opponent[data-seat="'+seat+'"]');
 const anchor=target||$('.table');
 if(!anchor)return;
 const element=document.createElement('div');
 element.className='stack-reaction-bubble';
 element.setAttribute('role','status');
 const name=document.createElement('span');name.textContent=who;
 const icon=document.createElement('span');icon.textContent=KINDS[reaction.kind].glyph;
 element.append(name,icon);anchor.appendChild(element);
 setTimeout(()=>element.remove(),2400);
}
function sync(state){
 if(!state)return;
 const first=!seeded||room!==state.code;
 data=state;
 if(first){
  for(const r of state.game?.reactions||[])seen.add(r.id);
  seeded=true;
 }else{
  for(const r of state.game?.reactions||[])
   if(Number.isFinite(r.at)&&Date.now()-r.at<4500)showReaction(r);
 }
 updateStatus();
}
function closeSocket(){
 if(socket){
  const old=socket;socket=null;old.onclose=null;old.onmessage=null;old.onerror=null;
  try{old.close(1000,'Leaving table')}catch{}
 }
 ready=false;updateStatus();
}
function clearRetry(){if(retryTimer){clearTimeout(retryTimer);retryTimer=null}}
function connect({code,session,onInvalidate,revision}={}){
 if(!code||!session||typeof WebSocket!=='function')return;
 if(room!==code||token!==session){
  closeSocket();clearRetry();seeded=false;seen.clear();retries=0;
 }
 room=code;token=session;refresh=onInvalidate;getRevision=revision;stopped=false;
 if(document.visibilityState==='hidden'||socket||retryTimer)return;
 const scheme=location.protocol==='https:'?'wss:':'ws:';
 let ws;
 try{ws=new WebSocket(scheme+'//'+location.host+'/api/pilehead/live')}
 catch{return retry()}
 socket=ws;
 ws.onopen=()=>{if(socket===ws)ws.send(JSON.stringify({type:'auth',code:room,token}))};
 ws.onmessage=e=>{
  if(socket!==ws)return;
  let packet;try{packet=JSON.parse(e.data)}catch{return}
  if(packet.type==='ready'){
   ready=true;retries=0;updateStatus();
   if(Number.isInteger(packet.revision)&&packet.revision>(getRevision?.()??-1))refresh?.({revision:packet.revision});
  }else if(packet.type==='invalidate'){
   if(packet.force||Number(packet.revision)>(getRevision?.()??-1))refresh?.(packet);
  }else if(packet.type==='reaction')showReaction(packet.reaction);
  else if(packet.type==='reaction-error'){
   const status=$('[data-live-status]');if(status)status.textContent=packet.reason==='slow_down'?'Slow reactions down':'Reaction unavailable';
  }
 };
 ws.onerror=()=>{};
 ws.onclose=e=>{
  if(socket!==ws)return;
  socket=null;ready=false;updateStatus();
  // Invalid credentials do not cause an endless reconnect/auth attempt.
  if(e.code===1008){stopped=true;return}
  if(!stopped&&document.visibilityState!=='hidden')retry();
 };
}
function retry(){
 if(retryTimer||stopped||document.visibilityState==='hidden'||!room||!token)return;
 const delay=Math.min(20000,750*Math.pow(2,Math.min(retries++,5)))+Math.floor(Math.random()*250);
 retryTimer=setTimeout(()=>{
  retryTimer=null;
  connect({code:room,session:token,onInvalidate:refresh,revision:getRevision});
 },delay);
}
function react(kind,fallback){
 if(!KINDS[kind])return;
 if(ready&&socket?.readyState===WebSocket.OPEN){
  try{socket.send(JSON.stringify({type:'react',kind}));return}catch{}
 }
 return fallback?.(kind);
}
function isLive(){return ready}
document.addEventListener('visibilitychange',()=>{
 if(document.visibilityState==='hidden'){
  closeSocket();clearRetry();
 }else if(room&&token&&!stopped){
  connect({code:room,session:token,onInvalidate:refresh,revision:getRevision});
 }
});
window.addEventListener('pagehide',()=>{stopped=true;closeSocket();clearRetry()});
root.StackLive={buttonMarkup,sync,connect,react,isLive,showReaction};
})(window);
