"use strict";
const SOURCES=["instagram","tiktok","youtube","community","creator","player_share"];
const MEDIUMS=["organic_social","community","creator","referral"];
const CAMPAIGNS=["launch","playtest","round_result"];
function attribution(input) {
  const clean=(key,allowed)=>allowed.includes(input?.[key])?input[key]:null;
  return {source:clean("source",SOURCES),medium:clean("medium",MEDIUMS),campaign:clean("campaign",CAMPAIGNS)};
}
function attributionFromSearch(search) {
  const p=new URLSearchParams(search);
  return attribution({source:p.get("utm_source"),medium:p.get("utm_medium"),campaign:p.get("utm_campaign")});
}
function playHref(href,source) {
  const a=attribution(source);
  const p=new URLSearchParams();
  if(a.source)p.set("utm_source",a.source);
  if(a.medium)p.set("utm_medium",a.medium);
  if(a.campaign)p.set("utm_campaign",a.campaign);
  return href==="/play"&&p.size?href+"?"+p.toString():href;
}
module.exports={SOURCES,attribution,attributionFromSearch,playHref};
