'use strict';
const assert=require('node:assert/strict'),P=require('../scripts/player-progression.cjs');
assert.equal(P.enabled({}),false);assert.equal(P.snapshot(null),null);
for(const [xp,level,levelXP,unlocked] of [[0,1,0,0],[10,1,10,1],[50,1,50,2],[100,2,0,2],[250,3,50,3],[1000,11,0,4]]){
 const p=P.snapshot({total_xp:String(xp)});assert.equal(p.xp,xp);assert.equal(p.level,level);assert.equal(p.levelXP,levelXP);assert.equal(p.rewardedRounds,xp/10);assert.equal(p.achievements.filter(a=>a.unlocked).length,unlocked);
}
for(const xp of [-10,11,Infinity,NaN])assert.throws(()=>P.snapshot({total_xp:xp}),/invalid progression/);
assert.match(P.SQL.link,/account_id,progression_opt_in/);assert.match(P.SQL.link,/account_id,true FROM eligible/);
assert.match(P.SQL.archive,/RETURNING account_id,seat/);assert.match(P.SQL.archive,/INSERT INTO pileheads_player_progression/);assert.match(P.SQL.archive,/revision=\$4/);assert.match(P.SQL.archive,/c.progression_opt_in AND \$10::integer=\$11::integer/);assert.match(P.SQL.archive,/p.daily_xp<=40/);assert.match(P.SQL.archive,/ORDER BY personal.account_id/);assert.match(P.SQL.read,/s.expires_at>now/);
console.log('PASS private progression: versioned levels, achievements, explicit opt-in, authoritative atomic award and daily cap');
