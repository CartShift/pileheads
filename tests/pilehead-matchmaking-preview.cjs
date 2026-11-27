'use strict';
const assert=require('node:assert/strict'),{Readable}=require('node:stream'),M=require('../scripts/matchmaking-api.cjs');
const id='4c0c6815-e56b-4e6f-a6e3-000000000001',offer='5c0c6815-e56b-4e6f-a6e3-000000000001',raw='a'.repeat(43),origin='https://preview.pileheads.test';
const e={PILEHEAD_MATCHMAKING_PREVIEW_ENABLED:'1',PILEHEAD_MATCHMAKING_SCHEMA_READY:'1',PILEHEAD_HISTORY_SHARED_DATABASE_READY:'1',PILEHEAD_ACCOUNT_SCHEMA_READY:'1',PILEHEAD_PLAYER_SCHEMA_READY:'1',PILEHEAD_ACCOUNT_ENABLED:'1',PILEHEAD_DATABASE_URL:'test',PILEHEAD_PLAYER_DATABASE_URL:'test',PILEHEAD_MATCHMAKING_PREVIEW_ORIGIN:origin,PILEHEAD_PLAYER_ORIGIN:origin,PILEHEAD_MATCHMAKING_PREVIEW_ACCOUNTS:id,PILEHEAD_MATCHMAKING_SEAT_KEYS:JSON.stringify({v1:'a'.repeat(43)}),PILEHEAD_MATCHMAKING_SEAT_KEY_VERSION:'v1'};
assert.equal(M.config({}).enabled,false);assert.equal(M.config(e).enabled,true);assert.equal(M.config({...e,VERCEL_ENV:'production'}).enabled,false);
assert.equal(M.config({...e,PILEHEAD_MATCHMAKING_PREVIEW_ORIGIN:'https://pileheads.com',PILEHEAD_PLAYER_ORIGIN:'https://pileheads.com'}).enabled,false);
assert.equal(M.config({...e,PILEHEAD_MATCHMAKING_PREVIEW_ACCOUNTS:''}).enabled,false);
for(const action of ['claim','assign','set-rating'])assert.equal(M.valid({action}),false);
assert.equal(M.valid({action:'join',accountId:id}),false);assert.equal(M.valid({action:'cancel',ticket:offer,offer}),false);
const calls=[];let allowed=true;
const service={authorize:async token=>token===raw&&allowed?id:null,quota:async()=>true,status:async()=>({state:'idle'}),tick:async()=>{calls.push('tick');return {state:'waiting'}},join:async()=>{calls.push('join');return {state:'waiting'}},accept:async(_,x)=>{calls.push(x);return {state:'assigned'}},cancel:async()=>({state:'idle'}),release:async()=>({state:'idle'}),recover:async()=>({code:'ASSIGN01',seat:0,session:'b'.repeat(43)})};
async function call(handler,{method='POST',input={action:'status'},cookie='__Host-pileheads_account='+raw,headers={}}={}){
 const req=Readable.from([JSON.stringify(input)]);Object.assign(req,{method,headers:{origin,'content-type':'application/json',cookie,...headers},body:input});
 const res={headers:{},setHeader(k,v){this.headers[k]=v},end(v){this.body=JSON.parse(v)}};await handler(req,res);return res;
}
(async()=>{
 const off=await call(M.createHandler({enabled:false},null),{method:'GET'});assert.deepEqual(off.body,{available:false});
 const h=M.createHandler(M.config(e),service);
 const read=await call(h,{method:'GET'});assert.equal(read.body.status.state,'idle');assert.match(read.headers['Cache-Control'],/no-store/);assert.deepEqual(calls,[]);
 assert.equal((await call(h,{headers:{origin:'https://bad.test'}})).statusCode,403);
 assert.equal((await call(h,{cookie:'invalid'})).statusCode,401);
 assert.equal((await call(h,{input:{action:'assign',offer}})).statusCode,400);
 await call(h,{input:{action:'join'}});await call(h,{input:{action:'accept',offer}});assert.deepEqual(calls,['join',offer]);
 assert.equal((await call(h,{input:{action:'recover'}})).body.seat.seat,0);
 allowed=false;assert.equal((await call(h,{input:{action:'recover'}})).statusCode,401);
 console.log('PASS Quick Play preview API: production hard-off, allowlist, origin, private recovery, no direct worker command');
})().catch(e=>{console.error(e);process.exitCode=1});
