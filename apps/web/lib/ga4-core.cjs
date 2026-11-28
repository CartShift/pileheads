"use strict";
const {attributionFromSearch}=require("./growth-attribution.cjs");
const PAGES=Object.freeze({"/":"Home","/deck":"Deck","/deck-updates":"Deck updates","/how-to-play":"How to play"});
function pageFor(pathname,search=""){
  const path=pathname.replace(/\/+$/,"")||"/";
  if(!Object.prototype.hasOwnProperty.call(PAGES,path))return null;
  const a=attributionFromSearch(search),params=new URLSearchParams();
  if(a.source)params.set("utm_source",a.source);
  if(a.medium)params.set("utm_medium",a.medium);
  if(a.campaign)params.set("utm_campaign",a.campaign);
  return {page_title:PAGES[path],page_location:"https://pileheads.com"+path+(params.size?"?"+params.toString():"")};
}
function safeReferrer(value){
  try{const u=new URL(value);return ["https:","http:"].includes(u.protocol)?u.origin+"/":"";}catch{return "";}
}
function isProductionHost(host){return host==="pileheads.com"||host==="www.pileheads.com";}
function isMeasurementId(id){return /^G-[A-Z0-9]+$/.test(id||"");}
function isPrivacyUrl(value){
  try{const u=new URL(value);return u.protocol==="https:"&&!u.username&&!u.password&&!u.search&&!u.hash;}catch{return false;}
}
module.exports={pageFor,safeReferrer,isProductionHost,isMeasurementId,isPrivacyUrl};
