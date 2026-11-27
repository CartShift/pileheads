'use strict';
const crypto=require('node:crypto'),Standings=require('./room-standings.cjs');
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function enabled(env=process.env){return env.PILEHEAD_ROUND_HISTORY_SCHEMA_READY==='1'&&env.PILEHEAD_ROUND_HISTORY_ENABLED==='1'}
function receipt(previous,next,makeId=crypto.randomUUID){
 // Only archive a newly committed gameplay finish. Never backfill from a
 // read, rematch or client assertion, and never award a withdrawn round.
 if(previous.phase!=='play'||next.phase!=='over'||next.tournamentWithdrawal)return null;
 const n=next.people.length,round=next.round??1,humans=next.humanCount??n;
 if(!Number.isInteger(round)||round<1||round>2147483647||round!==(previous.round??1)||
    !Number.isInteger(n)||n<2||n>5||!Number.isInteger(humans)||humans<1||humans>n||
    typeof next.version!=='string'||!/^pilehead-[0-9]+\.[0-9]+\.[0-9]+$/.test(next.version)||
    !Number.isInteger(next.moves)||next.moves<0||next.moves>2147483647)throw Error('invalid round receipt context');
 const limit=next.roundLimit??null;
 if(limit!==null&&(![3,5,10].includes(limit)||round>limit))throw Error('invalid round limit');
 const standings=Standings.publicStandings(next);
 const placements=standings.seats.map(s=>s.lastPlace);
 if(placements.length!==n||new Set(placements).size!==n||
    placements.some(p=>!Number.isInteger(p)||p<1||p>n))throw Error('invalid round receipt placements');
 const roomId=next.roomInstanceId??makeId();
 if(!UUID.test(roomId))throw Error('invalid room instance');
 next.roomInstanceId=roomId;
 return {roomId,round,rulesVersion:next.version,endgameRule:next.endgameRule==='final-duel'?'final-duel':'classic',roundLimit:limit,playerCount:n,humanCount:humans,placements,moves:next.moves};
}
const UPDATE_ROOM_SQL=`UPDATE pilehead_rooms SET state=jsonb_set($1::jsonb,'{reactionEvents}',COALESCE(pilehead_rooms.state->'reactionEvents','[]'::jsonb)),status=$2,revision=revision+1,updated_at=now() WHERE code=$3 AND revision=$4 AND expires_at>now() RETURNING code,capacity,revision,status,state,expires_at`;
const ARCHIVE_ROUND_SQL=`WITH committed AS (
 ${UPDATE_ROOM_SQL}
), archived AS (
 INSERT INTO pileheads_round_receipts(room_instance_id,round_no,rules_version,endgame_rule,round_limit,player_count,human_count,placements,moves)
 SELECT $5::uuid,$6::integer,$7::text,$8::text,$9::smallint,$10::smallint,$11::smallint,$12::smallint[],$13::integer FROM committed
 RETURNING room_instance_id
)
SELECT committed.* FROM committed CROSS JOIN archived`;
function params(r){return [r.roomId,r.round,r.rulesVersion,r.endgameRule,r.roundLimit,r.playerCount,r.humanCount,'{'+r.placements.join(',')+'}',r.moves]}
module.exports={enabled,receipt,params,UPDATE_ROOM_SQL,ARCHIVE_ROUND_SQL};
