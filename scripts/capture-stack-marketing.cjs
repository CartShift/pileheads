"use strict";
// Reproducible genuine V2 gameplay marketing asset. No fake UI or private data.
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const {spawn}=require("node:child_process");
const {chromium}=require("playwright");
const ROOT=path.resolve(__dirname,"..");
const PORT=44293,BASE="http://127.0.0.1:"+PORT;
const output=path.resolve(process.env.STACK_MARKETING_CAPTURE||path.join(ROOT,"artifacts/website/gameplay-v2.png"));
const wide=process.env.STACK_MARKETING_WIDE==="1";
async function ready(){for(let i=0;i<100;i++){try{if((await fetch(BASE+"/livez")).ok)return}catch{}await new Promise(r=>setTimeout(r,200))}throw Error("Integrated server did not start")}
(async()=>{
 const server=spawn(process.execPath,["scripts/render-server.cjs"],{cwd:ROOT,env:{...process.env,PORT:String(PORT)},stdio:"ignore"});
 let browser;
 try{
  await ready();
  browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_EXECUTABLE_PATH?{executablePath:process.env.CHROMIUM_EXECUTABLE_PATH}:{})});
  const context=await browser.newContext({viewport:wide?{width:process.env.STACK_MARKETING_DESKTOP==="1"?1440:1024,height:process.env.STACK_MARKETING_DESKTOP==="1"?900:768}:{width:390,height:844},isMobile:!wide,hasTouch:!wide,deviceScaleFactor:1,reducedMotion:"reduce"});
  const page=await context.newPage();
  await context.addInitScript(()=>localStorage.setItem("stack-next-deck-theme-v1","refined"));
  await page.goto(BASE+"/play",{waitUntil:"networkidle"});
  await page.getByRole("button",{name:"Learn with a bot"}).click();
  await page.getByRole("button",{name:"Start round"}).click();
  await page.getByRole("heading",{name:"Your move."}).waitFor({timeout:15000});
  await page.getByRole("combobox",{name:"Deck style"}).selectOption("refined");
  await page.waitForFunction(()=>document.querySelectorAll(".player-hand .playing-card.theme-refined").length===3);
  assert.equal(await page.locator(".player-hand .playing-card.theme-refined").count(),3);
  assert.equal(await page.getByRole("combobox",{name:"Deck style"}).inputValue(),"refined");
  await page.evaluate(async()=>{await document.fonts.ready;await Promise.all([...document.images].map(i=>i.decode().catch(()=>{})))});
  fs.mkdirSync(path.dirname(output),{recursive:true});
  await page.screenshot({path:output,fullPage:true,animations:"disabled"});
  console.log("PASS genuine Illustrated V2 gameplay capture:",output);
  await context.close();
 }finally{if(browser)await browser.close();server.kill("SIGTERM")}
})().catch(e=>{console.error(e);process.exitCode=1});
