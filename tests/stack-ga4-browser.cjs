"use strict";
// Run only against the synthetic CI build. All requests are fulfilled locally
// or blocked; no Google endpoint or production website is contacted.
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const {chromium}=require("playwright");
const root=path.resolve(__dirname,"../vercel-static");
const ORIGIN="https://pileheads.com";
const KEY="pileheads-ga4-consent-v1";
const ID="G-CITEST0001";
(async()=>{
  const browser=await chromium.launch();
  const context=await browser.newContext({serviceWorkers:"block"});
  const requests=[];
  await context.route("**/*",async route=>{
    const url=new URL(route.request().url());
    if(url.hostname==="www.googletagmanager.com"){
      requests.push(url.href);
      return route.fulfill({contentType:"application/javascript",body:"/* intentionally mocked Google tag: no network or data collection */"});
    }
    if(url.origin!==ORIGIN)return route.abort();
    if(url.pathname.startsWith("/api/"))return route.fulfill({status:404,contentType:"application/json",body:"{}"});
    const clean=url.pathname.replace(/^\/+|\/+$/g,"");
    const filename=path.resolve(root,clean||"index.html");
    if(!filename.startsWith(root+path.sep))return route.abort();
    for(const candidate of [filename,filename+".html",path.join(filename,"index.html")]){
      if(fs.existsSync(candidate)&&fs.statSync(candidate).isFile())return route.fulfill({path:candidate});
    }
    return route.fulfill({status:404,body:"not found"});
  });
  const page=await context.newPage();
  const panel=()=>page.getByRole("region",{name:"Analytics privacy"});
  const button=name=>page.getByRole("button",{name,exact:true});
  const events=()=>page.evaluate(()=>Array.from(window.dataLayer||[],entry=>Array.from(entry)));
  try{
    await page.goto(ORIGIN+"/?utm_source=instagram&room=synthetic-private");
    await button("Allow analytics").waitFor();
    assert.equal(requests.length,0,"no Google script before consent");
    assert.equal(await page.evaluate(k=>localStorage.getItem(k),KEY),null);
    await button("Reject analytics").click();
    await button("Analytics preferences").waitFor();
    assert.equal(requests.length,0,"rejection must not load Google");
    await page.reload();
    await button("Analytics preferences").waitFor();
    assert.equal(requests.length,0,"rejection persists on reload");
    await button("Analytics preferences").click();
    await button("Allow analytics").click();
    await page.waitForFunction(()=>Array.from(window.dataLayer||[],v=>Array.from(v)).some(v=>v[0]==="event"&&v[1]==="page_view"));
    await page.waitForFunction(id=>!!document.querySelector('script[src*="'+id+'"]'),ID);
    assert.ok((await events()).some(e=>e[0]==="consent"&&e[1]==="default"&&e[2].analytics_storage==="denied"));
    const pageviews=(await events()).filter(e=>e[0]==="event"&&e[1]==="page_view");
    assert.equal(pageviews.length,1);
    assert.equal(pageviews[0][2].page_location,ORIGIN+"/?utm_source=instagram");
    assert.ok(!(JSON.stringify(await events())).includes("synthetic-private"));
    // Prevent this particular navigation after the capture listener fires;
    // a separate private-page load below verifies the exclusion.
    const cta=page.getByRole("link",{name:"Play free online",exact:true});
    await cta.evaluate(a=>a.addEventListener("click",e=>e.preventDefault(),{once:true}));
    await cta.click();
    assert.ok((await events()).some(e=>e[0]==="event"&&e[1]==="play_cta_click"));
    await page.evaluate(()=>{document.cookie="_ga=synthetic; Path=/";});
    await button("Analytics preferences").click();
    await button("Reject analytics").click();
    assert.equal(await page.evaluate(id=>window["ga-disable-"+id],ID),true);
    assert.equal(await page.evaluate(()=>document.cookie.includes("_ga=")),false);
    assert.equal(await page.evaluate(k=>localStorage.getItem(k),KEY),"denied");
    await button("Analytics preferences").click();
    await button("Allow analytics").click();
    const before=requests.length;
    await page.goto(ORIGIN+"/play?room=synthetic-private");
    await button("Analytics preferences").waitFor();
    assert.equal(await page.evaluate(()=>!!window.gtag),false,"private page must not initialize GA");
    assert.equal(requests.length,before,"private route must not request the tag");
    console.log("PASS GA4 isolated browser: opt-in, reject, reload, URL sanitization, play CTA, withdrawal, private-route exclusion");
  }finally{await context.close();await browser.close();}
})().catch(err=>{console.error(err);process.exitCode=1;});
