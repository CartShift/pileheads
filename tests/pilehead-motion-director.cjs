"use strict";
const assert = require("node:assert/strict");
const { EFFECTS, chooseKind, fromCommittedEvent, advanceCursor, advanceSoundCursor } =
  require("../apps/web/lib/motion-core.cjs");

const e = (extra = {}) => ({ type: "play", seat: 0, move: 1, ...extra });
const cue = extra => fromCommittedEvent(e(extra));

assert.equal(cue({ rank: 5 }), null, "ordinary card play stays quiet");
assert.equal(cue({ type: "dump-pending", action: "dump" }), null,
  "no transfer until DUMP target has been committed");

for (const [extra, kind] of [
  [{action:"burn",burned:true,burnedCount:15}, "burn"],
  [{action:"dump",reason:"dump",target:2,takenCount:9,count:1}, "dump"],
  [{type:"take",takenCount:7,count:8,erodedCount:1}, "pickup"],
  [{type:"blind-fail",takenCount:4}, "reject"],
  [{action:"reset"}, "reset"],
  [{action:"ghost"}, "ghost"],
  [{action:"under"}, "under"],
  [{action:"skip",target:1}, "skip"],
  [{type:"followup",reason:"snap"}, "snap"],
  [{type:"slam",burned:true,burnedCount:12}, "slam"],
  [{bridgeCount:1}, "combo"],
]) {
  assert.equal(cue(extra)?.kind, kind, "correct semantic kind " + kind);
  assert.ok(EFFECTS[kind].duration > 0);
}
assert.equal(cue({action:"dump",reason:"dump",target:2,takenCount:9,count:1}).transferCount,9,
  "DUMP takes the *existing* pile, not the count of DUMP cards");
assert.equal(cue({action:"dump",target:2,takenCount:9}).recipient,2);
assert.equal(cue({action:"dump",target:2,takenCount:0}).hasTransfer,false,
  "empty-pile DUMP cannot invent flying cards");
assert.equal(cue({type:"take",count:1,takenCount:0,erodedCount:1}).hasTransfer,false,
  "Final Duel pickup with only one card burns, never transfers");
assert.equal(cue({type:"take",count:1,takenCount:0,erodedCount:1}).erodedCount,1);
assert.ok(cue({type:"take",count:3,takenCount:2,erodedCount:1}).duration>=800,
  "Final Duel one-card erosion and remaining transfer must both finish visibly");
assert.equal(cue({type:"followup",reason:"snap",burned:true,burnedCount:10}).destination,"ashes",
  "SNAP that completes four actually burns the pile");
assert.equal(cue({type:"followup",reason:"snap",burned:true,burnedCount:10}).kind,"burn");
assert.equal(cue({type:"followup",reason:"snap",burned:true,burnedCount:10}).label,"SNAP + BURN");
assert.equal(cue({action:"skip",target:1}).skippedSeat,1,
  "SKIP target is skipped, never assumed to play next");
assert.equal(cue({action:"under"}).hasTransfer,false);
assert.equal(cue({action:"reset"}).hasTransfer,false);
assert.equal(cue({type:"blind-fail",takenCount:2}).reveal,true);
assert.equal(cue({type:"blind-fail",takenCount:2,erodedCount:1}).erodedCount,1);
assert.equal(cue({action:"burn",burnedCount:undefined,count:1}).hasTransfer,false,
  "missing authoritative burn count cannot fake a pile transfer");
assert.equal(cue({action:"dump",target:undefined,takenCount:4}).hasTransfer,false,
  "unknown recipient cannot invent destination");
assert.equal(fromCommittedEvent({type:"play",seat:0,move:undefined,action:"burn"}),null);
assert.equal(fromCommittedEvent({type:"play",seat:-1,move:1,action:"burn"}),null);

let state={key:"",move:0};
const input={gameKey:"local:42",moveNo:2,phase:"play",visible:true,
  events:[e({move:1,action:"under"}),e({move:2,action:"burn",burnedCount:4})]};
let next=advanceCursor(state,input);
assert.equal(next.cue,null,"first render must not replay already committed events");
state=next.cursor;
next=advanceCursor(state,{...input,moveNo:3,events:[...input.events,e({move:3,action:"ghost"})]});
assert.equal(next.cue?.kind,"ghost");
state=next.cursor;
assert.equal(advanceCursor(state,{...input,moveNo:3}).cue,null,"duplicate poll ignored");
assert.equal(advanceCursor(state,{...input,moveNo:4,events:input.events}).cue,null,
  "missing current event never replays an earlier move");
assert.equal(advanceCursor(state,{...input,moveNo:2}).clear,true,
  "Undo rewinds and clears the previous effect");
assert.equal(advanceCursor(state,{...input,gameKey:"online:new"}).cue,null,
  "room switch never replays previous room");
assert.equal(advanceCursor(state,{...input,phase:"over"}).cue,null);
assert.equal(advanceCursor(state,{...input,phase:"over",moveNo:4,
  events:[...input.events,e({move:4,action:"burn",burnedCount:3})]}).cue?.kind,"burn",
  "the last committed special action still plays at the end of a round");
assert.equal(advanceCursor(state,{...input,moveNo:4,visible:false,
  events:[...input.events,e({move:4,action:"burn"})]}).cue,null,
  "hidden tab may not accumulate old scenes");


// Sound must track the authoritative game scope as well as the move number.
// Polling, reopening a room and toggling sound must never replay history.
let audible={key:"",move:0};
const audio=(updates={})=>advanceSoundCursor(audible,{
  gameKey:"online:ROOMA:1",moveNo:3,phase:"play",
  event:e({move:3,seat:1}),enabled:true,visible:true,...updates
});
let decision=audio();
assert.equal(decision.shouldPlay,false,"mounting an existing room must be silent");
audible=decision.cursor;
decision=audio({moveNo:4,event:e({move:4,seat:1})});
assert.equal(decision.shouldPlay,true,"fresh committed move plays one sound");
audible=decision.cursor;
assert.equal(audio({moveNo:4,event:e({move:4,seat:1})}).shouldPlay,false,
  "duplicate polling and rerender cannot replay sound");
assert.equal(audio({gameKey:"online:ROOMB:1",moveNo:5,
  event:e({move:5,seat:1})}).shouldPlay,false,
  "switching rooms cannot replay a historical event");
audible=audio({gameKey:"online:ROOMB:1",moveNo:5,
  event:e({move:5,seat:1})}).cursor;
assert.equal(audio({gameKey:"online:ROOMB:1",moveNo:6,
  event:e({move:6,seat:1}),enabled:false}).shouldPlay,false,
  "disabled sound must remain silent");
audible=audio({gameKey:"online:ROOMB:1",moveNo:6,
  event:e({move:6,seat:1}),enabled:false}).cursor;
assert.equal(audio({gameKey:"online:ROOMB:1",moveNo:6,
  event:e({move:6,seat:1}),enabled:true}).shouldPlay,false,
  "enabling sound cannot replay the last move");
assert.equal(audio({gameKey:"online:ROOMB:1",moveNo:7,
  event:e({move:7,seat:1}),visible:false}).shouldPlay,false,
  "hidden tabs cannot emit game sound");
assert.equal(audio({gameKey:"online:ROOMB:1",moveNo:7,
  event:e({move:6,seat:1})}).shouldPlay,false,
  "missing current-event authority must stay silent");
assert.equal(audio({gameKey:"online:ROOMB:1",moveNo:7,
  phase:"over",event:e({move:7,seat:1})}).shouldPlay,true,
  "newly committed final move can trigger the win sound");
assert.equal(audio({gameKey:"online:ROOMB:2",moveNo:0,
  phase:"setup",event:null}).shouldPlay,false,
  "rematch setup cannot emit stale sound");
console.log("PASS STACK Motion Director: physical event contract, counts, Final Duel, SNAP, no stale replay");
