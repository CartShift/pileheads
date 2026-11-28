'use strict';
const assert=require('node:assert/strict'),crypto=require('node:crypto');
const core=require('../scripts/commerce-admin.cjs'),{createHandler}=require('../api/commerce-test-admin.js');
const token='a'.repeat(43),env={VERCEL_ENV:'preview',VERCEL_URL:'preview.vercel.app',PILEHEAD_COMMERCE_TEST_ENABLED:'1',PILEHEAD_COMMERCE_TEST_STRIPE_KEY:'sk_test_example',PILEHEAD_COMMERCE_TEST_WEBHOOK_SECRET:'whsec_example',PILEHEAD_COMMERCE_TEST_DATABASE_URL:'postgres://tester:fictional@test.example/pileheads_commerce_test',PILEHEAD_COMMERCE_TEST_ADMIN_TOKEN:token};
assert.ok(core.adminConfig(env));assert.equal(core.adminConfig({...env,VERCEL_ENV:'production'}),null);assert.equal(core.adminConfig({...env,PILEHEAD_COMMERCE_TEST_ADMIN_TOKEN:'short'}),null);
const id=crypto.randomUUID(),eventId=crypto.randomUUID();
assert.ok(core.validate({action:'advance',id,eventId,expected:'packed'}));
assert.ok(!core.validate({action:'advance',id,eventId,expected:'shipped'}));
assert.ok(!core.validate({action:'adjust',delta:-1,version:0,eventId,reason:'test_receipt'}));
assert.ok(!core.validate({action:'orders',filter:'paid',offset:1}));
assert.ok(!core.validate({action:'overview',extra:true}));
function call(handler,body,headers={},method='POST'){let status,data;const res={setHeader(){},status(s){status=s;return this;},json(b){data=b;return this;}};return handler({method,headers:{origin:'https://preview.vercel.app','content-type':'application/json',authorization:'Bearer '+token,...headers},body},res).then(()=>({status,data}));}
(async()=>{
 let calls=0;
 const store=()=>({overview:async()=>{calls++;return {paid:2}},orders:async()=>Array.from({length:26},()=>({id})),advance:async()=>false,adjust:async()=>true});
 const handler=createHandler({env,store});
 assert.equal((await call(handler,{action:'overview'},{authorization:'Bearer wrong'})).status,401);assert.equal(calls,0);
 assert.equal((await call(handler,{action:'overview'},{origin:'https://other.example'})).status,403);assert.equal(calls,0);
 assert.equal((await call(createHandler({env:{...env,VERCEL_ENV:'production'},store}),{action:'overview'})).status,404);
 assert.equal((await call(handler,{action:'overview'})).data.overview.paid,2);
 const r=await call(handler,{action:'orders',filter:'paid',offset:0});assert.equal(r.data.orders.length,25);assert.equal(r.data.hasMore,true);
 assert.equal((await call(handler,{action:'advance',id,eventId,expected:'packed'})).status,409);
 assert.equal((await call(handler,{action:'adjust',delta:5,version:0,eventId,reason:'test_receipt'})).status,200);
 console.log('Commerce administration contracts passed');
})().catch(e=>{console.error(e);process.exitCode=1;});
