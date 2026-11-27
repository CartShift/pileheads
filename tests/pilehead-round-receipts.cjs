'use strict';
const assert=require('node:assert/strict'),R=require('../scripts/round-receipts.cjs'),S=require('../scripts/room-standings.cjs');
const id='c7fc5012-3ee3-4f2c-8d35-fd9c71ebcfa7';
const game=(n,round=1)=>({phase:'play',people:Array.from({length:n},(_,seat)=>({seat})),version:'pilehead-1.7.0',moves:45,round,humanCount:n-1,roundLimit:3,finishedOrder:[],loser:null});
assert.equal(R.enabled({}),false);
assert.equal(R.enabled({PILEHEAD_ROUND_HISTORY_ENABLED:'1'}),false);
assert.equal(R.enabled({PILEHEAD_ROUND_HISTORY_SCHEMA_READY:'1',PILEHEAD_ROUND_HISTORY_ENABLED:'1'}),true);
for(let n=2;n<=5;n++){
 const before=game(n),after=structuredClone(before);S.record(before);
 after.phase='over';after.finishedOrder=Array.from({length:n-1},(_,i)=>n-1-i);after.loser=0;
 S.record(after);
 const r=R.receipt(before,after,()=>id);
 assert.equal(after.roomInstanceId,id);assert.deepEqual(r.placements,Array.from({length:n},(_,i)=>n-i));
 assert.deepEqual(Object.keys(r).sort(),['roomId','round','rulesVersion','endgameRule','roundLimit','playerCount','humanCount','placements','moves'].sort());
 assert.equal(R.params(r)[7],'{'+r.placements.join(',')+'}');
 assert.equal(R.receipt(after,after),null);
 assert.equal(R.receipt(before,{...after,tournamentWithdrawal:{seat:0}}),null);
 assert.equal(R.receipt(before,before),null);
 const next=game(n,2);next.roomInstanceId=id;next.roomStandings=structuredClone(after.roomStandings);
 const end=structuredClone(next);end.phase='over';end.finishedOrder=after.finishedOrder;end.loser=0;S.record(end);
 assert.equal(R.receipt(next,end,()=>{throw Error('ID must be reused')}).roomId,id);
 assert.equal(R.receipt(next,end).round,2);
}
const before=game(2),bad={...structuredClone(before),phase:'over',finishedOrder:[0],loser:0};
assert.throws(()=>R.receipt(before,bad),/placements/);
assert.throws(()=>R.receipt(before,{...bad,round:2}),/context/);
assert.match(R.ARCHIVE_ROUND_SQL,/FROM committed/);assert.match(R.ARCHIVE_ROUND_SQL,/revision=\$4/);
console.log('PASS authoritative round receipt contract: 2–5 seats, stable IDs, no replay/withdrawal, minimal allowlist');
