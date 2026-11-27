'use strict';
// STACK real-time transport. The game API remains authoritative: sockets carry
// room invalidations and bounded, seat-authenticated ephemeral reactions only.
const {WebSocketServer,WebSocket}=require('ws');
const Poll=require('./realtime-poll-policy.cjs');

function attachRealtime(server,api){
 const wss=new WebSocketServer({noServer:true,maxPayload:1024,perMessageDeflate:false});
 const rooms=new Map(),allPeers=new Set(),polls=new Map();
 const MAX_CONNECTIONS=200,MAX_ROOM_PEERS=20;
 function roomSet(code){
  if(!rooms.has(code)){rooms.set(code,new Set());polls.set(code,Poll.createPoll(Date.now()))}
  return rooms.get(code);
 }
 function send(ws,message){
  if(ws.readyState!==WebSocket.OPEN)return;
  if(ws.bufferedAmount>65536){ws.terminate();return}
  try{ws.send(JSON.stringify(message))}catch{ws.terminate()}
 }
 function pushReaction(code,reaction){
  const peers=rooms.get(code);if(!peers)return;
  let delivered=false;
  for(const peer of peers){
   if(peer.seen.has(reaction.id))continue;
   peer.seen.add(reaction.id);
   if(peer.seen.size>90)peer.seen=new Set([...peer.seen].slice(-50));
   send(peer.ws,{type:'reaction',reaction});delivered=true;
  }
  if(delivered&&polls.has(code))Poll.activity(polls.get(code),Date.now());
 }
 function pushRevision(code,revision,force=false){
  const peers=rooms.get(code);if(!peers||!Number.isInteger(revision))return;
  let delivered=false;
  for(const peer of peers){
   if(!force&&revision<=peer.revision)continue;
   peer.revision=Math.max(peer.revision,revision);
   send(peer.ws,{type:'invalidate',revision,force});delivered=true;
  }
  if(delivered&&polls.has(code))Poll.activity(polls.get(code),Date.now());
 }
 function rejectUpgrade(socket,status){
  if(socket.destroyed)return;
  socket.end('HTTP/1.1 '+status+'\r\nConnection: close\r\n\r\n');
 }
 server.on('upgrade',(req,socket,head)=>{
  let pathname;
  try{pathname=new URL(req.url,'http://localhost').pathname}catch{socket.destroy();return}
  if(pathname!=='/api/pilehead/live'){socket.destroy();return}
  const host=String(req.headers['x-forwarded-host']||req.headers.host||'').split(',')[0].trim();
  let origin;
  try{origin=new URL(req.headers.origin||'')}catch{return rejectUpgrade(socket,'403 Forbidden')}
  const trusted=String(process.env.STACK_WEB_ORIGIN||'').trim().replace(/[/]$/,'');
  if(!host||(origin.host!==host&&(!trusted||origin.origin!==trusted)))
   return rejectUpgrade(socket,'403 Forbidden');
  if(allPeers.size>=MAX_CONNECTIONS||wss.clients.size>=MAX_CONNECTIONS+25)
   return rejectUpgrade(socket,'429 Too Many Requests');
  wss.handleUpgrade(req,socket,head,ws=>wss.emit('connection',ws,req));
 });
 wss.on('connection',ws=>{
  let peer=null,pending=false,messageWindow=Date.now(),messageCount=0;
  // Health belongs to the socket. The pong listener must reset the exact
  // flag the keepalive scheduler checks, otherwise every socket dies in 50s.
  ws.isAlive=true;
  const timeout=setTimeout(()=>{if(!peer)ws.close(1008,'Authentication required')},6000);
  timeout.unref?.();
  allPeers.add(ws);
  ws.on('pong',()=>{ws.isAlive=true});
  ws.on('message',async bytes=>{
   const now=Date.now();
   if(now-messageWindow>=10000){messageWindow=now;messageCount=0}
   if(++messageCount>120){ws.close(1008,'Message rate exceeded');return}
   if(pending)return;
   let msg;
   try{msg=JSON.parse(bytes.toString('utf8'))}catch{ws.close(1003,'Invalid message');return}
   if(!msg||typeof msg!=='object'||Array.isArray(msg)){ws.close(1003,'Invalid message');return}
   if(!peer){
    if(msg.type!=='auth'||typeof msg.code!=='string'||typeof msg.token!=='string'){
     ws.close(1008,'Authentication required');return;
    }
    pending=true;
    try{
     const auth=await api.realtimeAuth(msg.code,msg.token);
     if(ws.readyState!==WebSocket.OPEN)return;
     const peers=roomSet(auth.code);
     if(peers.size>=MAX_ROOM_PEERS||[...peers].filter(p=>p.seat===auth.seat).length>=4){ws.close(1013,'Room connection limit');return}
     peer={ws,room:auth.code,seat:auth.seat,revision:auth.revision,
      seen:new Set((auth.reactions||[]).map(e=>e.id)),lastReactionAt:0};
     peers.add(peer);clearTimeout(timeout);
     Poll.activity(polls.get(auth.code),Date.now());
     send(ws,{type:'ready',revision:auth.revision});
    }catch{ws.close(1008,'Invalid room session')}
    finally{pending=false}
    return;
   }
   if(msg.type==='heartbeat'){send(ws,{type:'heartbeat'});return}
   // A client may hint that a committed HTTP command needs reconciliation.
   // Never trust a client-supplied revision or publish state from the hint.
   // A per-room budget applies even with several authenticated connections.
   if(msg.type==='sync-hint'){const poll=polls.get(peer.room);if(poll)Poll.hint(poll,Date.now());return}
   if(msg.type!=='react')return;
   if(Date.now()-peer.lastReactionAt<800){send(ws,{type:'reaction-error',reason:'slow_down'});return}
   peer.lastReactionAt=Date.now();
   pending=true;
   try{
    const reaction=await api.realtimeReact(peer.room,peer.seat,msg.kind);
    pushReaction(peer.room,reaction);
   }catch(e){send(ws,{type:'reaction-error',reason:e.code==='rate_limited'?'slow_down':'unavailable'})}
   finally{pending=false}
  });
  ws.on('close',()=>{
   clearTimeout(timeout);allPeers.delete(ws);
   if(peer){
    const peers=rooms.get(peer.room);peers?.delete(peer);
    if(!peers?.size){rooms.delete(peer.room);polls.delete(peer.room)}
   }
  });
  ws.on('error',()=>{});
 });
 // Cross-instance convergence using public room revisions, not private state.
 let checking=false;
 const reconcile=setInterval(async()=>{
  if(checking||!rooms.size)return;
  checking=true;
  try{
   const now=Date.now();
   const codes=[...polls].filter(([,p])=>Poll.takeDue(p,now)).map(([code])=>code),batches=[];
   for(let i=0;i<codes.length;i+=100)batches.push(codes.slice(i,i+100));
   await Promise.all(batches.map(async batch=>{
    try{
     const snapshots=await api.realtimeSnapshots(batch);
     const byCode=new Map(snapshots.map(s=>[s.code,s]));
     for(const code of batch){
      const snapshot=byCode.get(code);
      if(!snapshot||snapshot.expired){
       for(const peer of rooms.get(code)||[])peer.ws.close(1008,'Room unavailable');
       continue;
      }
      pushRevision(code,snapshot.revision);
      for(const reaction of snapshot.reactions)pushReaction(code,reaction);
     }
    }catch{
     // Keep sockets connected through transient Neon interruptions.
     for(const code of batch){const poll=polls.get(code);if(poll)Poll.failed(poll,Date.now())}
     console.warn(JSON.stringify({event:'stack_ws_reconcile_failed',rooms:batch.length}));
    }
   }));
  }finally{checking=false}
 },Poll.TICK_MS);
 reconcile.unref?.();
 // Production pings every 25 seconds. Test-only override makes a real
 // browser exercise three pong cycles in a short deterministic CI run.
 const testInterval=process.env.NODE_ENV==='test'?Number(process.env.STACK_TEST_WS_HEARTBEAT_MS):NaN;
 const heartbeatMs=Number.isInteger(testInterval)&&testInterval>=100&&testInterval<=1000?testInterval:25000;
 const keepalive=setInterval(()=>{
  for(const ws of allPeers){
   if(ws.readyState!==WebSocket.OPEN)continue;
   if(ws.isAlive===false){ws.terminate();continue}
   ws.isAlive=false;
   try{ws.ping()}catch{ws.terminate()}
  }
 },heartbeatMs);
 keepalive.unref?.();
 function shutdown(){
  clearInterval(reconcile);clearInterval(keepalive);
  for(const ws of allPeers)if(ws.readyState===WebSocket.OPEN)ws.close(1001,'Service restarting');
  wss.close();
 }
 return{pushRevision,pushReaction,shutdown,get connectedRooms(){return rooms.size}};
}
module.exports={attachRealtime};
