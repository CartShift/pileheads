'use strict';
const assert=require('node:assert/strict'),Q=require('../scripts/matchmaking-queue.cjs');
const now=Date.parse('2026-11-28T12:00:00Z'),future='2026-11-28T12:00:20Z',old='2026-11-28T11:59:59Z',id='3c0c6815-e56b-4e6f-a6e3-1b3345c9b986';
assert.deepEqual(Q.publicStatus(null,now),{state:'idle'});
assert.deepEqual(Q.publicStatus({expires_at:old},now),{state:'expired'});
assert.deepEqual(Q.publicStatus({expires_at:future,ticket_id:id,account_id:'secret'},now),{state:'waiting',ticket:id,expiresAt:future});
assert.deepEqual(Q.publicStatus({expires_at:future,offer_id:id,offer_expires_at:old},now),{state:'expired'});
assert.deepEqual(Q.publicStatus({expires_at:future,offer_id:id,offer_expires_at:future,own_ready:true,rival_ready:false,account_id:'secret'},now),{state:'offered',offer:id,expiresAt:future,ownReady:true,rivalReady:false});
assert.equal(Q.publicStatus({expires_at:future,offer_id:id,offer_expires_at:future,own_ready:true,rival_ready:true},now).state,'ready');
assert.deepEqual(Q.publicStatus({expires_at:old,offer_id:id,room_code:'ABCD2345'},now),{state:'assigned',offer:id});
assert.match(Q.SQL.claim,/FOR UPDATE OF q SKIP LOCKED/);assert.match(Q.SQL.claim,/first CROSS JOIN second/);
assert.match(Q.SQL.claim,/pileheads_match_blocks/);assert.match(Q.SQL.accept,/pileheads_match_blocks/);
assert.match(Q.SQL.join,/ON CONFLICT\(account_id\) DO NOTHING/);
for(const k of ['join','status','accept','cancelOffer','cancelWaiting'])assert.match(Q.SQL[k],/token_hash=\$1 AND .*expires_at>now/);
for(const k of ['expireOffers','expireWaiting']){assert.match(Q.SQL[k],/LIMIT 500/);assert.match(Q.SQL[k],/expires_at<=now\(\).*RETURNING 1/s)}
(async()=>{
 const calls=[];const q=Q.createQueue(async(sql,args)=>{calls.push({sql,args});return []});
 assert.equal(await q.join('invalid'),false);assert.equal(await q.cancel('invalid',{offer:id}),false);assert.equal(calls.length,0);
 assert.equal(await q.accept('a'.repeat(43),'invalid'),null);assert.equal(calls.length,0);
 assert.equal(await q.cancel('a'.repeat(43),{offer:id,ticket:id}),false);assert.equal(calls.length,0);
 console.log('PASS matchmaking queue: one ticket per identity, private projection, authenticated acceptance, blocked pairing and bounded expiry');
})().catch(e=>{console.error(e);process.exitCode=1});
