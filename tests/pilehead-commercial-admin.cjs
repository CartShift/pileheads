'use strict';
const assert=require('node:assert/strict');
const {parse,execute}=require('../scripts/commercial-admin.cjs');
const {serveBonus,SCORECARD}=require('../api/founder-bonus.cjs');
const id='12345678-1234-4234-8234-123456789abc';
const op=parse(['grant',id,'founder-supporter','promotion']);assert.equal(op.apply,false);
assert.throws(()=>parse(['grant',id,'founder-supporter','promotion','--force']));
assert.throws(()=>parse(['grant','bad','founder-supporter','promotion']));
assert.throws(()=>parse(['grant',id,'founder-supporter','freeform']));
function bonus(method,row,owned){
 const res={headers:{},setHeader(k,v){this.headers[k]=v;},end(v){this.body=v;}};
 return serveBonus({method},res,{row,owned:async()=>owned,reply:(r,s,b)=>{r.statusCode=s;r.body=b;},secure:r=>r.setHeader('Cache-Control','no-store, private')}).then(()=>res);
}
(async()=>{
 assert.equal((await execute(op,{})).dryRun,true);
 const apply=parse(['revoke',id,'founder-supporter','refund','--apply']);
 await assert.rejects(()=>execute(apply,{query:async()=>{throw Error('must not query');}}),/requires/);
 const queries=[];const result=await execute(apply,{allowMutation:true,query:async(s,a)=>{queries.push({s,a});return [{changed:true}];}});
 assert.equal(result.changed,true);assert.deepEqual(queries[0].a,[id,'founder-supporter','revoke','refund']);
 assert.match(queries[0].s,/stack_admin_entitlement/);
 const report=await execute(parse(['report']),{query:async()=>[]});assert.deepEqual(report,{entitlements:[],batches:[]});
 assert.equal((await bonus('GET',null,[])).statusCode,401);
 assert.equal((await bonus('GET',{id},['sandbox-supporter'])).statusCode,403);
 assert.equal((await bonus('POST',{id},['founder-supporter'])).statusCode,405);
 const ok=await bonus('GET',{id},['founder-supporter']);assert.equal(ok.statusCode,200);assert.equal(ok.body,SCORECARD);assert.match(ok.headers['Content-Disposition'],/attachment/);assert.match(ok.headers['Cache-Control'],/no-store/);
 console.log('Commercial admin and protected bonus contract checks passed');
})().catch(e=>{console.error(e);process.exitCode=1;});
