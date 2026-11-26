"use strict";
const assert=require("node:assert/strict");

(async function(){
 const {normalizedOrigin,probeOnce,waitForProduction} =
  await import("../scripts/check-render-production.mjs");
 const sha="abc123".repeat(6)+"abcd";
 const ok={ok:true,service:"stack",websocket:true,commit:sha};
 const ready={ok:true,service:"pilehead-rooms"};
 const pages={
   "/livez":JSON.stringify(ok),
   "/readyz":JSON.stringify(ready),
   "/":"<html><script src=\"/_next/static/chunks/main.js\"></script></html>",
   "/play":"<html><script src=\"/_next/static/chunks/main.js\"></script></html>"
 };
 const called=[];
 const fetchImpl=async url=>{
  const route=new URL(url).pathname;called.push(route);
  return {ok:route in pages,status:route in pages?200:404,
    text:async()=>pages[route]||"Not found"};
 };
 assert.equal(normalizedOrigin("https://stack-card-game-t7vx.onrender.com"),
   "https://stack-card-game-t7vx.onrender.com");
 assert.throws(()=>normalizedOrigin("http://example.com"),/HTTPS/);
 assert.throws(()=>normalizedOrigin("https://example.com/other"),/HTTPS/);
 assert.throws(()=>normalizedOrigin("https://user:secret@example.com"),/HTTPS/);
 const result=await probeOnce({origin:"https://stack-card-game-t7vx.onrender.com",
   expectedSha:sha,fetchImpl});
 assert.deepEqual(called,["/livez","/readyz","/","/play"]);
 assert.equal(result.database,true);
 assert.equal(result.commit,sha);
 await assert.rejects(()=>probeOnce({
   expectedSha:"different",fetchImpl
 }),/expected Git SHA/);
 await assert.rejects(()=>probeOnce({
   fetchImpl:async url=>({ok:true,status:200,text:async()=>String(url).endsWith("/readyz")
     ? JSON.stringify({ok:false,service:"pilehead-rooms"}):pages[new URL(url).pathname]})
 }),/not ready/);
 const retries=[];
 let count=0;
 const f=async url=>{
  if (String(url).endsWith("/livez") && ++count<=2)
   return {ok:false,status:503,text:async()=>""};
  return fetchImpl(url);
 };
 const done=await waitForProduction({expectedSha:sha,fetchImpl:f,maxAttempts:3,
   retryMs:0,sleep:async()=>{},log:line=>retries.push(line)});
 assert.equal(done.commit,sha);
 assert.equal(retries.length,3);
 await assert.rejects(()=>waitForProduction({expectedSha:sha,maxAttempts:2,
   retryMs:0,sleep:async()=>{},log:()=>{},
   fetchImpl:async()=>({ok:false,status:503,text:async()=>""})}),/failed after 2 attempts/);
 console.log("PASS Render post-deploy smoke contract: commit, DB readiness, Next homepage and game, retry, no writes");
})().catch(err=>{console.error(err);process.exitCode=1});
