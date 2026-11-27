'use strict';
const assert=require('node:assert/strict'),{runPlayerRetention}=require('../scripts/player-retention.cjs');
(async()=>{
 const calls=[],logs=[],query=async(sql,args)=>{calls.push(sql);assert.deepEqual(args,[]);return sql.startsWith('SELECT')?[{expired:'501'}]:[{deleted:'500'}]},log=s=>logs.push(JSON.parse(s));
 await assert.rejects(runPlayerRetention({query,args:['--apply'],log}),/Usage/);
 assert.equal(calls.length,0);
 await runPlayerRetention({query,args:['profiles'],log});
 assert.equal(calls.length,3);assert.ok(calls.every(s=>s.startsWith('SELECT')));
 assert.deepEqual(logs[0],{scope:'profiles',mode:'dry-run',expired:{guestProfiles:'501',accountSessions:'501',oldQuotaDays:'501'}});
 calls.length=0;logs.length=0;
 await runPlayerRetention({query,args:['profiles','--apply'],log});
 assert.equal(calls.length,6);
 for(const sql of calls.slice(3)){
  assert.match(sql,/LIMIT 500/);assert.match(sql,/DELETE FROM public\.pileheads_/);
  assert.doesNotMatch(sql,/FOR UPDATE|TRUNCATE|DROP|DELETE FROM public\.pileheads_accounts\b/i);
  assert.ok(sql.includes('AND r.expires_at<=now()')||sql.includes('AND r.day<current_date-7'));
 }
 assert.deepEqual(logs[1].deleted,{guestProfiles:'500',accountSessions:'500',oldQuotaDays:'500'});
 calls.length=0;
 await runPlayerRetention({query,args:['receipts','--apply'],log});
 assert.equal(calls.length,2);assert.match(calls[1],/r.room_instance_id=c.room_instance_id AND r.round_no=c.round_no AND r.expires_at<=now\(\)/);
 console.log('PASS player retention: explicit scope, dry run, 500-row batches, expiry rechecks, no persistent account deletion');
})().catch(e=>{console.error(e);process.exitCode=1});
