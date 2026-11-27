'use strict';
const assert=require('node:assert/strict'),H=require('../scripts/private-history.cjs'),{digest}=require('../scripts/account-store.cjs');
const id='c7fc5012-3ee3-4f2c-8d35-fd9c71ebcfa7';
const env={PILEHEAD_PRIVATE_HISTORY_SCHEMA_READY:'1',PILEHEAD_HISTORY_SHARED_DATABASE_READY:'1',PILEHEAD_ROUND_HISTORY_SCHEMA_READY:'1',PILEHEAD_ACCOUNT_SCHEMA_READY:'1',PILEHEAD_PLAYER_SCHEMA_READY:'1',PILEHEAD_PLAYER_DATABASE_URL:'test',PILEHEAD_PLAYER_ORIGIN:'https://pileheads.test',PILEHEAD_ROUND_HISTORY_ENABLED:'1',PILEHEAD_PRIVATE_HISTORY_ENABLED:'1',PILEHEAD_ACCOUNT_ENABLED:'1'};
assert.equal(H.configured({}),false);assert.equal(H.available({roomInstanceId:id},env),true);
assert.equal(H.available({roomInstanceId:id,tournamentWithdrawal:{seat:0}},env),false);
assert.equal(H.available({},env),false);
assert.equal(H.enabled({...env,PILEHEAD_HISTORY_SHARED_DATABASE_READY:'0'}),false);
const token='a'.repeat(43),cookie='__Host-pileheads_account='+token;
assert.equal(H.accountDigest(cookie),digest(token));assert.equal(H.accountDigest(cookie+'; '+cookie),null);
assert.equal(H.sameOrigin({origin:'https://pileheads.test'},env),true);
assert.equal(H.sameOrigin({origin:'https://other.test'},env),false);
assert.equal(H.sameOrigin({origin:'https://pileheads.test','sec-fetch-site':'cross-site'},env),false);
for(const q of [H.SQL.link,H.SQL.unlink]){
 assert.match(q,/m.token_hash=\$2/);assert.match(q,/s.token_hash=\$3 AND s.expires_at>now/);
 assert.match(q,/FOR UPDATE OF r/);assert.match(q,/revision=revision\+1/);assert.match(q,/r.revision=\$5/);
}
assert.match(H.SQL.link,/phase' ='setup'/);assert.match(H.SQL.unlink,/phase' IN \('setup','play'\)/);
assert.match(H.SQL.archive,/FROM archived CROSS JOIN committed/);assert.match(H.SQL.archive,/revision=\$4/);assert.match(H.SQL.archive,/INSERT INTO pileheads_player_rounds/);
assert.match(H.SQL.list,/s.token_hash=\$1 AND s.expires_at>now\(\) AND r.expires_at>now\(\)/);
assert.deepEqual(H.publicHistory([{recorded_at:'time',round_no:2,player_count:3,human_count:2,place:1,rules_version:'pilehead-1.7.0',endgame_rule:'classic',round_limit:null,account_id:'secret',room_instance_id:id}]),[{playedAt:'time',round:2,players:3,humans:2,place:1,rulesVersion:'pilehead-1.7.0',endgameRule:'classic',roundLimit:null}]);
console.log('PASS private history contract: dual authorization, same origin, explicit gate, revocable per-round consent, atomic history and minimal projection');
