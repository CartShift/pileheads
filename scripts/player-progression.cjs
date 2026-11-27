'use strict';
const H=require('./private-history.cjs');
const ROUND_XP=10,DAILY_LIMIT=50,LEVEL_XP=100;
const ACHIEVEMENTS=Object.freeze([
 {id:'first-stack',name:'First Stack',rounds:1},
 {id:'regular',name:'Table Regular',rounds:5},
 {id:'veteran',name:'Table Veteran',rounds:25},
 {id:'century',name:'Century Club',rounds:100}
]);
function configured(e=process.env){return H.configured(e)&&e.PILEHEAD_PROGRESSION_SCHEMA_READY==='1'}
function enabled(e=process.env){return configured(e)&&H.enabled(e)&&e.PILEHEAD_PROGRESSION_ENABLED==='1'}
function eligible(state,e=process.env){return enabled(e)&&H.available(state,e)&&Array.isArray(state.people)&&state.people.length>=2&&state.humanCount===state.people.length}
const day="(now() AT TIME ZONE 'UTC')::date";
const SQL={
 link:H.SQL.link.replace('room_instance_id,round_no,account_id)','room_instance_id,round_no,account_id,progression_opt_in)').replace('room_instance_id,$4::integer,account_id FROM eligible','room_instance_id,$4::integer,account_id,true FROM eligible'),
 status:H.SQL.status+ `, EXISTS(SELECT 1 FROM pileheads_round_consents c JOIN pilehead_members m ON m.code=c.code AND m.seat=c.seat
 JOIN pileheads_account_sessions s ON s.account_id=c.account_id AND s.token_hash=$3 AND s.expires_at>now()
 JOIN pilehead_rooms r ON r.code=c.code AND r.state->>'roomInstanceId'=c.room_instance_id::text
 WHERE c.code=$1 AND m.token_hash=$2 AND c.round_no=$4::integer AND r.expires_at>now() AND c.progression_opt_in) AS progression_selected`,
 archive:H.SQL.archive.replace('RETURNING seat\n )\n SELECT committed.* FROM committed CROSS JOIN archived',`RETURNING account_id,seat
 ), awarded AS (
 INSERT INTO pileheads_player_progression AS p(account_id,total_xp,award_day,daily_xp)
 SELECT personal.account_id,${ROUND_XP},${day},${ROUND_XP}
 FROM personal CROSS JOIN committed CROSS JOIN archived
 JOIN pileheads_round_consents c ON c.code=committed.code AND c.room_instance_id=archived.room_instance_id AND c.round_no=$6::integer
 AND c.seat=personal.seat AND c.account_id=personal.account_id
 WHERE c.progression_opt_in AND $10::integer=$11::integer AND $11::integer>=2
 ORDER BY personal.account_id
 ON CONFLICT(account_id) DO UPDATE SET total_xp=p.total_xp+${ROUND_XP},
 award_day=EXCLUDED.award_day,
 daily_xp=CASE WHEN p.award_day=EXCLUDED.award_day THEN p.daily_xp+${ROUND_XP} ELSE ${ROUND_XP} END
 WHERE p.award_day<EXCLUDED.award_day OR (p.award_day=EXCLUDED.award_day AND p.daily_xp<=${DAILY_LIMIT-ROUND_XP})
 RETURNING account_id
 )
 SELECT committed.* FROM committed CROSS JOIN archived`),
 read:`SELECT COALESCE(p.total_xp,0) AS total_xp FROM pileheads_account_sessions s
 LEFT JOIN pileheads_player_progression p ON p.account_id=s.account_id
 WHERE s.token_hash=$1 AND s.expires_at>now()`
};
function snapshot(row){
 if(!row)return null;
 const xp=Number(row.total_xp);
 if(!Number.isSafeInteger(xp)||xp<0||xp%ROUND_XP!==0)throw Error('invalid progression aggregate');
 const rewardedRounds=xp/ROUND_XP,level=Math.floor(xp/LEVEL_XP)+1;
 return {version:1,xp,level,levelXP:xp%LEVEL_XP,nextLevelXP:LEVEL_XP,rewardedRounds,achievements:ACHIEVEMENTS.map(a=>({...a,unlocked:rewardedRounds>=a.rounds}))};
}
module.exports={configured,enabled,eligible,SQL,snapshot,ROUND_XP,DAILY_LIMIT,LEVEL_XP};
