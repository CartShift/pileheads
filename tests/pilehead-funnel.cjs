"use strict";
const assert=require("node:assert/strict");
const crypto=require("node:crypto");
const {validate,summarize}=require("../scripts/funnel-core.cjs");
const {funnelAction}=require("../scripts/funnel-server.cjs");
const {createObserver,observe,requestRematch}=require("../apps/web/lib/funnel-observer.cjs");
const o=createObserver(),sample=(phase,key="local:1",scope="local",drill=false)=>observe(o,{key,scope,phase,drill});
assert.deepEqual(sample("play"),[],"resumed play is not an observed start");
assert.deepEqual(sample("over"),[]);
assert.deepEqual(sample("setup","local:2"),[]);
assert.deepEqual(sample("play","local:2"),["first_started"]);
assert.deepEqual(sample("play","local:2"),[]);
assert.deepEqual(sample("over","local:2"),["first_completed"]);
requestRematch(o,"local:2","local");
assert.deepEqual(sample("setup","local:3"),[]);
assert.deepEqual(sample("play","local:3"),["first_started","rematch_started"]);
assert.deepEqual(sample("over","local:3"),["first_completed"]);
requestRematch(o,"local:3","local");
assert.deepEqual(sample("setup","online:4","online:secret"),[]);
assert.deepEqual(sample("play","online:4","online:secret"),["first_started"]);
assert.deepEqual(sample("over","online:4","online:secret"),["first_completed"]);
assert.deepEqual(sample("setup","drill","local",true),[]);
assert.deepEqual(sample("play","drill","local",true),[]);

const id=crypto.randomUUID(),token=crypto.randomBytes(32).toString("hex");
const start={action:"funnel_start",id,token,entry:"home",noticeVersion:"v1",attribution:{source:"instagram",medium:"organic_social",campaign:"launch"}};
assert.equal(validate(start),start);
assert.throws(()=>validate({...start,attribution:{...start.attribution,source:"secret"}}));
assert.throws(()=>validate({...start,room:"PRIVATE_ROOM"}));
const rows=new Map();let cap=false;
async function db(sql,p){
  if(sql.startsWith("SELECT id FROM")){
    const r=rows.get(p[0]);return r&&r.hash===p[1]&&r.version===p[2]&&!r.expired?[{id:p[0]}]:[];
  }
  if(sql.startsWith("INSERT INTO pileheads_funnel_quota"))return cap?[]:[{hits:1}];
  if(sql.startsWith("INSERT INTO pileheads_funnel_sessions")){
    if(rows.has(p[0]))return [];
    rows.set(p[0],{hash:p[1],version:p[2],source:p[3],medium:p[4],campaign:p[5],entry:p[6]});return [{id:p[0]}];
  }
  if(sql.startsWith("UPDATE pileheads_funnel_sessions")){
    const row=rows.get(p[0]),col=/SET ([a-z_]+)=true/.exec(sql)[1],pre=/AND ([a-z_]+)=true/.exec(sql)?.[1];
    if(!row||row.hash!==p[1]||row.version!==p[2]||row.expired||pre&&!row[pre])return [];
    row[col]=true;return [{id:p[0]}];
  }
  if(sql.startsWith("DELETE FROM")){
    if(rows.get(p[0])?.hash===p[1])rows.delete(p[0]);return [];
  }
  throw Error("Unexpected query");
}
const flags={funnel:true,noticeVersion:"v1"};
const event=name=>({action:"funnel_event",id,token,noticeVersion:"v1",event:name});
async function main(){
 assert.equal((await funnelAction(db,{...flags,funnel:false},start)).status,503);
 assert.equal(rows.size,0);
 assert.equal((await funnelAction(db,flags,{...start,noticeVersion:"old"})).status,400);
 assert.equal((await funnelAction(db,flags,start)).status,201);
 assert.equal((await funnelAction(db,flags,start)).status,200);
 assert.equal(rows.size,1);
 assert.notEqual(rows.get(id).hash,token);
 assert.equal((await funnelAction(db,flags,event("first_completed"))).status,409);
 assert.equal((await funnelAction(db,flags,event("play_opened"))).status,200);
 assert.equal((await funnelAction(db,flags,event("first_started"))).status,200);
 assert.equal((await funnelAction(db,flags,event("first_started"))).status,200);
 assert.equal((await funnelAction(db,flags,event("first_completed"))).status,200);
 assert.equal((await funnelAction(db,flags,event("rematch_started"))).status,200);
 assert.equal((await funnelAction(db,flags,{...event("invite_copied"),token:"f".repeat(64)})).status,409);
 assert.equal((await funnelAction(db,flags,event("invite_copied"))).status,200);
 const aggregate=summarize([...rows.values()]);
 assert.equal(aggregate.all.homeToPlay,1);
 assert.equal(aggregate.all.started,1);
 assert.equal(aggregate.all.completed,1);
 assert.equal(aggregate.all.rematchFraction,1);
 assert.equal(aggregate.sources.instagram.sessions,1);
 assert.equal(aggregate.campaigns.launch.completed,1);
 assert.ok(!JSON.stringify(aggregate).includes(token));
 assert.equal(summarize([]).all.completionFraction,null);
 cap=true;assert.equal((await funnelAction(db,flags,{...start,id:crypto.randomUUID()})).status,429);
 rows.get(id).expired=true;
 assert.equal((await funnelAction(db,flags,event("result_shared"))).status,409);
 assert.equal((await funnelAction(db,{...flags,funnel:false},{action:"funnel_delete",id,token})).status,200);
 assert.equal(rows.size,0);
 console.log("Session funnel: observed transitions, consent, idempotency, prerequisites, expiry and removal passed");
}
main().catch(e=>{console.error(e);process.exitCode=1;});
