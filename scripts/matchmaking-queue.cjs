'use strict';
const {randomUUID}=require('node:crypto');
const {digest}=require('./account-store.cjs');
// All user actions resolve the account from an authenticated session.
// The claim operation is operator/worker-only and is never a public command.
const SQL={
 join:`WITH actor AS MATERIALIZED (
 SELECT account_id FROM pileheads_account_sessions WHERE token_hash=$1 AND expires_at>now()
 ), entered AS (
 INSERT INTO pileheads_queue_tickets(account_id,ticket_id)
 SELECT account_id,$2::uuid FROM actor
 ON CONFLICT(account_id) DO NOTHING RETURNING ticket_id
 )
 SELECT ticket_id FROM entered`,
 status:`SELECT q.ticket_id,q.joined_at,q.expires_at,q.offer_id,o.expires_at AS offer_expires_at,
 CASE WHEN q.account_id=o.account_a THEN o.ready_a ELSE o.ready_b END AS own_ready,
 CASE WHEN q.account_id=o.account_a THEN o.ready_b ELSE o.ready_a END AS rival_ready
 FROM pileheads_account_sessions s JOIN pileheads_queue_tickets q ON q.account_id=s.account_id
 LEFT JOIN pileheads_match_offers o ON o.id=q.offer_id
 WHERE s.token_hash=$1 AND s.expires_at>now()`,
 claim:`WITH first AS MATERIALIZED (
 SELECT q.account_id FROM pileheads_queue_tickets q
 WHERE q.offer_id IS NULL AND q.expires_at>now()+interval '20 seconds'
 AND EXISTS(SELECT 1 FROM pileheads_queue_tickets candidate
 WHERE candidate.account_id<>q.account_id AND candidate.offer_id IS NULL AND candidate.expires_at>now()+interval '20 seconds'
 AND NOT EXISTS(SELECT 1 FROM pileheads_match_blocks b WHERE (b.account_id=q.account_id AND b.blocked_account_id=candidate.account_id) OR (b.account_id=candidate.account_id AND b.blocked_account_id=q.account_id)))
 ORDER BY q.joined_at,q.account_id LIMIT 1 FOR UPDATE OF q SKIP LOCKED
 ), second AS MATERIALIZED (
 SELECT q.account_id FROM pileheads_queue_tickets q CROSS JOIN first
 WHERE q.account_id<>first.account_id AND q.offer_id IS NULL AND q.expires_at>now()+interval '20 seconds'
 AND NOT EXISTS(SELECT 1 FROM pileheads_match_blocks b WHERE (b.account_id=q.account_id AND b.blocked_account_id=first.account_id) OR (b.account_id=first.account_id AND b.blocked_account_id=q.account_id))
 ORDER BY q.joined_at,q.account_id LIMIT 1 FOR UPDATE OF q SKIP LOCKED
 ), offered AS (
 INSERT INTO pileheads_match_offers(id,account_a,account_b)
 SELECT $1::uuid,first.account_id,second.account_id FROM first CROSS JOIN second RETURNING id,account_a,account_b
 ), paired AS (
 UPDATE pileheads_queue_tickets q SET offer_id=o.id FROM offered o
 WHERE q.account_id IN (o.account_a,o.account_b) RETURNING q.ticket_id
 ) SELECT count(*)::integer AS paired FROM paired`,
 accept:`WITH actor AS MATERIALIZED (
 SELECT account_id FROM pileheads_account_sessions WHERE token_hash=$1 AND expires_at>now()
 )
 UPDATE pileheads_match_offers o SET ready_a=o.ready_a OR o.account_a=actor.account_id,
 ready_b=o.ready_b OR o.account_b=actor.account_id FROM actor
 WHERE o.id=$2::uuid AND o.expires_at>now() AND actor.account_id IN(o.account_a,o.account_b)
 AND EXISTS(SELECT 1 FROM pileheads_queue_tickets q WHERE q.account_id=actor.account_id AND q.offer_id=o.id AND q.expires_at>now())
 AND NOT EXISTS(SELECT 1 FROM pileheads_match_blocks b WHERE (b.account_id=o.account_a AND b.blocked_account_id=o.account_b) OR (b.account_id=o.account_b AND b.blocked_account_id=o.account_a))
 RETURNING o.ready_a AND o.ready_b AS both_ready`,
 cancelOffer:`DELETE FROM pileheads_match_offers o USING pileheads_account_sessions s
 WHERE s.token_hash=$1 AND s.expires_at>now() AND o.id=$2::uuid AND s.account_id IN(o.account_a,o.account_b)
 RETURNING o.id`,
 cancelWaiting:`DELETE FROM pileheads_queue_tickets q USING pileheads_account_sessions s
 WHERE s.token_hash=$1 AND s.expires_at>now() AND q.account_id=s.account_id AND q.ticket_id=$2::uuid AND q.offer_id IS NULL
 RETURNING q.ticket_id`,
 expireOffers:`WITH candidates AS (SELECT id FROM pileheads_match_offers WHERE expires_at<=now() ORDER BY expires_at,id LIMIT 500),
 removed AS (DELETE FROM pileheads_match_offers o USING candidates c WHERE o.id=c.id AND o.expires_at<=now() RETURNING 1)
 SELECT count(*) AS deleted FROM removed`,
 expireWaiting:`WITH candidates AS (SELECT account_id FROM pileheads_queue_tickets WHERE offer_id IS NULL AND expires_at<=now() ORDER BY expires_at,account_id LIMIT 500),
 removed AS (DELETE FROM pileheads_queue_tickets q USING candidates c WHERE q.account_id=c.account_id AND q.offer_id IS NULL AND q.expires_at<=now() RETURNING 1)
 SELECT count(*) AS deleted FROM removed`
};
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function publicStatus(row,now=Date.now()){
 if(!row)return {state:'idle'};
 const expires=Date.parse(row.expires_at);
 if(!Number.isFinite(expires))throw Error('invalid ticket expiry');
 if(expires<=now)return {state:'expired'};
 if(!row.offer_id)return {state:'waiting',ticket:row.ticket_id,expiresAt:row.expires_at};
 const offerExpires=Date.parse(row.offer_expires_at);
 if(!Number.isFinite(offerExpires)||offerExpires<=now)return {state:'expired'};
 return {state:row.own_ready&&row.rival_ready?'ready':'offered',offer:row.offer_id,expiresAt:row.offer_expires_at,ownReady:row.own_ready===true,rivalReady:row.rival_ready===true};
}
function createQueue(query){
 return {
  async join(raw){const key=digest(raw);if(!key)return false;return (await query(SQL.join,[key,randomUUID()])).length===1},
  async status(raw){const key=digest(raw);if(!key)return {state:'idle'};return publicStatus((await query(SQL.status,[key]))[0])},
  async claim(){const row=(await query(SQL.claim,[randomUUID()]))[0];return Number(row?.paired)===2},
  async accept(raw,offer){const key=digest(raw);if(!key||!UUID.test(offer))return null;const [row]=await query(SQL.accept,[key,offer]);return row?{bothReady:row.both_ready===true}:null},
  async cancel(raw,{ticket,offer}){const key=digest(raw);if(!key||Boolean(ticket)===Boolean(offer)||!UUID.test(ticket||offer))return false;return (await query(offer?SQL.cancelOffer:SQL.cancelWaiting,[key,offer||ticket])).length===1}
 };
}
module.exports={SQL,createQueue,publicStatus};
