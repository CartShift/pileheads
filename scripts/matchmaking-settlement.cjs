'use strict';
const {digest}=require('./account-store.cjs');
const Deadlines=require('./public-room-deadlines.cjs');
const E=require('../packages/game-engine');
const Standings=require('./room-standings.cjs');
const {UPDATE_ROOM_SQL}=require('./round-receipts.cjs');
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
// Only the caller's current assignment is considered. No anonymous sweep, no
// new cron, and no client-controlled timestamps or room IDs.
const assigned=`FROM pileheads_account_sessions s
 JOIN pileheads_queue_tickets q ON q.account_id=s.account_id
 JOIN pileheads_match_offers o ON o.id=q.offer_id AND s.account_id IN(o.account_a,o.account_b)
 WHERE s.token_hash=$1 AND s.expires_at>now() AND o.room_code IS NOT NULL AND ($2::uuid IS NULL OR o.id=$2::uuid)`;
const SQL={
 due:`SELECT r.code,r.revision,r.state,floor(extract(epoch from statement_timestamp())*1000)::bigint AS now_ms
 FROM pilehead_rooms r WHERE r.code=(SELECT o.room_code ${assigned})
 AND r.expires_at>now() AND r.state->>'publicMatch'='true' AND r.state->>'tournamentWithdrawal' IS NULL
 AND CASE WHEN jsonb_typeof(r.state#>'{publicDeadline,expiresAt}')='number'
 THEN (r.state#>>'{publicDeadline,expiresAt}')::numeric<=floor(extract(epoch from statement_timestamp())*1000)
 ELSE false END`,
 settle:UPDATE_ROOM_SQL.replace(' RETURNING code,capacity,revision,status,state,expires_at',
 ` AND code=(SELECT o.room_code ${assigned.replaceAll('$1','$5').replaceAll('$2','$6')})
 RETURNING code,capacity,revision,status,state,expires_at`)
};
function createSettlement(query){
 return async function settle(raw,offer=null){
  const key=digest(raw);if(!key||(offer!==null&&!UUID.test(offer)))return false;
  const [r]=await query(SQL.due,[key,offer]);if(!r)return false;
  const now=Number(r.now_ms);if(!Number.isSafeInteger(now))throw Error('invalid database clock');
  const g=structuredClone(r.state);
  if(!Deadlines.withdraw(g,now))return false;
  E.invariant(g);Standings.record(g);
  // A concurrent committed move, release, or account deletion wins rather than
  // being overwritten. The caller reads current state after this single CAS.
  return (await query(SQL.settle,[JSON.stringify(g),'finished',r.code,r.revision,key,offer])).length===1;
 };
}
module.exports={SQL,createSettlement};
