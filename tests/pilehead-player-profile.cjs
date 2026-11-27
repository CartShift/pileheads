'use strict';
const assert=require('node:assert/strict');
const {Readable}=require('node:stream');
const {createHandler,createStore,cookieToken,validAction,normalizeName,hash,configuration}=require('../api/player.js');
const origin='https://pileheads.test',privacyUrl=origin+'/privacy',expiry='2027-02-22T00:00:00Z';
const records=new Map();
let creates=0;
const store={
 find:async k=>records.get(k)||null,
 create:async(id,k)=>{creates++;assert.match(id,/^[a-f0-9-]{36}$/);assert.match(k,/^[a-f0-9]{64}$/);const row={preferred_deck:'refined',display_name:'Player',expires_at:expiry};records.set(k,row);return row;},
 preferences:async(k,deck,name)=>{const row=records.get(k);if(!row)return null;row.preferred_deck=deck;row.display_name=name;return row;},
 remove:async k=>records.delete(k)
};
const options={configured:true,enabled:true,origin,privacyUrl,store,allowRead:()=>true,allowWrite:()=>true,allowCreate:()=>true};
const handler=createHandler(options);
async function call(h=handler,{method='GET',body={},cookie,headers={},parsed=false,raw=false}={}){
 const req=Readable.from([Buffer.from(JSON.stringify(body))]);req.method=method;req.headers={origin,'content-type':'application/json',cookie,...headers};
 if(parsed)req.body=body;if(raw)req.body=JSON.stringify(body);
 const res={headers:{},setHeader(k,v){this.headers[k]=v;},end(v){this.body=JSON.parse(v);}};
 await h(req,res);return res;
}
(async()=>{
 const empty=await call();assert.equal(empty.body.profile,null);assert.equal(creates,0);assert.equal(empty.headers['Set-Cookie'],undefined);
 const a=await call(handler,{method:'POST',body:{action:'create'},parsed:true});assert.equal(a.statusCode,201);assert.equal(a.body.privacyUrl,privacyUrl);
 const header=a.headers['Set-Cookie'];assert.match(header,/HttpOnly; Secure; SameSite=Strict/);assert.doesNotMatch(header,/Domain=/);
 const cookie=header.split(';')[0],token=cookieToken(cookie);assert.ok(token);assert.ok(records.has(hash(token)));assert.equal(records.has(token),false);
 assert.equal(JSON.stringify(a.body).includes(token),false);
 assert.deepEqual((await call(handler,{cookie})).body.profile,{kind:'guest',deck:'refined',name:'Player',expiresAt:expiry});
 assert.equal((await call(handler,{method:'POST',cookie,body:{action:'create'}})).statusCode,200);assert.equal(creates,1);
 const update={action:'preferences',name:'  Alice  ',deck:'original'};
 const changed=await call(handler,{method:'POST',cookie,body:update,raw:true});assert.equal(changed.body.privacyUrl,privacyUrl);assert.deepEqual(changed.body.profile,{kind:'guest',deck:'original',name:'Alice',expiresAt:expiry});
 const b=await call(handler,{method:'POST',body:{action:'create'}});const other=b.headers['Set-Cookie'].split(';')[0];assert.notEqual(other,cookie);assert.equal((await call(handler,{cookie:other})).body.profile.name,'Player');
 assert.equal((await call(handler,{method:'POST',body:update})).statusCode,401);
 assert.equal((await call(handler,{method:'POST',cookie,body:{...update,id:'other'}})).statusCode,400);
 assert.equal((await call(handler,{method:'POST',cookie,body:{action:'delete'},headers:{origin:'https://elsewhere.test'}})).statusCode,403);
 assert.equal((await call(handler,{method:'POST',body:{action:'create'},headers:{'content-type':'text/plain'}})).statusCode,415);
 assert.equal((await call(handler,{method:'POST',body:{action:'create',extra:'x'.repeat(600)},parsed:true})).statusCode,413);
 assert.equal((await call(handler,{method:'POST',body:{action:'delete'},headers:{'sec-fetch-site':'cross-site'}})).statusCode,403);
 assert.equal((await call(handler,{method:'PUT'})).statusCode,405);
 const paused=createHandler({...options,enabled:false});
 assert.equal((await call(paused,{cookie})).body.profile.name,'Alice');
 assert.equal((await call(paused,{method:'POST',body:{action:'create'}})).statusCode,503);
 assert.equal((await call(paused,{method:'POST',cookie,body:update})).statusCode,503);
 assert.match((await call(paused,{method:'POST',cookie,body:{action:'delete'}})).headers['Set-Cookie'],/Max-Age=0/);
 assert.equal((await call(handler,{cookie})).body.profile,null);assert.equal((await call(handler,{cookie:other})).body.profile.name,'Player');
 assert.equal(cookieToken(cookie+'; '+cookie),null);assert.equal(validAction({...update,deck:'premium'}),false);
 assert.equal(normalizeName('  '),null);assert.equal(normalizeName('<>'),null);assert.equal(normalizeName('Alice<'),null);assert.equal(normalizeName('x'.repeat(25)),null);assert.equal(normalizeName('a\u202Eb'),null);
 assert.equal(normalizeName(' e\u0301 '),'é');
 const cfg={PILEHEAD_PLAYER_ORIGIN:origin,PILEHEAD_PLAYER_DATABASE_URL:'configured',PILEHEAD_PLAYER_SCHEMA_READY:'1',PILEHEAD_PLAYER_ENABLED:'1',PILEHEAD_PLAYER_PRIVACY_URL:privacyUrl};
 assert.equal(configuration(cfg).enabled,true);assert.equal(configuration({...cfg,PILEHEAD_PLAYER_PRIVACY_URL:'https://other.test/privacy'}).enabled,false);
 assert.equal(configuration({...cfg,PILEHEAD_PLAYER_SCHEMA_READY:'0'}).configured,false);
 assert.equal((await call(createHandler({...options,configured:false,enabled:false}))).body.enabled,false);
 assert.equal((await call(createHandler({...options,store:{find:async()=>{throw Error('offline');}}}),{cookie:other})).statusCode,503);
 assert.equal((await call(createHandler({...options,store:{...store,create:async()=>null}}),{method:'POST',body:{action:'create'}})).statusCode,429);
 const queries=[];const db=createStore(async(sql,args)=>{queries.push({sql,args});return [];});
 await db.find('digest');await db.create('id','digest');await db.preferences('digest','original','Alice');await db.remove('digest');
 assert.match(queries[0].sql,/expires_at>now\(\)/);assert.match(queries[1].sql,/WITH quota AS/);assert.match(queries[1].sql,/hits<250/);
 assert.deepEqual(queries[2].args,['digest','original','Alice']);assert.deepEqual(queries[3].args,['digest']);
 console.log('Guest player profile contract checks passed');
})().catch(e=>{console.error(e);process.exitCode=1;});
