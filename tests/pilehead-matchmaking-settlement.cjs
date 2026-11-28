'use strict';
const assert=require('node:assert/strict'),D=require('../scripts/public-room-deadlines.cjs'),{freshGame}=require('../scripts/online-game.cjs'),{SQL,createSettlement}=require('../scripts/matchmaking-settlement.cjs');
const raw='a'.repeat(43),offer='5c0c6815-e56b-4e6f-a6e3-000000000001';
const g=freshGame({players:2,humans:2,bots:0,roundLimit:3});g.publicMatch=true;D.advance(null,g,1000);
(async()=>{
 let row={code:'ASSIGN01',revision:7,state:g,now_ms:'91000'},calls=[],committed=true;
 const settle=createSettlement(async(sql,args)=>{
  calls.push({sql,args});if(sql===SQL.due)return row?[row]:[];
  assert.equal(sql,SQL.settle);
  const [json,status,code,revision,key,id]=args;
  assert.equal(status,'finished');assert.equal(code,'ASSIGN01');assert.equal(revision,7);assert.equal(key.length,64);assert.equal(id,offer);
  const result=JSON.parse(json);assert.equal(result.publicDeadline,undefined);assert.equal(result.tournamentWithdrawal.reason,'deadline');assert.equal(result.roomStandings.completedRounds,0);assert.equal(result.phase,'setup');
  assert.match(sql,/revision=\$4/);assert.match(sql,/s\.token_hash=\$5/);assert.match(sql,/o\.id=\$6::uuid/);
  return committed?[{code}]:[];
 });
 assert.equal(await settle('invalid',offer),false);assert.equal(calls.length,0);
 assert.equal(await settle(raw,'invalid'),false);assert.equal(calls.length,0);
 assert.equal(await settle(raw,offer),true);assert.equal(calls.length,2);
 committed=false;assert.equal(await settle(raw,offer),false);
 row={...row,now_ms:'90999'};assert.equal(await settle(raw,offer),false);
 row={...row,state:{...g,publicMatch:false}};assert.equal(await settle(raw,offer),false);
 row=null;assert.equal(await settle(raw,offer),false);
 console.log('PASS assignment deadline settlement: own seat scope, database clock, CAS, no fabricated points, private room isolation');
})().catch(e=>{console.error(e);process.exitCode=1});
