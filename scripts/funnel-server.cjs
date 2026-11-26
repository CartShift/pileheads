"use strict";
const crypto=require("node:crypto");
const {EVENTS,validate,summarize}=require("./funnel-core.cjs");
const hash=s=>crypto.createHash("sha256").update(s).digest("hex");
async function funnelAction(db,flags,b) {
  let data;
  try{data=validate(b);}catch{return {status:400,body:{ok:false,error:"invalid_funnel"}};}
  const {id,token}=data,key=hash(token);
  if(data.action==="funnel_delete"){
    await db("DELETE FROM pileheads_funnel_sessions WHERE id=$1 AND token_hash=$2",[id,key]);
    return {status:200,body:{ok:true}};
  }
  if(!flags.funnel)return {status:503,body:{ok:false,error:"disabled"}};
  if(data.noticeVersion!==flags.noticeVersion)return {status:400,body:{ok:false,error:"notice_changed"}};
  if(data.action==="funnel_start"){
    // Idempotent retry with the same token; no reactivation after expiry.
    const exists=await db("SELECT id FROM pileheads_funnel_sessions WHERE id=$1 AND token_hash=$2 AND notice_version=$3 AND expires_at>now()",[id,key,data.noticeVersion]);
    if(exists.length)return {status:200,body:{ok:true}};
    const quota=await db("INSERT INTO pileheads_funnel_quota(day,hits) VALUES(current_date,1) ON CONFLICT(day) DO UPDATE SET hits=pileheads_funnel_quota.hits+1 WHERE pileheads_funnel_quota.hits<300 RETURNING hits",[]);
    if(!quota.length)return {status:429,body:{ok:false,error:"try_later"}};
    const inserted=await db("INSERT INTO pileheads_funnel_sessions(id,token_hash,notice_version,source,medium,campaign,entry) VALUES($1,$2,$3,$4,$5,$6,$7) ON CONFLICT(id) DO NOTHING RETURNING id",[id,key,data.noticeVersion,data.attribution.source,data.attribution.medium,data.attribution.campaign,data.entry]);
    if(inserted.length)return {status:201,body:{ok:true}};
    const retry=await db("SELECT id FROM pileheads_funnel_sessions WHERE id=$1 AND token_hash=$2 AND notice_version=$3 AND expires_at>now()",[id,key,data.noticeVersion]);
    return retry.length?{status:200,body:{ok:true}}:{status:409,body:{ok:false,error:"invalid_session"}};
  }
  const e=EVENTS[data.event]; // only fixed column names, never request text
  const rows=await db("UPDATE pileheads_funnel_sessions SET "+e.column+"=true WHERE id=$1 AND token_hash=$2 AND notice_version=$3 AND expires_at>now()"+(e.requires?" AND "+e.requires+"=true":"")+" RETURNING id",[id,key,data.noticeVersion]);
  return rows.length?{status:200,body:{ok:true}}:{status:409,body:{ok:false,error:"session_or_order"}};
}
async function funnelSummary(db){
  const rows=await db("SELECT source,medium,campaign,entry,play_opened,first_started,first_completed,rematch_started,invite_copied,room_joined,result_shared FROM pileheads_funnel_sessions WHERE created_at>=now()-interval '30 days' ORDER BY created_at DESC LIMIT 10001",[]);
  if(rows.length>10000)throw Error("funnel_limit");
  return summarize(rows);
}
module.exports={funnelAction,funnelSummary};
