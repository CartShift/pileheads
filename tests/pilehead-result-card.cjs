"use strict";
const assert=require("node:assert/strict");
const {resultCard}=require("../apps/web/lib/result-card-core.cjs");
for(const kind of ["first","escaped","loss"]){
 const data=resultCard({phase:"over",kind,players:4,moves:23,name:"SECRET",room:"PRIVATE",seed:123});
 assert.equal(data.kind,kind);assert.equal(data.players,4);assert.equal(data.moves,23);
 assert.deepEqual(Object.keys(data).sort(),["headline","kind","moves","players"]);
 assert.ok(!JSON.stringify(data).includes("SECRET"));assert.ok(!JSON.stringify(data).includes("PRIVATE"));
}
for(const input of [{phase:"play",kind:"first",players:2,moves:1},{phase:"over",kind:"neutral",players:2,moves:1},{phase:"over",kind:"loss",players:2,moves:1,drill:true},{phase:"over",kind:"first",players:6,moves:1},{phase:"over",kind:"first",players:3,moves:-1}])assert.equal(resultCard(input),null);
console.log("Result card: allowlisted outcomes and real metrics passed");
