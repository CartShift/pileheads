"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
const {spawn}=require("node:child_process"),{chromium}=require("playwright");
const root=path.resolve(__dirname,".."),port=44295,base="http://127.0.0.1:"+port;
const routes={home:"/stack",play:"/play",classic:"/pilehead/index.html",gallery:"/pilehead/gallery.html",rules:"/pilehead/playtest.html",print:"/pilehead/print.html",lab:"/pilehead/endgame-lab.html"};
const artifacts=path.join(root,"artifacts","design-system");
async function ready(){for(let i=0;i<100;i++){try{if((await fetch(base+"/livez")).ok)return}catch{}await new Promise(r=>setTimeout(r,200))}throw Error("Server not ready")}
(async()=>{
 const server=spawn(process.execPath,["scripts/render-server.cjs"],{cwd:root,env:{...process.env,PORT:String(port)},stdio:"ignore"});let browser;
 try{
  await ready();fs.mkdirSync(artifacts,{recursive:true});
  browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_EXECUTABLE_PATH?{executablePath:process.env.CHROMIUM_EXECUTABLE_PATH}:{})});
  for(const width of [320,390,768,1440]){
   const context=await browser.newContext({viewport:{width,height:width<601?844:900},deviceScaleFactor:1,isMobile:width<601,hasTouch:width<601,reducedMotion:"reduce"});
   const page=await context.newPage();
   for(const [name,route] of Object.entries(routes)){
    const errors=[];const onerror=e=>errors.push(e.message);page.on("pageerror",onerror);
    const result=await page.goto(base+route,{waitUntil:"domcontentloaded"});assert.equal(result.status(),200,route);
    await page.evaluate(()=>document.fonts.ready);
    await page.waitForFunction(()=>[...document.fonts].some(f=>f.family.replace(/["']/g,"")==="STACK Display"&&f.status==="loaded"));
    const state=await page.evaluate(()=>({paper:getComputedStyle(document.documentElement).getPropertyValue("--brand-paper").trim(),logo:[...document.images].find(i=>i.alt==="STACK")?.src,scroll:document.documentElement.scrollWidth,width:innerWidth,css:!!document.querySelector('link[href="/stack-media/stack-design-system.css"]')}));
    assert.equal(state.paper,"#f9ebcb",name);assert.ok(state.css,name+" shared stylesheet");assert.ok(state.logo?.includes("stack-home-logo-web.webp"),name+" brand logo");
    assert.ok(state.scroll<=state.width+1,name+" horizontal overflow "+JSON.stringify(state));
    if(name==="gallery"){assert.equal(await page.locator("#numbers .ph-card").count(),10);assert.equal(await page.locator("#actions .ph-card").count(),6)}
    if(name==="print"){assert.equal(await page.locator(".sheet").count(),12);assert.equal(await page.locator(".sheet:not(.back-sheet) .ph-card").count(),54);await page.getByRole("button",{name:"Hide card backs",exact:true}).click();assert.equal(await page.locator(".back-sheet:visible").count(),0);await page.getByRole("button",{name:"Include card backs",exact:true}).click();assert.equal(await page.locator(".back-sheet:visible").count(),6)}
    if(name==="rules"){await page.locator("#language").click();assert.equal(await page.locator("html").getAttribute("lang"),"he");assert.equal(await page.locator("html").getAttribute("dir"),"rtl");await page.locator("#language").click();assert.equal(await page.locator("html").getAttribute("lang"),"en")}
    await page.screenshot({path:path.join(artifacts,name+"-"+width+".png"),animations:"disabled"});
    assert.deepEqual(errors,[],name+" client errors");page.off("pageerror",onerror);
    console.log("PASS "+name+" "+width+"px, shared design system and page contract");
   }
   await context.close();
  }
 }finally{if(browser)await browser.close();server.kill("SIGTERM")}
})().catch(e=>{console.error(e);process.exitCode=1});
