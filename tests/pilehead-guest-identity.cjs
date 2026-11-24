'use strict';
const assert=require('node:assert/strict');
const {Readable}=require('node:stream');
const {createHandler,createStore,cookieToken,validAction,hash,limiter,COOKIE}=require('../api/player.cjs');
const origin='https://stack.test';
const expiry='2027-02-22T00:00:00Z';
const records=new Map();
let creates=0;
const store={
 find:async key=>records.get(key)||null,
 create:async (id,key)=>{creates++;assert.match(id,/^[a-f0-9-]{36}$/);assert.match(key,/^[a-f0-9]{64}$/);const row={preferred_deck:'characters',expires_at:expiry};records.set(key,row);return row;},
 preferences:async (key,deck)=>{const row=records.get(key);if(!row)return null;row.preferred_deck=deck;return row;},
 remove:async key=>records.delete(key)
};
const handler=createHandler({enabled:true,origin,store,allowRead:()=>true,allowWrite:()=>true,allowCreate:()=>true});
async function call(h=handler,{method='GET',body={},cookie,headers={}}={}){
 const req=Readable.from([Buffer.from(JSON.stringify(body))]);req.method=method;req.headers={origin,'content-type':'application/json',cookie,...headers};
 const res={headers:{},setHeader(k,v){this.headers[k]=v;},end(v){this.body=JSON.parse(v);}};await h(req,res);return res;
}
(async()=>{
 const empty=await call();assert.deepEqual(empty.body,{enabled:true,profile:null});assert.equal(creates,0);assert.equal(empty.headers['Set-Cookie'],undefined);
 const a=await call(handler,{method:'POST',body:{action:'create'}});assert.equal(a.statusCode,201);
 const header=a.headers['Set-Cookie'];assert.match(header,/HttpOnly; Secure; SameSite=Strict/);assert.match(header,/Path=\/;/);assert.doesNotMatch(header,/Domain=/);
 const cookie=header.split(';')[0],token=cookieToken(cookie);assert.ok(token);assert.ok(records.has(hash(token)));assert.equal(records.has(token),false);assert.equal(JSON.stringify(a.body).includes(token),false);
 assert.deepEqual((await call(handler,{cookie})).body.profile,{kind:'guest',deck:'characters',expiresAt:expiry});
 assert.equal((await call(handler,{method:'POST',cookie,body:{action:'create'}})).statusCode,200);assert.equal(creates,1);
 assert.equal((await call(handler,{method:'POST',cookie,body:{action:'preferences',deck:'original'}})).body.profile.deck,'original');
 const b=await call(handler,{method:'POST',body:{action:'create'}});const other=b.headers['Set-Cookie'].split(';')[0];assert.notEqual(other,cookie);assert.equal((await call(handler,{cookie:other})).body.profile.deck,'characters');
 assert.equal((await call(handler,{method:'POST',body:{action:'preferences',deck:'original'}})).statusCode,401);
 assert.equal((await call(handler,{method:'POST',cookie,body:{action:'preferences',deck:'original',id:'other'}})).statusCode,400);
 assert.equal((await call(handler,{method:'POST',cookie,body:{action:'delete'},headers:{origin:'https://elsewhere.test'}})).statusCode,403);
 assert.equal((await call(handler,{method:'POST',body:{action:'create'},headers:{'content-type':'text/plain'}})).statusCode,415);
 assert.equal((await call(handler,{method:'POST',body:{action:'create',extra:'x'.repeat(600)}})).statusCode,413);
 assert.equal((await call(handler,{method:'POST',body:{action:'delete'},headers:{'sec-fetch-site':'cross-site'}})).statusCode,403);
 assert.equal((await call(handler,{method:'PUT'})).statusCode,405);
 assert.equal((await call(handler,{method:'POST',cookie,body:{action:'delete'}})).headers['Set-Cookie'].includes('Max-Age=0'),true);
 assert.equal((await call(handler,{cookie})).body.profile,null);assert.equal((await call(handler,{cookie:other})).body.profile.deck,'characters');
 assert.equal(cookieToken(cookie+'; '+cookie),null);assert.equal(cookieToken(COOKIE+'=bad'),null);assert.equal(validAction({action:'preferences',deck:'premium'}),false);
 assert.equal((await call(createHandler({enabled:false,origin,store}))).body.enabled,false);
 assert.equal((await call(createHandler({enabled:true,origin,store:{find:async()=>{throw Error('offline');}}}),{cookie:other})).statusCode,503);
 assert.equal((await call(createHandler({enabled:true,origin,store,allowCreate:()=>false}),{method:'POST',body:{action:'create'}})).statusCode,429);
 const queries=[];const db=createStore(async(sql,args)=>{queries.push({sql,args});return [];});await db.find('digest');await db.preferences('digest','original');await db.remove('digest');
 assert.match(queries[0].sql,/expires_at>now\(\)/);assert.deepEqual(queries[1].args,['digest','original']);assert.deepEqual(queries[2].args,['digest']);
 let now=0;const limit=limiter(1,()=>now);assert.equal(limit(),true);assert.equal(limit(),false);now=60000;assert.equal(limit(),true);
 console.log('Guest identity contract checks passed');
})().catch(e=>{console.error(e);process.exitCode=1;});
