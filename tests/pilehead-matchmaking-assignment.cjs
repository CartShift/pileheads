'use strict';
const assert=require('node:assert/strict'),crypto=require('node:crypto'),A=require('../scripts/matchmaking-assignment.cjs'),E=require('../packages/game-engine');
const key=crypto.randomBytes(32).toString('base64url'),offer='6c0c6815-e56b-4e6f-a6e3-000000000001',version='v1';
const a=A.seatToken(key,version,offer,0),b=A.seatToken(key,version,offer,1);
assert.notEqual(a,b);assert.equal(a,A.seatToken(key,version,offer,0));assert.notEqual(a,A.seatToken(key,'v2',offer,0));
assert.throws(()=>A.seatToken('weak',version,offer,0));assert.throws(()=>A.seatToken(key,version,offer,2));
assert.match(A.SQL.assign,/FOR UPDATE OF o/);assert.match(A.SQL.assign,/o.ready_a AND o.ready_b/);assert.match(A.SQL.assign,/INSERT INTO pilehead_members/);assert.match(A.SQL.assign,/room_code IS NULL/);
assert.match(A.SQL.recover,/s.token_hash=\$1 AND s.expires_at>now/);assert.match(A.SQL.release,/roundLimit'='3'/);assert.match(A.SQL.release,/DELETE FROM pileheads_queue_tickets q/);assert.match(A.SQL.release,/q.account_id=s.account_id/);
(async()=>{
 const calls=[];const service=A.createAssignment(async(sql,args)=>{
  calls.push({sql,args});if(sql===A.SQL.assign){const g=JSON.parse(args[2]);E.invariant(g);assert.equal(g.humanCount,2);assert.equal(g.roundLimit,3);assert.equal(g.publicMatch,true);assert.equal(g.botSeats.length,0);assert.equal(args[3],crypto.createHash('sha256').update(a).digest('hex'));return [{code:'ASSIGN01'}]}
  if(sql===A.SQL.recover)return [{offer_id:offer,room_code:'ASSIGN01',seat_key_version:version,seat:0,token_hash:crypto.createHash('sha256').update(a).digest('hex')}];
  return [{id:offer}];
 },{keys:{v1:key},activeVersion:version,makeCode:()=> 'ASSIGN01'});
 assert.equal(await service.recover('invalid'),null);assert.equal(calls.length,0);
 assert.equal(await service.assign(offer),'ASSIGN01');
 assert.deepEqual(await service.recover('x'.repeat(43)),{code:'ASSIGN01',seat:0,session:a});
 assert.equal(await service.release('x'.repeat(43),offer),true);
 assert.ok(calls.every(c=>!c.args.includes(a)&&!c.args.includes(b)&&!c.args.includes(key)));
 console.log('PASS public room assignment: shared engine, deterministic separate seat credentials, authenticated recovery and terminal release');
})().catch(e=>{console.error(e);process.exitCode=1});
