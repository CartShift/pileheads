"use strict";

const crypto=require("node:crypto");
const {validateSubmission,emailAddress,summarizeRows}=require("../scripts/growth-core.cjs");
const hex=()=>crypto.randomBytes(32).toString("hex");
const digest=value=>crypto.createHash("sha256").update(value).digest("hex");
const token=value=>typeof value==="string"&&/^[a-f0-9]{64}$/.test(value);
let sql, databaseUrl;
async function query(text,params) {
  const url=process.env.PILEHEAD_GROWTH_DATABASE_URL;
  if(!sql||databaseUrl!==url){sql=require("@neondatabase/serverless").neon(url);databaseUrl=url;}
  return sql.query(text,params);
}
function configured(env) {
  const ready=!!env.PILEHEAD_GROWTH_DATABASE_URL;
  const origin=env.PILEHEAD_GROWTH_ORIGIN||"https://pileheads.com";
  let privacyUrl=null;
  try { const u=new URL(env.PILEHEAD_GROWTH_PRIVACY_URL); if(u.protocol==="https:"&&u.origin===origin&&u.pathname!=="/"&&!u.search&&!u.hash&&!u.username&&!u.password)privacyUrl=u.href; } catch {}
  const noticeVersion=/^[a-zA-Z0-9._-]{1,40}$/.test(env.PILEHEAD_GROWTH_NOTICE_VERSION||"")?env.PILEHEAD_GROWTH_NOTICE_VERSION:null;
  const approved=ready&&!!privacyUrl&&!!noticeVersion;
  const reports=approved&&env.PILEHEAD_GROWTH_ENABLED==="1";
  const waitlist=approved&&env.PILEHEAD_WAITLIST_ENABLED==="1"&&!!env.RESEND_API_KEY&&!!env.PILEHEAD_WAITLIST_FROM;
  const operator=ready&&!!env.PILEHEAD_GROWTH_OPERATOR_TOKEN&&env.PILEHEAD_GROWTH_OPERATOR_TOKEN.length>=32;
  return {reports,waitlist,operator,privacyUrl:reports||waitlist?privacyUrl:null,noticeVersion:reports||waitlist?noticeVersion:null};
}
function authorized(header,secret) {
  if(typeof header!=="string"||typeof secret!=="string"||secret.length<32)return false;
  return crypto.timingSafeEqual(Buffer.from(digest(header)),Buffer.from(digest("Bearer "+secret)));
}
async function sendEmail(env,email,confirm,unsubscribe) {
  const base=env.PILEHEAD_GROWTH_ORIGIN||"https://pileheads.com";
  const response=await fetch("https://api.resend.com/emails",{
    method:"POST",signal:AbortSignal.timeout(8000),
    headers:{Authorization:"Bearer "+env.RESEND_API_KEY,"Content-Type":"application/json"},
    body:JSON.stringify({from:env.PILEHEAD_WAITLIST_FROM,to:[email],subject:"Confirm your PILEHEADS deck updates",
      text:"You requested an update about the physical PILEHEADS deck. Confirm only if you want to receive it:\n"+base+"/deck-updates#confirm="+confirm+
      "\n\nDidn't request this? Ignore this email or remove the request:\n"+base+"/deck-updates#unsubscribe="+unsubscribe})
  });
  if(!response.ok)throw Error("mail_failed");
}
function createHandler({env=process.env,db=query,mail=sendEmail}={}) {
  async function quota(kind,limit) {
    const rows=await db("INSERT INTO pileheads_growth_quota(day,kind,hits) VALUES(current_date,$1,1) ON CONFLICT(day,kind) DO UPDATE SET hits=pileheads_growth_quota.hits+1 WHERE pileheads_growth_quota.hits<$2 RETURNING hits",[kind,limit]);
    return rows.length>0;
  }
  return async function handler(req,res) {
    res.setHeader("Content-Type","application/json; charset=utf-8");
    res.setHeader("Cache-Control","no-store");
    res.setHeader("X-Content-Type-Options","nosniff");
    const send=(status,value)=>res.status(status).json(value);
    const flags=configured(env);
    const origin=env.PILEHEAD_GROWTH_ORIGIN||"https://pileheads.com";
    try {
      if(req.method==="GET"&&req.query?.status==="1")return send(200,{ok:true,reports:flags.reports,waitlist:flags.waitlist,privacyUrl:flags.privacyUrl,noticeVersion:flags.noticeVersion});
      if(req.method==="GET"&&req.query?.summary==="1"){
        if(!flags.operator||!authorized(req.headers.authorization,env.PILEHEAD_GROWTH_OPERATOR_TOKEN))return send(401,{ok:false,error:"unauthorized"});
        const rows=await db("SELECT report,attribution FROM pileheads_growth_reports WHERE created_at>=now()-interval '30 days' ORDER BY created_at DESC LIMIT 10001",[]);
        if(rows.length>10000)return send(503,{ok:false,error:"report_limit"});
        const counts=await db("SELECT count(*) FILTER(WHERE confirmed_at IS NOT NULL)::integer AS confirmed,count(*) FILTER(WHERE confirmed_at IS NULL AND expires_at>now())::integer AS pending FROM pileheads_waitlist",[]);
        return send(200,{ok:true,windowDays:30,...summarizeRows(rows),waitlist:{confirmed:Number(counts[0]?.confirmed||0),pending:Number(counts[0]?.pending||0)}});
      }
      if(req.method!=="POST"){res.setHeader("Allow","GET, POST");return send(405,{ok:false,error:"method"});}
      if(req.headers.origin!==origin)return send(403,{ok:false,error:"origin"});
      if(!String(req.headers["content-type"]||"").startsWith("application/json"))return send(415,{ok:false,error:"json_required"});
      if(Number(req.headers["content-length"]||0)>4096)return send(413,{ok:false,error:"too_large"});
      let b;
      try{
        const raw=typeof req.body==="string"?req.body:JSON.stringify(req.body);
        if(!raw||Buffer.byteLength(raw)>4096)return send(413,{ok:false,error:"too_large"});
        b=JSON.parse(raw);
      }catch{return send(400,{ok:false,error:"invalid_json"});}
      if(b?.action==="report"){
        if(!flags.reports)return send(503,{ok:false,error:"disabled"});
        let data;try{if(b.noticeVersion!==flags.noticeVersion)throw Error("notice_changed");data=validateSubmission(b);}catch{return send(400,{ok:false,error:"invalid_report"});}
        if(!(await quota("report",300)))return send(429,{ok:false,error:"try_later"});
        await db("INSERT INTO pileheads_growth_reports(id,report,attribution,notice_version) VALUES($1,$2::jsonb,$3::jsonb,$4) ON CONFLICT(id) DO NOTHING",[data.id,JSON.stringify(data.report),JSON.stringify(data.attribution),flags.noticeVersion]);
        return send(202,{ok:true});
      }
      if(b?.action==="waitlist_request"){
        if(!flags.waitlist)return send(503,{ok:false,error:"disabled"});
        const email=emailAddress(b.email);
        if(Object.keys(b).sort().join(",")!=="action,consent,email,noticeVersion"||!email||b.consent!==true||b.noticeVersion!==flags.noticeVersion)return send(400,{ok:false,error:"invalid_request"});
        if(!(await quota("waitlist",50)))return send(429,{ok:false,error:"try_later"});
        const confirm=hex(),unsubscribe=hex(),hash=digest(confirm);
        const rows=await db("INSERT INTO pileheads_waitlist(email,confirm_hash,unsubscribe_hash,expires_at,notice_version) VALUES($1,$2,$3,now()+interval '24 hours',$4) ON CONFLICT(email) DO UPDATE SET confirm_hash=excluded.confirm_hash,unsubscribe_hash=excluded.unsubscribe_hash,requested_at=now(),expires_at=excluded.expires_at,notice_version=excluded.notice_version WHERE pileheads_waitlist.confirmed_at IS NULL AND pileheads_waitlist.requested_at<now()-interval '15 minutes' RETURNING email",[email,hash,digest(unsubscribe),flags.noticeVersion]);
        if(rows.length)try{await mail(env,email,confirm,unsubscribe);}catch{
          await db("DELETE FROM pileheads_waitlist WHERE confirm_hash=$1 AND confirmed_at IS NULL",[hash]);
          console.warn("PILEHEADS waitlist confirmation delivery failed");
        }
        // Identical response for existing addresses, pending requests and send failures.
        return send(202,{ok:true});
      }
      if(b?.action==="waitlist_confirm"||b?.action==="waitlist_unsubscribe"){
        // Removal remains available after new registrations are switched off.
        if(!env.PILEHEAD_GROWTH_DATABASE_URL)return send(503,{ok:false,error:"disabled"});
        if(Object.keys(b).sort().join(",")!=="action,token"||!token(b.token))return send(400,{ok:false,error:"invalid_token"});
        if(b.action==="waitlist_confirm"){
          const rows=await db("UPDATE pileheads_waitlist SET confirmed_at=now(),confirm_hash=NULL WHERE confirm_hash=$1 AND confirmed_at IS NULL AND expires_at>now() RETURNING confirmed_at",[digest(b.token)]);
          return rows.length?send(200,{ok:true}):send(400,{ok:false,error:"invalid_or_expired"});
        }
        await db("DELETE FROM pileheads_waitlist WHERE unsubscribe_hash=$1",[digest(b.token)]);
        return send(200,{ok:true});
      }
      return send(400,{ok:false,error:"unknown_action"});
    }catch{
      // Never print driver errors: they can contain emails or SQL parameters.
      console.warn("PILEHEADS growth request failed");
      return send(503,{ok:false,error:"unavailable"});
    }
  };
}
module.exports=createHandler();
module.exports.createHandler=createHandler;
