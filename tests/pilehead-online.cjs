'use strict';
const assert=require('node:assert/strict');
const Module=require('node:module');
const Engine=require('../dist/pilehead/engine.js');
const rooms=new Map(),members=new Map(),buckets=new Map();
function conflict(){const e=Error('unique key');e.code='23505';throw e}
async function query(sql,args=[]){
 if(sql.startsWith('INSERT INTO pilehead_rate_limits')){const n=(buckets.get(args[0])||0)+1;buckets.set(args[0],n);return [{hits:n}]}
 if(sql.startsWith('INSERT INTO pilehead_rooms')){if(rooms.has(args[0]))conflict();
  const r={code:args[0],capacity:args[1],status:'lobby',state:JSON.parse(args[2]),revision:0,expires_at:new Date(Date.now()+86400000)};
  rooms.set(r.code,r);return []}
 if(sql.startsWith('INSERT INTO pilehead_members')&&sql.includes('SELECT')){
  const [code,name,token,capacity]=args;const current=members.get(code)||[];
  const seat=Array.from({length:capacity},(_,i)=>i).find(i=>!current.some(m=>m.seat===i));
  if(seat===undefined)return [];current.push({seat,display_name:name,token_hash:token});members.set(code,current);
  return [{seat}]
 }
 if(sql.startsWith('INSERT INTO pilehead_members')){const [code,name,token]=args,seat=0;const current=members.get(code)||[];
  if(current.some(x=>x.seat===seat))conflict();current.push({seat,display_name:name,token_hash:token});members.set(code,current);return []}
 if(sql.startsWith('SELECT code,capacity'))return rooms.has(args[0])?[structuredClone(rooms.get(args[0]))]:[];
 if(sql.startsWith('SELECT seat,display_name'))return (members.get(args[0])||[]).map(m=>({seat:m.seat,display_name:m.display_name}));
 if(sql.startsWith('SELECT seat FROM pilehead_members')&&sql.includes('token_hash'))return (members.get(args[0])||[]).filter(x=>x.token_hash===args[1]).map(m=>({seat:m.seat}));
 if(sql.startsWith('SELECT seat FROM pilehead_members'))return (members.get(args[0])||[]).map(m=>({seat:m.seat}));
 if(sql.startsWith('UPDATE pilehead_rooms')){const [state,status,code,rev]=args,r=rooms.get(code);
  if(!r||r.revision!==rev)return [];
  r.state=JSON.parse(state);r.status=status;r.revision++;return [structuredClone(r)]}
 throw Error('Unknown test SQL: '+sql.slice(0,85));
}
const original=Module._load;Module._load=function(spec,...args){
 if(spec==='@neondatabase/serverless')return {neon:()=>({query})};
 return original.call(this,spec,...args);
};
const oldEnv=process.env.PILEHEAD_DATABASE_URL;
process.env.PILEHEAD_DATABASE_URL='postgresql://mock:password@neon.invalid/playtest';
const handler=require('../api/pilehead.js');
async function request(body,session,headers={}){
 const req={method:'POST',headers:{host:'example.com',origin:'https://example.com','content-type':'application/json',
  ...(session?{authorization:'Bearer '+session}:{}),...headers},body,socket:{remoteAddress:'127.0.0.1'}};
 const res={statusCode:200,status(n){this.statusCode=n;return this},setHeader(){return this},json(v){return {status:this.statusCode,data:v}}};
 return handler(req,res);
}
async function run(){
 let checks=0;
 const host=await request({action:'create',capacity:2,name:'Host'});
 assert.equal(host.status,201);const {code,session:hostToken}=host.data;assert.match(code,/^[A-HJ-NP-Z2-9]{8}$/);
 assert.equal(host.data.me,0);assert.equal(host.data.game.phase,'setup');checks++;
 const unauth=await request({action:'state',code});assert.equal(unauth.status,401);checks++;
 const early=await request({action:'start',code,revision:0},hostToken);
 assert.equal(early.status,409,JSON.stringify(early));checks++;
 const guest=await request({action:'join',code,name:'Guest'});
 assert.equal(guest.status,201);assert.equal(guest.data.me,1);checks++;
 const guestToken=guest.data.session;
 const state=await request({action:'state',code},guestToken);
 assert.equal(state.status,200);
 assert.equal(state.data.game.players[0].hand,undefined);
 assert.equal(state.data.game.players[0].blindSlots,undefined);
 assert.equal(state.data.game.players[1].hand.length,3);
 assert.equal(state.data.game.players[1].blindSlots.length,3);
 assert.equal(state.data.game.seed,undefined);assert.equal(state.data.game.stock,undefined);checks++;
 const cross=await request({action:'state',code:'ABCDEFGH'},guestToken);
 assert.equal(cross.status,404);checks++;
 const startGuest=await request({action:'start',code,revision:0},guestToken);assert.equal(startGuest.status,403);checks++;
 const start=await request({action:'start',code,revision:0},hostToken);
 assert.equal(start.status,200);assert.equal(start.data.game.phase,'play');checks++;
 const wrong=await request({action:'move',code,revision:1,move:{type:'take'}},guestToken);
 assert.equal(wrong.status,400);checks++;
 const illegal=await request({action:'move',code,revision:1,move:{type:'play',source:'hand',ids:[999]}},hostToken);
 assert.equal(illegal.status,400);checks++;
 const current=await request({action:'state',code},hostToken);
 const legal=current.data.game.legal[0];assert.ok(legal);
 const move=await request({action:'move',code,revision:current.data.revision,move:legal},hostToken);
 assert.equal(move.status,200);assert.equal(move.data.revision,2);checks++;
 const stale=await request({action:'move',code,revision:1,move:legal},hostToken);
 assert.equal(stale.status,409);checks++;
 const other=await request({action:'create',capacity:2,name:'Other'});
 const forbidden=await request({action:'state',code:other.data.code},hostToken);
 assert.equal(forbidden.status,403);checks++;
 const game=rooms.get(code).state;assert.equal(Engine.invariant(game),true);checks++;
 console.log('PASS PILEHEAD online authoritative API: '+checks+' assertions (privacy, auth, turns, CAS, room isolation)');
}
run().catch(e=>{console.error(e);process.exitCode=1}).finally(()=>{
 Module._load=original;if(oldEnv===undefined)delete process.env.PILEHEAD_DATABASE_URL;else process.env.PILEHEAD_DATABASE_URL=oldEnv;
});
