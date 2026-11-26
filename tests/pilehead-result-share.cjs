"use strict";
const assert=require("node:assert/strict");
const {resultShare,PUBLIC_PLAY_URL}=require("../apps/web/lib/result-share-core.cjs");
for(const kind of ["first","escaped","loss"]){
 const payload=resultShare({phase:"over",kind,players:3,room:"PRIVATE_ROOM",seed:"secret",name:"private_name",url:"https://evil.example"});
 assert.equal(payload.title,"PILEHEADS");assert.equal(payload.url,PUBLIC_PLAY_URL);
 assert.ok(!/PRIVATE_ROOM|secret|private_name|evil/.test(JSON.stringify(payload)));
 assert.deepEqual(Object.keys(payload).sort(),["text","title","url"]);
}
const url=new URL(PUBLIC_PLAY_URL);
assert.equal(url.origin,"https://pileheads.com");assert.equal(url.pathname,"/play");
assert.equal(url.searchParams.get("utm_campaign"),"round_result");
for(const sample of [{phase:"play",kind:"first",players:2},{phase:"over",kind:"neutral",players:2},{phase:"over",kind:"loss",players:2,drill:true},{phase:"over",kind:"first",players:6}])assert.equal(resultShare(sample),null);
console.log("Result sharing privacy and outcome contract: passed");
