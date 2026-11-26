"use strict";
const assert = require("node:assert/strict");
const {aggregateReports,validateReport} = require("../scripts/playtest-report-aggregate.cjs");
const {createLog,observe,exportReport}=require("../apps/web/lib/playtest-insights-core.cjs");
const fs=require("node:fs"),os=require("node:os"),path=require("node:path"),{spawnSync}=require("node:child_process");
const log=createLog();
for(const phase of ["setup","play","over"]) observe(log,{key:"secret",mode:"local",phase});
for(const phase of ["setup","play"]) observe(log,{key:"room",mode:"online",phase});
const first=exportReport(log,{fun:5,clarity:4,wouldReplay:"yes"});
const second=exportReport(createLog(),{fun:3,wouldReplay:"unsure"});
const third={...first,truncated:true};
const result=aggregateReports([first,second,third]);
assert.deepEqual(result.reports,{received:3,included:2,excludedTruncated:1});
assert.deepEqual(result.rounds.all,{started:2,completed:1,notObservedCompleted:1,observedCompletionFraction:.5});
assert.equal(result.rounds.online.observedCompletionFraction,0);
assert.deepEqual(result.feedback.fun,{answered:2,unanswered:0,mean:4,distribution:[0,0,1,0,1]});
assert.equal(result.feedback.clarity.unanswered,1);
assert.equal(result.feedback.wouldReplay.statedYesFraction,.5);
assert.equal(aggregateReports([]).rounds.all.observedCompletionFraction,null);
assert.equal(aggregateReports([]).feedback.fun.mean,null);
for(const invalid of [{...first,token:"secret"},{...first,local:{started:1,completed:2}},{...first,online:{started:100,completed:1}},{...first,feedback:{...first.feedback,fun:6}},{...first,schema:"wrong"},null]){
  assert.throws(()=>validateReport(invalid),/Invalid/);
}
const dir=fs.mkdtempSync(path.join(os.tmpdir(),"pileheads-aggregate-"));
try {
  const a=path.join(dir,"a.json"),b=path.join(dir,"b.json");
  fs.writeFileSync(a,JSON.stringify(first));fs.writeFileSync(b,JSON.stringify(second));
  const run=(...args)=>spawnSync(process.execPath,[path.resolve(__dirname,"../scripts/aggregate-playtest-reports.cjs"),...args],{encoding:"utf8"});
  const valid=run(a,b);
  assert.equal(valid.status,0,valid.stderr);
  assert.equal(JSON.parse(valid.stdout).reports.included,2);
  assert.equal(run(a,a).status,1);
  fs.writeFileSync(b,JSON.stringify({...first,privateData:"do not print"}));
  const invalid=run(a,b);assert.equal(invalid.status,1);assert.equal(invalid.stdout,"");assert.ok(!invalid.stderr.includes("do not print"));
} finally {fs.rmSync(dir,{recursive:true,force:true});}
console.log("Playtest report aggregation: passed");
