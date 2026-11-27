"use strict";
// Lab measurements, not real-user Core Web Vitals. No analytics, production
// traffic, secrets, or paid performance provider. Always archive raw results.
const assert=require("node:assert/strict");
const fs=require("node:fs"),path=require("node:path");
const {spawn}=require("node:child_process");
const {chromium}=require("playwright");
const ROOT=path.resolve(__dirname,".."),BASE="http://127.0.0.1:44294";
const out=path.join(ROOT,"artifacts/next/launch-performance.json");
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function ready(){for(let i=0;i<100;i++){try{if((await fetch(BASE+"/livez")).ok)return}catch{}await sleep(200)}throw Error("integrated server unavailable")}
async function measure(browser,route,profile){
 const context=await browser.newContext({viewport:profile.mobile?{width:390,height:844}:{width:1440,height:900},isMobile:profile.mobile,hasTouch:profile.mobile,deviceScaleFactor:1,reducedMotion:"reduce"});
 try{
  const page=await context.newPage(),external=new Set(),errors=[];
  page.on("request",r=>{if(/^https?:/.test(r.url())&&new URL(r.url()).origin!==BASE)external.add(new URL(r.url()).origin)});
  page.on("pageerror",e=>errors.push(e.message));
  await page.addInitScript(()=>{
   const metrics={lcp:null,cls:0,lcpObserved:false,clsObserved:false};
   window.__launchMetrics=metrics;
   try{new PerformanceObserver(list=>{for(const entry of list.getEntries()){metrics.lcp=Math.round(entry.startTime);metrics.lcpObserved=true}}).observe({type:"largest-contentful-paint",buffered:true})}catch{}
   try{new PerformanceObserver(list=>{for(const entry of list.getEntries()){if(!entry.hadRecentInput)metrics.cls+=entry.value;metrics.clsObserved=true}}).observe({type:"layout-shift",buffered:true})}catch{}
  });
  if(profile.mobile){
   const cdp=await context.newCDPSession(page);
   await cdp.send("Network.enable");
   await cdp.send("Network.emulateNetworkConditions",{offline:false,latency:100,downloadThroughput:200000,uploadThroughput:93750,connectionType:"cellular4g"});
   await cdp.send("Emulation.setCPUThrottlingRate",{rate:4});
  }
  const response=await page.goto(BASE+route,{waitUntil:"load",timeout:60000});
  assert.equal(response.status(),200);
  await page.evaluate(()=>document.fonts.ready);
  await page.waitForTimeout(1000);
  const measured=await page.evaluate(()=>{
   const nav=performance.getEntriesByType("navigation")[0],resources=performance.getEntriesByType("resource");
   const sum=(list,field)=>list.reduce((total,x)=>total+(x[field]||0),0);
   const js=resources.filter(x=>x.initiatorType==="script"||/\.js(?:\?|$)/.test(x.name));
   const metrics=window.__launchMetrics;
   return {lcpMs:metrics.lcp,cls:Math.round(metrics.cls*10000)/10000,lcpObserved:metrics.lcpObserved,clsObserved:metrics.clsObserved,
    ttfbMs:Math.round(nav.responseStart),domContentLoadedMs:Math.round(nav.domContentLoadedEventEnd),loadMs:Math.round(nav.loadEventEnd),
    encodedBytes:nav.encodedBodySize+sum(resources,"encodedBodySize"),transferBytes:nav.transferSize+sum(resources,"transferSize"),javascriptEncodedBytes:sum(js,"encodedBodySize"),requests:resources.length+1,
    horizontalOverflow:document.documentElement.scrollWidth>innerWidth+2};
  });
  assert.equal(measured.horizontalOverflow,false,route+" must fit viewport");
  assert.deepEqual(errors,[],route+" must not have client errors");
  assert.deepEqual([...external],[],route+" must not send pre-consent requests to third parties");
  return {route,profile:profile.name,...measured,externalOrigins:[...external],errors};
 }finally{await context.close()}
}
(async()=>{
 fs.mkdirSync(path.dirname(out),{recursive:true});
 const server=spawn(process.execPath,["scripts/render-server.cjs"],{cwd:ROOT,env:{...process.env,PORT:"44294"},stdio:"ignore"});
 let browser;const rows=[];
 try{
  await ready();browser=await chromium.launch({headless:true});
  for(const profile of [{name:"desktop-local",mobile:false},{name:"mobile-1.6Mbps-100ms-4xCPU",mobile:true}]){
   for(const route of ["/","/play","/how-to-play","/deck"]){
    const row=await measure(browser,route,profile);rows.push(row);console.log("LAUNCH PERF "+JSON.stringify(row));
   }
  }
 }finally{
  fs.writeFileSync(out,JSON.stringify({kind:"synthetic lab baseline; not field CWV or production network",browser:"Chromium",lcpTargetMs:2500,clsTarget:.1,inp:"not measured",rows},null,2)+"\n");
  if(browser)await browser.close();server.kill("SIGTERM");
 }
})().catch(error=>{console.error(error);process.exitCode=1});
