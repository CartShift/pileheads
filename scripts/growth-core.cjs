"use strict";

const {validateReport,aggregateReports}=require("./playtest-report-aggregate.cjs");
const SOURCES=["instagram","tiktok","youtube","community","creator","player_share"];
const MEDIUMS=["organic_social","community","creator","referral"];
const CAMPAIGNS=["launch","playtest","round_result"];
const exact=(v,ks)=>v&&typeof v==="object"&&!Array.isArray(v)&&Object.keys(v).length===ks.length&&ks.every(k=>Object.hasOwn(v,k));
function attribution(input) {
  const clean=(key,allowed)=>allowed.includes(input?.[key])?input[key]:null;
  return {source:clean("source",SOURCES),medium:clean("medium",MEDIUMS),campaign:clean("campaign",CAMPAIGNS)};
}
function attributionFromSearch(search) {
  const p=new URLSearchParams(search);
  return attribution({source:p.get("utm_source"),medium:p.get("utm_medium"),campaign:p.get("utm_campaign")});
}
function validateSubmission(b) {
  if(!exact(b,["action","id","report","attribution"])||b.action!=="report"||
     typeof b.id!=="string"||!/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(b.id)||
     !exact(b.attribution,["source","medium","campaign"])) throw Error("invalid_report");
  const clean=attribution(b.attribution);
  if(Object.keys(clean).some(k=>clean[k]!==b.attribution[k])) throw Error("invalid_attribution");
  validateReport(b.report);
  return {id:b.id.toLowerCase(),report:b.report,attribution:clean};
}
function emailAddress(value) {
  if(typeof value!=="string") return null;
  const email=value.trim().toLowerCase();
  if(email.length>254||!/^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9-]+(?:\.[a-z0-9-]+)+$/i.test(email))return null;
  const [local,domain]=email.split("@");
  if(local.length>64||local.startsWith(".")||local.endsWith(".")||local.includes("..")||
     domain.split(".").some(p=>p.length>63||p.startsWith("-")||p.endsWith("-")))return null;
  return email;
}
function summarizeRows(rows) {
  const all=aggregateReports(rows.map(r=>r.report));
  const sources={};
  for(const source of [...SOURCES,"unknown"]) {
    const selected=rows.filter(r=>(attribution(r.attribution).source??"unknown")===source);
    if(selected.length) sources[source]=aggregateReports(selected.map(r=>r.report));
  }
  return {all,sources};
}
module.exports={attribution,attributionFromSearch,validateSubmission,emailAddress,summarizeRows};
