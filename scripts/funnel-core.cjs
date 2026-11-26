"use strict";

const {attribution}=require("../apps/web/lib/growth-attribution.cjs");
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
const TOKEN=/^[a-f0-9]{64}$/;
const EVENTS={
  play_opened:{column:"play_opened"},
  first_started:{column:"first_started",requires:"play_opened"},
  first_completed:{column:"first_completed",requires:"first_started"},
  rematch_started:{column:"rematch_started",requires:"first_completed"},
  invite_copied:{column:"invite_copied",requires:"play_opened"},
  room_joined:{column:"room_joined",requires:"play_opened"},
  result_shared:{column:"result_shared",requires:"first_completed"}
};
const exact=(b,keys)=>b&&typeof b==="object"&&!Array.isArray(b)&&Object.keys(b).length===keys.length&&keys.every(k=>Object.hasOwn(b,k));
function validate(b){
  if(typeof b?.id!=="string"||!UUID.test(b.id)||typeof b.token!=="string"||!TOKEN.test(b.token))throw Error("invalid_session");
  if(b.action==="funnel_start"){
    if(!exact(b,["action","id","token","entry","attribution","noticeVersion"])||
      !["home","play","invite"].includes(b.entry)||typeof b.noticeVersion!=="string"||
      !/^[a-zA-Z0-9._-]{1,40}$/.test(b.noticeVersion)||!exact(b.attribution,["source","medium","campaign"]))throw Error("invalid_start");
    const a=attribution(b.attribution);
    if(Object.keys(a).some(k=>a[k]!==b.attribution[k]))throw Error("invalid_attribution");
  }else if(b.action==="funnel_event"){
    if(!exact(b,["action","id","token","event","noticeVersion"])||!Object.hasOwn(EVENTS,b.event)||
       typeof b.noticeVersion!=="string"||!/^[a-zA-Z0-9._-]{1,40}$/.test(b.noticeVersion))throw Error("invalid_event");
  }else if(b.action==="funnel_delete"){
    if(!exact(b,["action","id","token"]))throw Error("invalid_delete");
  }else throw Error("invalid_action");
  return b;
}
function metrics(rows){
  const n=key=>rows.reduce((sum,row)=>sum+Number(row[key]===true),0);
  const fraction=(a,b)=>b?a/b:null;
  const home=rows.filter(r=>r.entry==="home"),invite=rows.filter(r=>r.entry==="invite");
  const sessions=rows.length,opened=n("play_opened"),started=n("first_started"),completed=n("first_completed"),rematch=n("rematch_started");
  return {sessions,homeSessions:home.length,homeToPlay:home.filter(r=>r.play_opened===true).length,
    opened,started,completed,rematch,inviteCopied:n("invite_copied"),roomJoined:n("room_joined"),resultShared:n("result_shared"),
    inviteEntrySessions:invite.length,inviteEntryJoined:invite.filter(r=>r.room_joined===true).length,
    startFraction:fraction(started,opened),completionFraction:fraction(completed,started),rematchFraction:fraction(rematch,completed)};
}
function summarize(rows){
  const sources={};
  for(const row of rows){const key=attribution({source:row.source}).source??"unknown";(sources[key]??=[]).push(row);}
  return {all:metrics(rows),sources:Object.fromEntries(Object.entries(sources).map(([k,v])=>[k,metrics(v)]))};
}
module.exports={EVENTS,validate,metrics,summarize};
