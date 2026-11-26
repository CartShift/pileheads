export type Attribution = {source:string|null;medium:string|null;campaign:string|null};
const Campaign = require("./growth-attribution.cjs") as {
  attributionFromSearch:(search:string)=>Attribution;
  playHref:(href:string,source:Attribution)=>string;
};
export const campaignFromSearch=Campaign.attributionFromSearch;
export const campaignPlayHref=Campaign.playHref;
export type GrowthStatus={reports:boolean;waitlist:boolean;funnel:boolean;privacyUrl:string|null;noticeVersion:string|null};
export async function growthStatus():Promise<GrowthStatus> {
  const response=await fetch("/api/growth?status=1",{cache:"no-store",credentials:"omit",referrerPolicy:"no-referrer",signal:AbortSignal.timeout(6000)});
  if(!response.ok)throw Error("unavailable");
  const data=await response.json();
  return {reports:data.reports===true,waitlist:data.waitlist===true,funnel:data.funnel===true,privacyUrl:typeof data.privacyUrl==="string"?data.privacyUrl:null,noticeVersion:typeof data.noticeVersion==="string"?data.noticeVersion:null};
}
export async function growthPost(body:object) {
  const response=await fetch("/api/growth",{method:"POST",credentials:"omit",cache:"no-store",referrerPolicy:"no-referrer",headers:{"Content-Type":"application/json"},body:JSON.stringify(body),signal:AbortSignal.timeout(15000)});
  if(!response.ok)throw Error("unavailable");
}
