'use strict';
const assert=require('node:assert/strict');
const http=require('node:http');
const {performance}=require('node:perf_hooks');
const {WebSocket}=require('ws');
const Poll=require('../scripts/realtime-poll-policy.cjs');
const {attachRealtime}=require('../scripts/realtime-hub.cjs');

function policy(){
 const p=Poll.createPoll(0);
 assert.equal(Poll.takeDue(p,0),true);
 assert.equal(Poll.takeDue(p,749),false);
 assert.equal(Poll.takeDue(p,750),true);
 assert.equal(Poll.hint(p,751),true);
 assert.equal(Poll.hint(p,752),false);
 assert.equal(Poll.takeDue(p,1499),false,'hints cannot exceed one query per fast interval');
 assert.equal(Poll.takeDue(p,1500),true);
 assert.equal(Poll.takeDue(p,32000),true);
 assert.equal(p.nextAt,34500,'idle rooms return to prior 2.5s polling');
 Poll.activity(p,32250);
 assert.equal(Poll.takeDue(p,32999),false);
 assert.equal(Poll.takeDue(p,33000),true);
 Poll.failed(p,33100);
 Poll.hint(p,34000);
 assert.equal(Poll.takeDue(p,35599),false,'hints cannot bypass database failure backoff');
 assert.equal(Poll.takeDue(p,35600),true);
 console.log('PASS adaptive cadence, idle cost bound, hint rate limit and failure backoff');
}
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function until(predicate,timeout=5000){
 const deadline=performance.now()+timeout;
 while(!predicate()){
  if(performance.now()>deadline)throw Error('timed out waiting for realtime evidence');
  await delay(15);
 }
}
async function instance(api){
 const server=http.createServer((_req,res)=>res.end());
 const hub=attachRealtime(server,api);
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 return {server,hub,host:'127.0.0.1:'+server.address().port};
}
function peer(instance,code,token){
 const ws=new WebSocket('ws://'+instance.host+'/api/pilehead/live',{origin:'http://'+instance.host});
 const packets=[];
 ws.on('error',()=>{});
 ws.on('message',bytes=>packets.push({packet:JSON.parse(bytes.toString()),at:performance.now()}));
 ws.on('open',()=>ws.send(JSON.stringify({type:'auth',code,token})));
 return {ws,packets};
}
async function run(){
 policy();
 const code='ABCDEFGH',tokens=['synthetic-host-token','synthetic-guest-token'];
 let revision=1,queryCount=0;
 const api={
  async realtimeAuth(room,token){
   assert.equal(room,code);
   const seat=tokens.indexOf(token);if(seat<0)throw Error('invalid');
   return {code,seat,revision,reactions:[]};
  },
  async realtimeSnapshots(codes){
   queryCount++;
   return codes.filter(c=>c===code).map(c=>({code:c,revision,expired:false,reactions:[]}));
  }
 };
 const instances=[],peers=[];
 try{
  // Different in-memory hubs; neither receives the other's local push.
  const a=await instance(api),b=await instance(api);instances.push(a,b);
  const x=peer(a,code,tokens[0]),y=peer(b,code,tokens[1]);peers.push(x,y);
  await until(()=>x.packets.some(p=>p.packet.type==='ready')&&y.packets.some(p=>p.packet.type==='ready'));
  await until(()=>queryCount>=2);
  const baseline=queryCount;
  x.ws.send(JSON.stringify({type:'sync-hint',revision:999999}));
  await until(()=>queryCount>baseline);
  assert.equal(x.packets.some(p=>p.packet.type==='invalidate'),false,'a hint cannot invent a revision');
  const started=performance.now();
  revision=2; // Simulates a commit in a third HTTP process.
  x.ws.send(JSON.stringify({type:'sync-hint'}));
  await until(()=>[x,y].every(p=>p.packets.some(m=>m.packet.type==='invalidate'&&m.packet.revision===2)));
  for(const p of [x,y]){
   const m=p.packets.find(m=>m.packet.type==='invalidate');
   assert.deepEqual(Object.keys(m.packet).sort(),['force','revision','type']);
   assert.equal(m.packet.revision,2);
  }
  const elapsed=Math.round(Math.max(...[x,y].map(p=>p.packets.find(m=>m.packet.type==='invalidate').at))-started);
  // Do not turn noisy CI wall-clock time into a production latency claim.
  console.log('Local synthetic cross-instance convergence (ms): '+elapsed);
  await delay(Poll.FAST_MS+Poll.TICK_MS+50);
  for(const p of [x,y])assert.equal(p.packets.filter(m=>m.packet.type==='invalidate'&&m.packet.revision===2).length,1);
  const bad=peer(b,code,'wrong');peers.push(bad);
  await until(()=>bad.ws.readyState===WebSocket.CLOSED);
  assert.equal(bad.packets.length,0,'unauthenticated socket sees no room packets');
  console.log('PASS cross-instance convergence, duplicate suppression, private-state exclusion and invalid hint isolation');
 }finally{
  for(const p of peers)p.ws.terminate();
  for(const i of instances){i.hub.shutdown();await new Promise(resolve=>i.server.close(resolve));}
 }
}
run().catch(e=>{console.error(e);process.exitCode=1});
