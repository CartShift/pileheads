'use strict';
const crypto=require('node:crypto');
const {digest}=require('./account-store.cjs');
const {freshGame}=require('./online-game.cjs');
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const VERSION=/^[A-Za-z0-9_-]{1,32}$/;
function validKey(key){return typeof key==='string'&&/^[A-Za-z0-9_-]{43}$/.test(key)&&Buffer.from(key,'base64url').length===32}
function seatToken(key,version,offer,seat){
 if(!validKey(key)||!VERSION.test(version)||!UUID.test(offer)||![0,1].includes(seat))throw Error('invalid seat key context');
 return crypto.createHmac('sha256',Buffer.from(key,'base64url')).update('pileheads-public-seat-v1|'+version+'|'+offer.toLowerCase()+'|'+seat).digest('base64url');
}
const hash=s=>crypto.createHash('sha256').update(s).digest('hex');
const code=()=>Array.from(crypto.randomBytes(8),n=>'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[n%32]).join('');
const SQL={
 assign:`WITH ready AS MATERIALIZED (
 SELECT o.id,o.account_a,o.account_b FROM pileheads_match_offers o
 WHERE o.id=$1::uuid AND o.room_code IS NULL AND o.ready_a AND o.ready_b AND o.expires_at>now()
 AND EXISTS(SELECT 1 FROM pileheads_queue_tickets q WHERE q.offer_id=o.id AND q.account_id=o.account_a AND q.expires_at>now())
 AND EXISTS(SELECT 1 FROM pileheads_queue_tickets q WHERE q.offer_id=o.id AND q.account_id=o.account_b AND q.expires_at>now())
 AND NOT EXISTS(SELECT 1 FROM pileheads_match_blocks b WHERE (b.account_id=o.account_a AND b.blocked_account_id=o.account_b) OR (b.account_id=o.account_b AND b.blocked_account_id=o.account_a))
 FOR UPDATE OF o
 ), created AS (
 INSERT INTO pilehead_rooms(code,capacity,status,state)
 SELECT $2::varchar(10),2,'lobby',$3::jsonb FROM ready RETURNING code,expires_at
 ), seated AS (
 INSERT INTO pilehead_members(code,seat,display_name,token_hash)
 SELECT created.code,slots.seat,slots.nickname,slots.token FROM created
 CROSS JOIN (VALUES (0,'Player 1',$4::text),(1,'Player 2',$5::text)) slots(seat,nickname,token)
 RETURNING seat
 ), assigned AS (
 UPDATE pileheads_match_offers o SET room_code=created.code,seat_key_version=$6::text,expires_at=created.expires_at
 FROM ready CROSS JOIN created WHERE o.id=ready.id RETURNING o.id,o.expires_at
 ), extended AS (
 UPDATE pileheads_queue_tickets q SET expires_at=assigned.expires_at FROM assigned WHERE q.offer_id=assigned.id RETURNING q.ticket_id
 ) SELECT created.code FROM created CROSS JOIN assigned WHERE (SELECT count(*) FROM seated)=2 AND (SELECT count(*) FROM extended)=2`,
 recover:`SELECT o.id AS offer_id,o.room_code,o.seat_key_version,
 CASE WHEN s.account_id=o.account_a THEN 0 ELSE 1 END AS seat,m.token_hash
 FROM pileheads_account_sessions s JOIN pileheads_queue_tickets q ON q.account_id=s.account_id
 JOIN pileheads_match_offers o ON o.id=q.offer_id AND s.account_id IN(o.account_a,o.account_b)
 JOIN pilehead_rooms r ON r.code=o.room_code
 JOIN pilehead_members m ON m.code=r.code AND m.seat=CASE WHEN s.account_id=o.account_a THEN 0 ELSE 1 END
 WHERE s.token_hash=$1 AND s.expires_at>now() AND r.expires_at>now() AND o.room_code IS NOT NULL`,
 release:`DELETE FROM pileheads_match_offers o USING pileheads_account_sessions s,pilehead_rooms r
 WHERE s.token_hash=$1 AND s.expires_at>now() AND s.account_id IN(o.account_a,o.account_b)
 AND o.id=$2::uuid AND o.room_code=r.code
 AND (r.expires_at<=now() OR r.state->>'tournamentWithdrawal' IS NOT NULL OR (r.status='finished' AND r.state->>'phase'='over' AND r.state->>'round'='3' AND r.state->>'roundLimit'='3'))
 RETURNING o.id`
};
function createAssignment(query,{keys,activeVersion,makeCode=code,makeGame=freshGame}){
 if(!VERSION.test(activeVersion)||!validKey(keys?.[activeVersion]))throw Error('missing active public seat key');
 return {
  // Worker only: never expose arbitrary offer assignment as a client action.
  async assign(offer){
   if(!UUID.test(offer))throw Error('invalid offer');
   const a=hash(seatToken(keys[activeVersion],activeVersion,offer,0)),b=hash(seatToken(keys[activeVersion],activeVersion,offer,1));
   for(let i=0;i<4;i++){
    const game=makeGame({players:2,humans:2,bots:0,endgameRule:'classic',roundLimit:3});
    game.roomInstanceId=crypto.randomUUID();game.publicMatch=true;
    try{const rows=await query(SQL.assign,[offer,makeCode(),JSON.stringify(game),a,b,activeVersion]);return rows[0]?.code??null}
    catch(e){if(e.code!=='23505')throw e}
   }
   throw Error('room code allocation failed');
  },
  async recover(raw){
   const key=digest(raw);if(!key)return null;
   const [r]=await query(SQL.recover,[key]);if(!r)return null;
   const seat=Number(r.seat),token=seatToken(keys[r.seat_key_version],r.seat_key_version,r.offer_id,seat);
   if(hash(token)!==r.token_hash)throw Error('seat credential mismatch');
   return {code:r.room_code,seat,session:token};
  },
  async release(raw,offer){
   const key=digest(raw);if(!key||!UUID.test(offer))return false;
   return (await query(SQL.release,[key,offer])).length===1;
  }
 };
}
module.exports={SQL,seatToken,createAssignment};
