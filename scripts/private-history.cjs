'use strict';
const {digest}=require('./account-store.cjs');
const R=require('./round-receipts.cjs');
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function configured(e=process.env){return e.PILEHEAD_PRIVATE_HISTORY_SCHEMA_READY==='1'&&e.PILEHEAD_HISTORY_SHARED_DATABASE_READY==='1'&&e.PILEHEAD_ROUND_HISTORY_SCHEMA_READY==='1'&&e.PILEHEAD_ACCOUNT_SCHEMA_READY==='1'&&e.PILEHEAD_PLAYER_SCHEMA_READY==='1'&&Boolean(e.PILEHEAD_PLAYER_DATABASE_URL&&e.PILEHEAD_PLAYER_ORIGIN)}
function enabled(e=process.env){return configured(e)&&R.enabled(e)&&e.PILEHEAD_PRIVATE_HISTORY_ENABLED==='1'&&e.PILEHEAD_ACCOUNT_ENABLED==='1'}
function available(state,e=process.env){return enabled(e)&&UUID.test(state?.roomInstanceId||'')&&!state.tournamentWithdrawal}
function accountDigest(header){
 if(typeof header!=='string'||header.length>8192)return null;
 const matches=header.split(';').map(s=>s.trim()).filter(s=>s.startsWith('__Host-pileheads_account='));
 return matches.length===1?digest(matches[0].slice('__Host-pileheads_account='.length)):null;
}
function sameOrigin(headers,e=process.env){return Boolean(e.PILEHEAD_PLAYER_ORIGIN&&headers.origin===e.PILEHEAD_PLAYER_ORIGIN&&(!headers['sec-fetch-site']||['same-origin','none'].includes(headers['sec-fetch-site'])))}
const eligible=(phase)=>`SELECT r.code,m.seat,s.account_id,(r.state->>'roomInstanceId')::uuid AS room_instance_id
 FROM pilehead_rooms r JOIN pilehead_members m ON m.code=r.code
 JOIN pileheads_account_sessions s ON s.token_hash=$3 AND s.expires_at>now()
 WHERE r.code=$1 AND m.token_hash=$2 AND r.revision=$5::integer
 AND r.expires_at>now() AND r.state->>'round'=$4::integer::text
 AND r.state->>'roomInstanceId' IS NOT NULL AND r.state->>'tournamentWithdrawal' IS NULL
 AND r.state->>'phase' ${phase} FOR UPDATE OF r`;
const SQL={
 status:`SELECT EXISTS(SELECT 1 FROM pileheads_account_sessions WHERE token_hash=$3 AND expires_at>now()) AS signed_in,
 EXISTS(SELECT 1 FROM pileheads_round_consents c JOIN pilehead_members m ON m.code=c.code AND m.seat=c.seat
 JOIN pileheads_account_sessions s ON s.account_id=c.account_id AND s.token_hash=$3 AND s.expires_at>now()
 JOIN pilehead_rooms r ON r.code=c.code AND r.state->>'roomInstanceId'=c.room_instance_id::text
 WHERE c.code=$1 AND m.token_hash=$2 AND c.round_no=$4::integer AND r.expires_at>now()) AS linked`,
 link:`WITH eligible AS MATERIALIZED (${eligible("='setup'")}), linked AS (
 INSERT INTO pileheads_round_consents(code,seat,room_instance_id,round_no,account_id)
 SELECT code,seat,room_instance_id,$4::integer,account_id FROM eligible
 ON CONFLICT DO NOTHING RETURNING code
 ), bumped AS (
 UPDATE pilehead_rooms r SET revision=revision+1,updated_at=now() FROM linked WHERE r.code=linked.code RETURNING r.code
 ) SELECT code FROM bumped`,
 unlink:`WITH eligible AS MATERIALIZED (${eligible("IN ('setup','play')")}), unlinked AS (
 DELETE FROM pileheads_round_consents c USING eligible e
 WHERE c.code=e.code AND c.seat=e.seat AND c.account_id=e.account_id AND c.room_instance_id=e.room_instance_id AND c.round_no=$4::integer
 RETURNING c.code
 ), bumped AS (
 UPDATE pilehead_rooms r SET revision=revision+1,updated_at=now() FROM unlinked WHERE r.code=unlinked.code RETURNING r.code
 ) SELECT code FROM bumped`,
 archive:R.ARCHIVE_ROUND_SQL.replace('SELECT committed.* FROM committed CROSS JOIN archived',`, personal AS (
 INSERT INTO pileheads_player_rounds(room_instance_id,round_no,account_id,seat)
 SELECT archived.room_instance_id,$6::integer,c.account_id,c.seat
 FROM archived CROSS JOIN committed
 JOIN pileheads_round_consents c ON c.code=committed.code AND c.room_instance_id=archived.room_instance_id AND c.round_no=$6::integer
 WHERE c.seat<$11::integer
 RETURNING seat
 )
 SELECT committed.* FROM committed CROSS JOIN archived`),
 list:`SELECT r.recorded_at,r.round_no,r.player_count,r.human_count,r.placements[p.seat+1] AS place,r.rules_version,r.endgame_rule,r.round_limit
 FROM pileheads_account_sessions s JOIN pileheads_player_rounds p ON p.account_id=s.account_id
 JOIN pileheads_round_receipts r ON r.room_instance_id=p.room_instance_id AND r.round_no=p.round_no
 WHERE s.token_hash=$1 AND s.expires_at>now() AND r.expires_at>now()
 ORDER BY r.recorded_at DESC,r.room_instance_id,r.round_no DESC LIMIT 50`
};
function publicHistory(rows){return rows.map(r=>({playedAt:r.recorded_at,round:Number(r.round_no),players:Number(r.player_count),humans:Number(r.human_count),place:Number(r.place),rulesVersion:r.rules_version,endgameRule:r.endgame_rule,roundLimit:r.round_limit==null?null:Number(r.round_limit)}))}
module.exports={configured,enabled,available,accountDigest,sameOrigin,SQL,publicHistory};
