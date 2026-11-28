"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs"),path=require("node:path");
const {spawn}=require("node:child_process");
const {once}=require("node:events");
const {chromium}=require("playwright");
const ROOT=path.resolve(__dirname,".."),PORT=44308,BASE="http://127.0.0.1:"+PORT;
const startServer=()=>spawn(process.execPath,["scripts/render-server.cjs"],{cwd:ROOT,env:{...process.env,PORT:String(PORT)},stdio:"ignore"});
async function waitReady(){
  for(let i=0;i<100;i++){try{if((await fetch(BASE+"/livez")).ok)return;}catch{}await new Promise(r=>setTimeout(r,200));}
  throw Error("offline test origin did not start");
}
(async()=>{
  assert.match(fs.readFileSync(path.join(ROOT,"vercel-static/pwa-sw.js"),"utf8"),/pileheads-offline-v1-/,"flagged offline export required");
  let server=startServer(),browser;
  async function stopServer(){if(server.exitCode!==null||server.signalCode!==null)return;const exited=once(server,"exit");server.kill("SIGKILL");await exited;}
  try{
    await waitReady();
    browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_EXECUTABLE_PATH?{executablePath:process.env.CHROMIUM_EXECUTABLE_PATH}:{})});
    const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,serviceWorkers:"allow",reducedMotion:"reduce"});
    try{
      const page=await context.newPage();
      await page.goto(BASE+"/play");
      const download=page.getByRole("button",{name:"Download offline table",exact:true});
      await download.waitFor();
      assert.deepEqual(await page.evaluate(()=>caches.keys()),[],"no unsolicited offline download");
      await download.click({timeout:30000});
      await page.getByText("Offline table ready",{exact:true}).waitFor({timeout:180000});
      const cached=await page.evaluate(async()=>{
        const result=[];
        for(const name of await caches.keys())if(name.startsWith("pileheads-offline-v1-")&&!name.endsWith("meta")){
          for(const request of await (await caches.open(name)).keys())result.push(request.url);
        }
        return result;
      });
      assert(cached.some(url=>new URL(url).pathname==="/play"));
      assert(cached.some(url=>new URL(url).pathname.startsWith("/_next/static/")));
      assert(!cached.some(url=>/\/api\/|\/profile(?:\?|$)|[?&](?:room|token)=/.test(url)));
      await page.reload();
      await page.waitForFunction(()=>!!navigator.serviceWorker.controller);
      await context.setOffline(true);
      await stopServer();
      // A new document must boot without either HTTP origin or network.
      await page.goto(BASE+"/play",{waitUntil:"domcontentloaded"});
      await page.getByRole("heading",{name:"You’re offline.",exact:true}).waitFor();
      assert.equal(await page.getByRole("button",{name:"Create a room"}).count(),0);
      await page.getByRole("button",{name:"Learn with a bot"}).click();
      await page.getByRole("button",{name:"Start round"}).click();
      await page.getByRole("heading",{name:"Your move."}).waitFor({timeout:10000});
      await page.locator('.player-hand .card-hit:not([aria-label^="DUMP"])').first().click();
      await page.getByRole("button",{name:/Play cards/}).click();
      await page.waitForFunction(()=>JSON.parse(localStorage.getItem("stack-next-local-save-v1")||"null")?.game?.moves>=1);
      const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem("stack-next-local-save-v1")).game);
      await page.reload({waitUntil:"domcontentloaded"});
      await page.getByRole("button",{name:"Resume game"}).click();
      await page.locator(".game-table-shell").waitFor();
      const resumed=await page.evaluate(()=>JSON.parse(localStorage.getItem("stack-next-local-save-v1")).game);
      assert.equal(resumed.seed,saved.seed,"resume the same local game offline");
      assert(resumed.moves>=saved.moves,"committed progress must survive offline reload");
      // The uncached token-bearing room URL must never resolve to the cached table.
      const invite=await context.newPage();
      try{
        await assert.rejects(invite.goto(BASE+"/play?room=PRIVATE1",{waitUntil:"domcontentloaded",timeout:10000}));
      }finally{await invite.close();}
      server=startServer();await waitReady();await context.setOffline(false);
      await page.goto(BASE+"/play");
      await page.getByRole("button",{name:"Create a room"}).waitFor();
      await page.getByRole("button",{name:"Remove offline files"}).click({timeout:30000});
      await page.getByText("Offline files removed.",{exact:false}).waitFor();
      assert.deepEqual(await page.evaluate(()=>caches.keys()),[]);
      assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem("stack-next-local-save-v1")).game.seed),saved.seed);
      console.log("PASS offline download, disconnected origin, real local move, save/resume, private invite isolation, online recovery and removal");
    }finally{await context.close();}
  }finally{if(browser)await browser.close();await stopServer();}
})().catch(error=>{console.error(error);process.exitCode=1;});
