"use strict";
const assert=require("node:assert/strict");
const crypto=require("node:crypto");
const {createHandler}=require("../api/growth.js");
const {validateSubmission,emailAddress,summarizeRows,attributionFromSearch}=require("../scripts/growth-core.cjs");
const {playHref}=require("../apps/web/lib/growth-attribution.cjs");
const {createLog,observe,exportReport}=require("../apps/web/lib/playtest-insights-core.cjs");

const reportLog=createLog();
for(const phase of ["setup","play","over"])observe(reportLog,{key:"PRIVATE_ROOM",mode:"online",phase});
const report=exportReport(reportLog,{fun:5,clarity:4,wouldReplay:"yes"});
const attribution=attributionFromSearch("?utm_source=instagram&utm_medium=organic_social&utm_campaign=launch&room=PRIVATE_ROOM&utm_content=private");
assert.deepEqual(attribution,{source:"instagram",medium:"organic_social",campaign:"launch"});
assert.deepEqual(attributionFromSearch("?utm_source=private-email&foo=abc"),{source:null,medium:null,campaign:null});
assert.equal(playHref("/play",attribution),"/play?utm_source=instagram&utm_medium=organic_social&utm_campaign=launch");
assert.equal(playHref("/other",attribution),"/other");
const data={action:"report",id:crypto.randomUUID(),report,attribution,noticeVersion:"v1"};
assert.equal(validateSubmission(data).id,data.id);
assert.throws(()=>validateSubmission({...data,attribution:{...attribution,source:"some-private-id"}}));
assert.throws(()=>validateSubmission({...data,room:"PRIVATE_ROOM"}));
assert.equal(emailAddress("  Test+Deck@Example.com "),"test+deck@example.com");
for(const invalid of ["x","a..b@example.com","a@-example.com","a@example.com\nBcc:x@y.com",null])assert.equal(emailAddress(invalid),null);
assert.equal(summarizeRows([{report,attribution}]).sources.instagram.rounds.online.completed,1);

const env={PILEHEAD_GROWTH_DATABASE_URL:"mock",PILEHEAD_GROWTH_ENABLED:"1",PILEHEAD_WAITLIST_ENABLED:"1",
  PILEHEAD_GROWTH_PRIVACY_URL:"https://pileheads.com/privacy",PILEHEAD_GROWTH_NOTICE_VERSION:"v1",
  PILEHEAD_GROWTH_OPERATOR_TOKEN:"x".repeat(40),RESEND_API_KEY:"fake",PILEHEAD_WAITLIST_FROM:"test@example.com"};
const reports=new Map(),emails=new Map(),sent=[],calls=[];
let cap=false;
const hash=x=>crypto.createHash("sha256").update(x).digest("hex");
async function db(sql,params){
  calls.push(sql);
  if(sql.startsWith("INSERT INTO pileheads_growth_quota"))return cap?[]:[{hits:1}];
  if(sql.startsWith("INSERT INTO pileheads_growth_reports")){
    if(!reports.has(params[0]))reports.set(params[0],{report:JSON.parse(params[1]),attribution:JSON.parse(params[2]),noticeVersion:params[3]});
    return [];
  }
  if(sql.startsWith("SELECT report,attribution"))return [...reports.values()];
  if(sql.startsWith("SELECT count(*)"))return [{confirmed:[...emails.values()].filter(e=>e.confirmed).length,pending:[...emails.values()].filter(e=>!e.confirmed).length}];
  if(sql.startsWith("INSERT INTO pileheads_waitlist")){
    if(emails.has(params[0]))return [];
    emails.set(params[0],{confirm:params[1],unsubscribe:params[2],version:params[3],confirmed:false});
    return [{email:params[0]}];
  }
  if(sql.startsWith("UPDATE pileheads_waitlist")){
    const row=[...emails.values()].find(e=>e.confirm===params[0]&&!e.confirmed);
    if(!row)return [];
    row.confirmed=true;row.confirm=null;return [{confirmed_at:"now"}];
  }
  if(sql.startsWith("DELETE FROM pileheads_waitlist")){
    for(const [email,row] of emails)if(row.unsubscribe===params[0]||row.confirm===params[0]&&!row.confirmed)emails.delete(email);
    return [];
  }
  throw Error("Unexpected query");
}
const mail=async (_env,email,confirm,unsubscribe)=>sent.push({email,confirm,unsubscribe});
async function req(handler,{method="POST",body=data,query={},headers={}}={}){
  let status,value;const responseHeaders={};
  const res={setHeader(k,v){responseHeaders[k]=v;},status(n){status=n;return this;},json(v){value=v;return this;}};
  await handler({method,body,query,headers:{origin:"https://pileheads.com","content-type":"application/json",...headers}},res);
  assert.equal(responseHeaders["Cache-Control"],"no-store");
  return {status,value};
}
async function main(){
  const disabled=createHandler({env:{},db,mail});
  assert.deepEqual((await req(disabled,{method:"GET",query:{status:"1"}})).value,{ok:true,reports:false,waitlist:false,funnel:false,privacyUrl:null,noticeVersion:null});
  assert.equal((await req(disabled)).status,503);
  assert.equal(calls.length,0);
  const noNotice=createHandler({env:{...env,PILEHEAD_GROWTH_PRIVACY_URL:"https://evil.example/privacy"},db,mail});
  assert.equal((await req(noNotice)).status,503);
  assert.equal(calls.length,0);
  const handler=createHandler({env,db,mail});
  assert.equal((await req(handler,{method:"GET",query:{status:"1"}})).value.noticeVersion,"v1");
  assert.equal((await req(handler,{headers:{origin:"https://evil.example"}})).status,403);
  assert.equal((await req(handler,{body:{...data,noticeVersion:"old"}})).status,400);
  assert.equal((await req(handler,{body:{...data,extra:"x".repeat(5000)}})).status,413);
  assert.equal((await req(handler,{method:"GET",query:{summary:"1"}})).status,401);
  assert.equal(calls.length,0);
  assert.equal((await req(handler)).status,202);
  assert.equal((await req(handler)).status,202);
  assert.equal(reports.size,1);
  assert.equal(reports.get(data.id).noticeVersion,"v1");
  cap=true;assert.equal((await req(handler,{body:{...data,id:crypto.randomUUID()}})).status,429);cap=false;
  const signup={action:"waitlist_request",email:"Test@Example.com",consent:true,noticeVersion:"v1"};
  assert.equal((await req(handler,{body:{...signup,consent:false}})).status,400);
  assert.equal((await req(handler,{body:signup})).status,202);
  assert.equal((await req(handler,{body:signup})).status,202);
  assert.equal(sent.length,1);
  const row=emails.get("test@example.com");
  assert.equal(row.confirm,hash(sent[0].confirm));
  assert.equal(row.unsubscribe,hash(sent[0].unsubscribe));
  assert.equal(row.version,"v1");
  assert.equal((await req(handler,{body:{action:"waitlist_confirm",token:"f".repeat(64)}})).status,400);
  assert.equal((await req(handler,{body:{action:"waitlist_confirm",token:sent[0].confirm}})).status,200);
  assert.equal(row.confirmed,true);
  const summary=await req(handler,{method:"GET",query:{summary:"1"},headers:{authorization:"Bearer "+env.PILEHEAD_GROWTH_OPERATOR_TOKEN}});
  assert.equal(summary.status,200);assert.equal(summary.value.waitlist.confirmed,1);
  assert.equal(summary.value.all.rounds.online.completed,1);
  assert.ok(!JSON.stringify(summary.value).includes("test@example.com"));
  const stopped=createHandler({env:{...env,PILEHEAD_WAITLIST_ENABLED:"0"},db,mail});
  assert.equal((await req(stopped,{body:{action:"waitlist_unsubscribe",token:sent[0].unsubscribe}})).status,200);
  assert.equal(emails.size,0);
  console.log("Growth API: disabled gate, validation, attribution, idempotency, operator access, waitlist confirmation and removal passed");
}
main().catch(e=>{console.error(e);process.exitCode=1;});
