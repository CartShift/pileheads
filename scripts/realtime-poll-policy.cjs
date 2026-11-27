'use strict';
// A single batched revision query per due room, fast only during recent play.
// These are scheduling targets, not a network SLA. Clock is injected in tests.
const FAST_MS=750, IDLE_MS=2500, ACTIVE_MS=30000, TICK_MS=250;
function createPoll(now){
 return {nextAt:now,fastUntil:now+ACTIVE_MS,lastPollAt:-Infinity,lastHintAt:-Infinity,retryAfter:0};
}
function activity(p,now){
 p.fastUntil=now+ACTIVE_MS;
 p.nextAt=Math.min(p.nextAt,now+FAST_MS);
}
function hint(p,now){
 if(now-p.lastHintAt<FAST_MS)return false;
 p.lastHintAt=now;
 activity(p,now);
 p.nextAt=Math.min(p.nextAt,now);
 return true;
}
function takeDue(p,now){
 if(now<Math.max(p.nextAt,p.lastPollAt+FAST_MS,p.retryAfter))return false;
 p.lastPollAt=now;
 p.nextAt=now+(now<p.fastUntil?FAST_MS:IDLE_MS);
 return true;
}
function failed(p,now){p.retryAfter=now+IDLE_MS;}
module.exports={FAST_MS,IDLE_MS,ACTIVE_MS,TICK_MS,createPoll,activity,hint,takeDue,failed};
