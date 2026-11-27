'use strict';
const assert=require('node:assert/strict');
const {runRetention}=require('../scripts/room-retention.cjs');
async function run(){
 const calls=[],logs=[];
 const query=async (sql,params)=>{
  calls.push({sql,params});
  return sql.startsWith('SELECT')?[{expired_rooms:'42',expired_buckets:'60'}]:[{deleted:'1'}];
 };
 const log=s=>logs.push(JSON.parse(s));
 await runRetention({query,log});
 assert.equal(calls.length,1);
 assert.match(calls[0].sql,/^SELECT /);
 assert.equal(logs[0].mode,'dry-run');
 assert.equal(logs[0].expired_rooms,'42');
 calls.length=0;logs.length=0;
 await assert.rejects(runRetention({query,args:['--force'],log}),/Usage/);
 assert.equal(calls.length,0);
 await runRetention({query,args:['--apply'],log});
 assert.equal(calls.length,3);
 assert.equal(logs[0].mode,'apply');
 for(const {sql,params} of calls.slice(1)){
  assert.match(sql,/LIMIT 500/);
  assert.match(sql,/WHERE expires_at<=now\(\)/);
  assert.match(sql,/AND r\.expires_at<=now\(\)/);
  assert.doesNotMatch(sql,/FOR UPDATE|TRUNCATE|DROP/i);
  assert.deepEqual(params,[]);
 }
 assert.match(calls[1].sql,/DELETE FROM pilehead_rooms/);
 assert.match(calls[2].sql,/DELETE FROM pilehead_rate_limits/);
 assert.deepEqual(logs[1],{deletedRooms:'1',deletedBuckets:'1'});
 await assert.rejects(runRetention({query:async()=>{throw Error('test failure')},args:['--apply'],log}),/test failure/);
 console.log('PASS room retention dry run, explicit apply, bounded expiry-only queries and error propagation');
}
run().catch(e=>{console.error(e);process.exitCode=1});
