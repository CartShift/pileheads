"use strict";
// Lab-only quality baseline. No claim of field Core Web Vitals or a Lighthouse score.
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const {spawn}=require("node:child_process");
const {chromium}=require("playwright");
const ROOT=path.resolve(__dirname,".."), PORT=44294, BASE="http://127.0.0.1:"+PORT;
async function ready(){for(let i=0;i<100;i++){try{if((await fetch(BASE+"/livez")).ok)return}catch{}await new Promise(r=>setTimeout(r,200))}throw Error("Server not ready")}
async function audit(browser, mobile){
 const context=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1440,height:900},deviceScaleFactor:1,isMobile:mobile,hasTouch:mobile,reducedMotion:"reduce"});
 const page=await context.newPage(), requests=[], failures=[];
 page.on("request",r=>requests.push(r.url()));
 page.on("requestfailed",r=>failures.push({url:r.url(),reason:r.failure()?.errorText}));
 await page.addInitScript(()=>{
  window.__stackVitals={lcp:0,cls:0,sessionStart:0,lastShift:0,sessionValue:0};
  new PerformanceObserver(list=>{for(const e of list.getEntries()){window.__stackVitals.lcp=e.startTime;window.__stackVitals.lcpElement={tag:e.element?.tagName||null,url:e.url||null,id:e.element?.id||null}}}).observe({type:"largest-contentful-paint",buffered:true});
  new PerformanceObserver(list=>{const v=window.__stackVitals;for(const e of list.getEntries()){if(e.hadRecentInput)continue;if(e.startTime-v.lastShift>1000||e.startTime-v.sessionStart>5000){v.sessionStart=e.startTime;v.sessionValue=0}v.lastShift=e.startTime;v.sessionValue+=e.value;v.cls=Math.max(v.cls,v.sessionValue)}}).observe({type:"layout-shift",buffered:true});
 });
 if(mobile){const cdp=await context.newCDPSession(page);await cdp.send("Network.enable");await cdp.send("Network.setCacheDisabled",{cacheDisabled:true});await cdp.send("Network.emulateNetworkConditions",{offline:false,latency:100,downloadThroughput:200000,uploadThroughput:93750});await cdp.send("Emulation.setCPUThrottlingRate",{rate:4})}
 try{
  const r=await page.goto(BASE+"/stack",{waitUntil:"networkidle",timeout:60000});assert.equal(r.status(),200);
  await page.evaluate(()=>document.fonts.ready);
  await page.waitForTimeout(800);
  const metrics=await page.evaluate(()=>{const nav=performance.getEntriesByType("navigation")[0],rs=performance.getEntriesByType("resource");return {lcpMs:Math.round(window.__stackVitals.lcp),lcpElement:window.__stackVitals.lcpElement,cls:Number(window.__stackVitals.cls.toFixed(4)),ttfbMs:Math.round(nav.responseStart),transferBytes:nav.transferSize+rs.reduce((n,r)=>n+r.transferSize,0),resourceCount:rs.length,largestResources:rs.map(r=>({name:new URL(r.name).pathname,bytes:r.transferSize,durationMs:Math.round(r.duration)})).sort((a,b)=>b.bytes-a.bytes).slice(0,8),title:document.title,description:document.querySelector('meta[name="description"]')?.content,lang:document.documentElement.lang,missingImageAlt:[...document.images].filter(x=>!x.hasAttribute("alt")).length,emptyLinks:[...document.querySelectorAll("a")].filter(a=>!a.textContent.trim()&&!a.getAttribute("aria-label")&&!a.querySelector('img[alt]:not([alt=""])')).length}});
  assert.ok(metrics.title.includes("STACK")&&metrics.description&&metrics.lang==="en");
  assert.equal(metrics.missingImageAlt,0);assert.equal(metrics.emptyLinks,0);
  assert.ok(metrics.lcpMs>0,"LCP observation available");
  assert.ok(metrics.cls<=.1,"CLS exceeds budget: "+metrics.cls);
  assert.deepEqual(requests.filter(u=>/^https?:/.test(u)&&new URL(u).origin!==BASE),[],"homepage should not require third-party requests");
  await page.keyboard.press("Tab");assert.equal(await page.evaluate(()=>document.activeElement?.textContent.trim()),"Skip to content","skip link first in keyboard order");
  await page.keyboard.press("Enter");assert.equal(new URL(page.url()).hash,"#main-content");assert.equal(await page.evaluate(()=>document.activeElement?.id),"main-content","skip target receives focus");
  return {profile:mobile?"390px, 4x CPU, 1.6Mbps, 100ms latency":"1440px, local unthrottled",...metrics,failedRequests:failures};
 }finally{await context.close()}
}
(async()=>{const server=spawn(process.execPath,["scripts/render-server.cjs"],{cwd:ROOT,env:{...process.env,PORT:String(PORT)},stdio:"ignore"});let browser;try{await ready();browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_EXECUTABLE_PATH?{executablePath:process.env.CHROMIUM_EXECUTABLE_PATH}:{})});const reports=[];for(const mobile of [false,true])reports.push(await audit(browser,mobile));const dir=path.join(ROOT,"artifacts","website");fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(path.join(dir,"quality-baseline.json"),JSON.stringify(reports,null,2));console.log(JSON.stringify(reports,null,2));}finally{if(browser)await browser.close();server.kill("SIGTERM")}})().catch(e=>{console.error(e);process.exitCode=1});
