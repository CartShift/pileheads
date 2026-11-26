"use strict";
const assert=require("node:assert/strict");
const E=require("../packages/game-engine");
const {DRILLS,buildDrill}=require("../apps/web/lib/practice-drills.cjs");
for(const {id} of DRILLS){
  const game=buildDrill(E,id);
  assert.equal(game.phase,"play");
  assert.equal(game.people.length,2);
  assert.equal(E.invariant(game),true);
  const before=game.moves;
  const move=id==="snap"?E.followUpOptions(game,0)[0]:
    id==="slam"?E.slamOptions(game,0)[0]:
    E.options(game,0).find(m=>m.type==="counter-dump");
  assert.ok(move,"drill has a real legal move");
  const event=E.move(game,0,move);
  assert.equal(game.moves,before+1);
  assert.equal(event.type,id==="snap"?"followup":id==="slam"?"slam":"counter-dump");
  assert.equal(E.invariant(game),true);
  if(id==="counter"){
    const pass=buildDrill(E,id);
    E.move(pass,0,{type:"counter-pass"});
    assert.equal(pass.pendingCounter,null);
    assert.equal(E.invariant(pass),true);
  }
}
assert.throws(()=>buildDrill(E,"unknown"),/Unknown/);
console.log("PASS isolated special-move drills: SNAP, SLAM, Counter DUMP/pass, card conservation");
