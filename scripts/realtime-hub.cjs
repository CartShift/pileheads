'use strict';
// STACK real-time transport. The game API remains authoritative: sockets carry
// room invalidations and bounded, seat-authenticated ephemeral reactions only.
const {WebSocketServer,WebSocket}=require('ws');

function attachRealtime(server,api){
 const wss=new WebSocketServer({noServer:true,maxPayload:1024,perMessageDeflate:false});
 const rooms=new Map(),allPeers=new Set();
 const MAX_CONNECTIONS=200,MAX_ROOM_PEERS=20;
 function roomSet(code){
  if(!rooms.has(code))rooms.set(code,new Set());
  return rooms.get(code);
 }
 function send(ws,message){
  if(ws.readyState!==WebSocket.OPEN)return;
  if(ws.bufferedAmount>65536){ws.terminate();return}
  try{ws.send(JSON.stringify(message))}catch{ws.terminate()}
 }
 function pushReaction(code,reaction){
  const peers=rooms.get(code);if(!peers)return;
  for(const peer of peers){
   if(peer.seen.has(reaction.id))continue;
   peer.seen.add(reaction.id);
   if(peer.seen.size>90)peer.seen=new Set([...peer.seen].slice(-50));
   send(peer.ws,{type:'reaction',reaction});
  }
 }
 function pushRevision(code,revision){
  const peers=rooms.get(code);if(!peers||!Number.isInteger(revision))return;
  for(const peer of peers){
   if(revision<=peer.revision)continue;
   peer.revision=revision;
   send(peer.ws,{type:'invalidate',revision});
  }
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
  try{origin=new URL(req.headers.origin||'').host}catch{return rejectUpgrade(socket,'403 Forbidden')}
  if(!host||origin!==host)return rejectUpgrade(socket,'403 Forbidden');
  if(allPeers.size>=MAX_CONNECTIONS||wss.clients.size>=MAX_CONNECTIONS+25)
   return rejectUpgrade(socket,'429 Too Many Requests');
  wss.handleUpgrade(req,socket,head,ws=>wss.emit('connection',ws,req));
 });
 wss.on('connection',ws=>{
  let peer=null,pending=false,alive=true;
  const timeout=setTimeout(()=>{if(!peer)ws.close(1008,'Authentication required')},6000);
  timeout.unref?.();
  allPeers.add(ws);
  ws.on('pong',()=>{alive=true});
  ws.on('message',async bytes=>{
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
     if(peers.size>=MAX_ROOM_PEERS){ws.close(1013,'Room connection limit');return}
     peer={ws,room:auth.code,seat:auth.seat,revision:auth.revision,
      seen:new Set((auth.reactions||[]).map(e=>e.id))};
     peers.add(peer);clearTimeout(timeout);
     send(ws,{type:'ready',revision:auth.revision});
    }catch{ws.close(1008,'Invalid room session')}
    finally{pending=false}
    return;
   }
   if(msg.type==='heartbeat'){send(ws,{type:'heartbeat'});return}
   if(msg.type!=='react')return;
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
    if(!peers?.size)rooms.delete(peer.room);
   }
  });
  ws.on('error',()=>{});
 });
 // Cross-instance convergence: one light shared-DB query per room, not per
 // player. In-process broadcasts are immediate; another Render instance
 // catches up on the next reconciliation tick. No new tables or schema.
 let checking=false;
 const reconcile=setInterval(async()=>{
  if(checking||!rooms.size)return;
  checking=true;
  try{
   await Promise.all([...rooms.keys()].map(async code=>{
    try{
     const snapshot=await api.realtimeSnapshot(code);
     pushRevision(code,snapshot.revision);
     for(const reaction of snapshot.reactions||[])pushReaction(code,reaction);
    }catch(e){
     if(e.code==='room_expired'||e.code==='room_not_found'){
      for(const peer of rooms.get(code)||[])peer.ws.close(1008,'Room unavailable');
     }
    }
   }));
  }finally{checking=false}
 },1200);
 reconcile.unref?.();
 const keepalive=setInterval(()=>{
  for(const ws of allPeers){
   if(ws.readyState!==WebSocket.OPEN)continue;
   if(ws.isAlive===false){ws.terminate();continue}
   ws.isAlive=false;
   try{ws.ping()}catch{ws.terminate()}
  }
 },25000);
 keepalive.unref?.();
 function shutdown(){
  clearInterval(reconcile);clearInterval(keepalive);
  for(const ws of allPeers)if(ws.readyState===WebSocket.OPEN)ws.close(1001,'Service restarting');
  wss.close();
 }
 return{pushRevision,pushReaction,shutdown,get connectedRooms(){return rooms.size}};
}
module.exports={attachRealtime};
