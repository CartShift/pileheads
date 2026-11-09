import {localDB} from '../scripts/local-db.mjs';import assert from 'node:assert/strict';import fs from 'node:fs';import Engine from '../dist/engine-v5.js';import {roomService} from '../worker/rooms.mjs';
const env=localDB();env.raw.exec(fs.readFileSync('drizzle/0000_spark_rooms.sql','utf8').replaceAll('--> statement-breakpoint',''));const db=env.raw;
const api=roomService(Engine),origin='https://spark.test';
async function call(user,path='',body,expected=200){const res=await api(new Request(origin+'/api/rooms'+path,{method:body===undefined?'GET':'POST',headers:{...(user?{'oai-authenticated-user-id':user}:{}),...(body!==undefined?{'Content-Type':'application/json',Origin:origin}:{})},body:body===undefined?undefined:JSON.stringify(body)}),env);const j=await res.json();assert.equal(res.status,expected,JSON.stringify(j));return j}
await call(null,'/00000000-0000-0000-0000-000000000000',undefined,401);
// D is opt-in only: existing A/B/C remain unchanged.
for(const mode of ['A','B','C','D'])for(const capacity of [2,3]){
 let r=await call('host','',{mode,capacity,name:'Host'},201);const id=r.id,token=r.inviteToken,path='/'+id;
 await call('stranger',path,undefined,403);await call('guest',path+'/join',{token:'bad',name:'Guest'},403);
 const guest=await call('guest',path+'/join',{token,name:'Guest'});assert.equal(guest.me,1);assert(!JSON.stringify(guest).includes(token));
 if(capacity===3)await call('third',path+'/join',{token,name:'Third'});
 await call('extra',path+'/join',{token,name:'Extra'},409);
 r=await call('host',path);await call('guest',path+'/start',{revision:r.revision,requestId:crypto.randomUUID()},403);
 r=await call('host',path+'/start',{revision:r.revision,requestId:crypto.randomUUID()});
 for(let turn=0;turn<8*capacity;turn++){
  const player=['host','guest','third'][r.turn],v=await call(player,path);assert.equal(v.members.filter(p=>p.hand).length,1);assert(!('deck' in v));assert(!('seed' in v));assert(!JSON.stringify(v).includes('host_id'));
  const raw=JSON.parse(db.prepare('SELECT state FROM spark_rooms WHERE id=?').get(id).state),g=raw.game;
  let move=Engine.choose(g,r.turn,'greedy');if(turn<capacity)move={kind:'hand',index:0,color:g.players[r.turn].hand[0],pos:mode==='D'?g.rowSize-1:g.rowSize,swapPos:0};else if(turn<capacity*2)move={kind:'wild',color:'P',pos:0};
  const req={revision:v.revision,requestId:crypto.randomUUID(),move};
  await call(['host','guest','third'][(r.turn+1)%capacity],path+'/move',req,409);
  r=await call(player,path+'/move',req);const rev=r.revision;const retry=await call(player,path+'/move',req);assert.equal(retry.revision,rev,'retry does not score or draw twice');
  assert.equal(r.board.length,mode==='A'?8:9);assert.equal(r.members[r.me].hand.length,3);
  const total=r.events.reduce((n,e)=>n+e.score,0);assert.equal(r.members.reduce((n,p)=>n+p.points,0),total);
 }
 assert.equal(r.status,'finished');assert.equal(r.events.length,8*capacity);
 await call('host',path+'/move',{revision:r.revision,requestId:crypto.randomUUID(),move:{kind:'wild',color:'B',pos:0}},409);
 const reconnect=await call('guest',path);assert.equal(reconnect.status,'finished');assert.equal(reconnect.me,1);
}
// Optimistic revision prevents two clients accepting the same turn concurrently.
let room=await call('racer','',{mode:'B',capacity:2,name:'Host'},201);const p='/'+room.id;
await call('racer-guest',p+'/join',{token:room.inviteToken,name:'Guest'});room=await call('racer',p);room=await call('racer',p+'/start',{revision:room.revision,requestId:crypto.randomUUID()});
const req={revision:room.revision,move:{kind:'hand',index:0,color:room.members[0].hand[0],pos:9}};
const result=await Promise.all([1,2].map(()=>api(new Request(origin+'/api/rooms'+p+'/move',{method:'POST',headers:{'oai-authenticated-user-id':'racer','Content-Type':'application/json',Origin:origin},body:JSON.stringify({...req,requestId:crypto.randomUUID()})}),env)));assert.deepEqual(result.map(r=>r.status).sort(),[200,409]);
let response=await api(new Request(origin+'/api/rooms',{method:'POST',headers:{'oai-authenticated-user-id':'x','Content-Type':'application/json',Origin:'https://evil.test'},body:'{}'}),env);assert.equal(response.status,403);
db.prepare('UPDATE spark_rooms SET expires_at=0 WHERE id=?').run(room.id);await call('racer',p,undefined,410);
console.log('Six complete authoritative human-room games passed: all modes, 2/3 players, private hands, abilities, scores, idempotency, concurrency, rejoin, origin and expiry.');
