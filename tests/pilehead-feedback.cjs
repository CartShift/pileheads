"use strict";
const assert=require("node:assert/strict");
const {volumeValue,committedFeedback,HAPTICS}=require("../apps/web/lib/feedback-core.cjs");
assert.equal(volumeValue(null),70);
assert.equal(volumeValue("0"),0);
assert.equal(volumeValue("101"),100);
assert.equal(volumeValue("garbage"),70);
assert.equal(committedFeedback({type:"play"},null,"over",0,0),"loss");
assert.equal(committedFeedback({type:"play"},null,"over",0,1),"win");
assert.equal(committedFeedback({type:"counter-dump"},{kind:"dump"},"play",0,null),"counter");
assert.equal(committedFeedback({type:"blind-fail"},{kind:"reject"},"play",0,null),"reject");
assert.equal(committedFeedback({type:"followup",burned:true},{kind:"burn"},"play",0,null),"slam");
assert.equal(committedFeedback({type:"take"},{kind:"pickup"},"play",0,null),"take");
assert.equal(committedFeedback({type:"play"},null,"play",0,null),"play");
for(const pattern of Object.values(HAPTICS)) {
  const durations=Array.isArray(pattern)?pattern:[pattern];
  assert.ok(durations.every(n=>Number.isInteger(n)&&n>=0&&n<=40));
  assert.ok(durations.reduce((a,b)=>a+b,0)<=150);
}
console.log("PASS feedback policy: volume, semantic effects, bounded vibrations");
