"use strict";
// Run against an integrated build (npm run build) using the same Playwright
// installation as tests/stack-next-browser.cjs. Does not touch the room API.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { spawn } = require("node:child_process");
const { chromium } = require("playwright");
const ROOT = path.resolve(__dirname, "..");
const PORT = 44292;
const BASE = "http://127.0.0.1:" + PORT;
const ARTIFACTS = path.resolve(process.env.STACK_HOMEPAGE_ARTIFACTS || path.join(ROOT,"artifacts","website"));
const assets = ["faces-v2","box-v2","back-v2","logo-v2","explorer-v2","gameplay-v2","gameplay-wide-v2","gameplay-desktop-v2","sunset","box-side-v2","box-top-v2","burn-beach"].map(x=>"/stack-media/stack-home-"+x+".webp");
async function waitReady(){
  for(let i=0;i<100;i++){try{if((await fetch(BASE+"/livez")).ok)return}catch{} await new Promise(r=>setTimeout(r,200))}
  throw Error("Integrated server did not become ready");
}
async function check(browser,width,height){
  const context = await browser.newContext({viewport:{width,height},deviceScaleFactor:1,isMobile:width<=600,hasTouch:width<=600,reducedMotion:"reduce"});
  const page=await context.newPage();const errors=[];page.on("pageerror",e=>errors.push(e.message));
  try{
    const response=await page.goto(BASE+"/stack",{waitUntil:"networkidle"});assert.equal(response.status(),200);
    await page.getByTestId("official-home").waitFor();
    assert.equal(await page.locator("h1").count(),1);
    assert.match(await page.locator("h1").innerText(),/STACK\s*THE ODDS\./);
    for(const selector of ["#main-content","#the-deck","#how-to-play","#physical","footer"]) assert.equal(await page.locator(selector).count(),1,selector);
    for(const asset of assets){const r=await page.request.get(BASE+asset);assert.equal(r.status(),200,asset);assert.equal((await r.body()).subarray(8,12).toString(),"WEBP",asset)}
    await page.evaluate(async()=>{await document.fonts.ready;for(const im of document.images){im.loading="eager";await im.decode()}});
    assert.ok(await page.evaluate(()=>[...document.fonts].some(f=>f.family.replace(/["\']/g,"")==="STACK Display" && f.status==="loaded")), "locally hosted display font really loads");
    const font=await page.request.get(BASE+"/stack-media/barlow-condensed-black-italic.ttf");assert.equal(font.status(),200);assert.match(font.headers()["content-type"],/font\/ttf/);
    const titleBox=await page.locator("#home-heading").evaluate(el=>{const r=document.createRange();r.selectNodeContents(el);const b=r.getBoundingClientRect();return {left:b.left,right:b.right,viewport:innerWidth}});
    assert.ok(titleBox.left>=-1&&titleBox.right<=titleBox.viewport+1,"headline cannot be clipped by page overflow: "+JSON.stringify(titleBox));
    const gamePreview=page.locator('img[alt^="Actual STACK browser game"]');
    assert.ok((await gamePreview.evaluate(el=>el.currentSrc)).endsWith(width>850?"stack-home-gameplay-desktop-v2.webp":width>600?"stack-home-gameplay-wide-v2.webp":"stack-home-gameplay-v2.webp"),"the device uses its genuine responsive V2 capture");
    const layout=await page.evaluate(()=>({
      documentWidth:document.documentElement.scrollWidth, viewport:innerWidth,
      broken:[...document.images].filter(x=>!x.complete||x.naturalWidth===0).map(x=>x.src),
      buttons:[...document.querySelectorAll("a")].filter(x=>x.getBoundingClientRect().width===0).map(x=>x.textContent)
    }));
    assert.ok(layout.documentWidth<=layout.viewport+1,JSON.stringify(layout));
    assert.deepEqual(layout.broken,[]);
    assert.deepEqual(layout.buttons,[]);
    const cta=page.getByRole("link",{name:"Play free online",exact:true});
    assert.equal(await cta.getAttribute("href"),"/play");
    const rect=await cta.boundingBox();assert.ok(rect&&rect.height>=44&&rect.x>=-1&&rect.x+rect.width<=width+1,"primary CTA must fit and be touch-friendly");
    for(const href of ["/play","/pilehead/gallery.html","/pilehead/playtest.html","/pilehead/index.html"]){assert.ok(await page.locator('a[href="'+href+'"]').count(),href);assert.equal((await page.request.get(BASE+href)).status(),200,href)}
    await page.screenshot({path:path.join(ARTIFACTS,"homepage-"+width+".png"),fullPage:true,animations:"disabled"});
    await page.getByRole("navigation",{name:"Main navigation"}).getByRole("link",{name:"The deck"}).click();
    assert.equal(new URL(page.url()).hash,"#the-deck");
    await page.getByRole("link",{name:"Explore the full deck"}).click();
    await page.waitForURL("**/pilehead/gallery.html");
    await page.goto(BASE+"/stack");
    await page.getByRole("link",{name:"Play free online",exact:true}).click();
    await page.waitForURL("**/play");
    assert.deepEqual(errors,[],"client errors");
    console.log("PASS official homepage "+width+"px: layout, media, links, game navigation");
  }finally{await context.close()}
}
(async()=>{
  fs.mkdirSync(ARTIFACTS,{recursive:true});
  const server=spawn(process.execPath,["scripts/render-server.cjs"],{cwd:ROOT,env:{...process.env,PORT:String(PORT)},stdio:"ignore"});
  let browser;
  try{await waitReady();browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_EXECUTABLE_PATH?{executablePath:process.env.CHROMIUM_EXECUTABLE_PATH}:{})});for(const [w,h] of [[320,740],[390,844],[768,1024],[1440,900]])await check(browser,w,h)}
  finally{if(browser)await browser.close();server.kill("SIGTERM")}
})().catch(e=>{console.error(e);process.exitCode=1});
