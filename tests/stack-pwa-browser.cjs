"use strict";
// Production-export PWA acceptance, no live database or account required.
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const {spawn}=require("node:child_process");
const {once}=require("node:events");
const {chromium}=require("playwright");
const ROOT=path.resolve(__dirname,"..");
const PORT=44307,BASE="http://127.0.0.1:"+PORT;
async function waitReady(){
  for(let i=0;i<100;i++){try{if((await fetch(BASE+"/livez")).ok)return;}catch{}await new Promise(r=>setTimeout(r,200));}
  throw Error("PWA test server did not start");
}
(async()=>{
  assert.match(fs.readFileSync(path.join(ROOT,"vercel-static/play.html"),"utf8"),/data-pwa-enabled="true"/,"PWA browser acceptance requires a flagged integrated export");
  const startServer=()=>spawn(process.execPath,["scripts/render-server.cjs"],{cwd:ROOT,env:{...process.env,PORT:String(PORT)},stdio:"ignore"});
  let server=startServer();
  async function stopServer(){if(server.exitCode!==null||server.signalCode!==null)return;const exited=once(server,"exit");server.kill("SIGKILL");await exited;}
  let browser;
  try{
    await waitReady();
    browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_EXECUTABLE_PATH?{executablePath:process.env.CHROMIUM_EXECUTABLE_PATH}:{})});
    const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,serviceWorkers:"allow"});
    try{
      const page=await context.newPage();
      await page.goto(BASE+"/");
      await page.waitForFunction(()=>navigator.serviceWorker.getRegistration("/").then(r=>!!r?.active));
      assert.equal(await page.locator('link[rel="manifest"]').getAttribute("href"),"/manifest.webmanifest");
      const manifestRes=await page.request.get(BASE+"/manifest.webmanifest");
      assert.match(manifestRes.headers()["content-type"],/application\/manifest\+json/);
      assert.match(manifestRes.headers()["cache-control"],/no-cache/);
      const manifest=await manifestRes.json();
      for(const icon of [...manifest.icons,{src:"/pwa/apple-touch-icon.png",sizes:"180x180"}]){
        const response=await page.request.get(BASE+icon.src);
        assert.equal(response.status(),200,icon.src);
        const png=await response.body(),[width,height]=icon.sizes.split("x").map(Number);
        assert.equal(png.subarray(1,4).toString(),"PNG");
        assert.equal(png.readUInt32BE(16),width,icon.src);
        assert.equal(png.readUInt32BE(20),height,icon.src);
      }
      const sw=await page.request.get(BASE+"/pwa-sw.js");
      assert.match(sw.headers()["cache-control"],/no-cache/);
      // Emulate the browser's single-use install event, not a real OS install.
      // It must survive the Next client-side navigation from the home page.
      await page.evaluate(()=>{
        window.__pwaPromptCalls=0;
        const event=new Event("beforeinstallprompt",{cancelable:true});
        event.prompt=async()=>{window.__pwaPromptCalls++;};
        event.userChoice=Promise.resolve({outcome:"dismissed"});
        window.dispatchEvent(event);
      });
      await page.getByRole("link",{name:"Play free online",exact:true}).click();
      await page.waitForURL("**/play");
      const install=page.getByRole("button",{name:"Install PILEHEADS",exact:true});
      await install.click();
      assert.equal(await page.evaluate(()=>window.__pwaPromptCalls),1);
      await page.getByText("Internet is required to open the game.",{exact:false}).waitFor();
      await page.getByRole("button",{name:"Add to home screen",exact:true}).click();
      await page.evaluate(()=>window.dispatchEvent(new Event("appinstalled")));
      await page.getByRole("region",{name:"Install PILEHEADS"}).waitFor({state:"detached"});
      // Browser lifecycle does not claim existing tabs. Reload once to control
      // the new navigation, then simulate a disconnected device.
      await page.reload();
      await page.waitForFunction(()=>!!navigator.serviceWorker.controller);
      assert.deepEqual(await page.evaluate(()=>caches.keys()),[],"foundation must not populate Cache Storage");
      // Playwright offline emulation does not reliably disconnect the service
      // worker process. Stop the test HTTP origin as well.
      await context.setOffline(true);
      await stopServer();
      await page.goto(BASE+"/play",{waitUntil:"domcontentloaded"});
      await page.getByRole("heading",{name:"You’re offline."}).waitFor();
      await page.getByRole("link",{name:"Try again"}).waitFor();
      assert.equal(await page.evaluate(()=>document.querySelector("main").textContent.includes("Offline matches are not available yet")),true);
      server=startServer();await waitReady();
      await context.setOffline(false);
      await page.getByRole("link",{name:"Try again"}).click();
      await page.getByRole("heading",{name:/One pile.*One loser/i}).waitFor();
    }finally{await context.close();}
    const installed=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
    try{
      await installed.addInitScript(()=>{
        const original=window.matchMedia.bind(window);
        window.matchMedia=(query)=>query==="(display-mode: standalone)"?{
          matches:true,media:query,addEventListener(){},removeEventListener(){}
        }:original(query);
      });
      const page=await installed.newPage();
      await page.goto(BASE+"/play");
      await page.waitForFunction(()=>navigator.serviceWorker.getRegistration("/").then(r=>!!r?.active));
      assert.equal(await page.getByRole("region",{name:"Install PILEHEADS"}).count(),0);
    }finally{await installed.close();}
    console.log("PASS PWA export, icon dimensions, install event lifetime, worker scope, offline notice and simulated standalone");
  }finally{if(browser)await browser.close();await stopServer();}
})().catch(error=>{console.error(error);process.exitCode=1;});
