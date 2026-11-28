"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs"),path=require("node:path");
const {spawn}=require("node:child_process");
const {once}=require("node:events");
const {chromium}=require("playwright");
const Engine=require("../packages/game-engine");
const ROOT=path.resolve(__dirname,".."),PORT=44308,BASE="http://127.0.0.1:"+PORT;
const startServer=()=>spawn(process.execPath,["scripts/render-server.cjs"],{cwd:ROOT,env:{...process.env,PORT:String(PORT)},stdio:"ignore"});
const SAVE="stack-next-local-save-v1";
function botOpportunity(g){
  if(g.pendingDump)return g.pendingDump.seat===1?{kind:"dump"}:null;
  if(Engine.followUpOptions(g,1).length)return {kind:"move",move:Engine.followUpOptions(g,1)[0]};
  if(Engine.slamOptions(g,1).length)return {kind:"move",move:Engine.slamOptions(g,1)[0]};
  return g.turn===1?{kind:"turn"}:null;
}
function humanMove(g){
  if(g.pendingDump)return {type:"target"};
  const snap=Engine.followUpOptions(g,0)[0],slam=Engine.slamOptions(g,0)[0];
  if(snap)return snap;
  if(slam)return slam;
  assert.equal(g.turn,0);
  if(g.pendingCounter)return Engine.options(g,0)[0];
  if(Engine.stage(g,0)==="down")return Engine.options(g,0).find(m=>m.type==="play");
  return Engine.choose(structuredClone(g),0);
}
function shortRound(){
  // Choose a reproducible short, ordinary classic round without changing
  // production rules or shortening the deck. Both seats use legal moves.
  for(let seed=1;seed<=256;seed++){
    const g=Engine.create({players:2,seed,endgameRule:"classic"});
    Engine.autoSetup(g,0);Engine.autoSetup(g,1);g.starterSeat=0;
    g.setupReady=[true,true];Engine.start(g);
    const initial=structuredClone(g);
    let steps=0;
    while(g.phase==="play"&&steps++<90){
      const bot=botOpportunity(g);
      if(bot?.kind==="dump")Engine.resolveDump(g,1,0);
      else if(bot)Engine.move(g,1,bot.kind==="turn"?Engine.choose(g,1):bot.move);
      else{
        const move=humanMove(g);
        if(move.type==="target")Engine.resolveDump(g,0,1);
        else Engine.move(g,0,move);
      }
      Engine.invariant(g);
    }
    if(g.phase==="over")return {initial,steps};
  }
  throw Error("No short deterministic round fixture");
}
async function completeOfflineRound(page){
  const {initial,steps}=shortRound();
  await page.getByRole("button",{name:"Leave table",exact:true}).click();
  await page.locator(".stack-lobby").waitFor();
  await page.evaluate(({key,game})=>localStorage.setItem(key,JSON.stringify({version:1,game})),{key:SAVE,game:initial});
  await page.reload({waitUntil:"domcontentloaded"});
  await page.getByRole("button",{name:"Resume game"}).click();
  await page.locator(".game-table-shell").waitFor();
  for(let i=0;i<Math.max(steps+30,120);i++){
    const before=await page.evaluate(key=>localStorage.getItem(key),SAVE);
    const g=JSON.parse(before).game;
    Engine.invariant(g);
    if(g.phase==="over"){
      await page.getByRole("region",{name:"Round results"}).waitFor();
      assert.equal(await page.locator(".results-standings li").count(),2);
      assert(g.moves>0);return g;
    }
    if(!botOpportunity(g)){
      const m=humanMove(g);
      const dock=page.locator(".control-panel");
      if(m.type==="target")await dock.getByRole("button",{name:"Bot 1",exact:true}).click();
      else if(m.type==="counter-dump")await dock.getByRole("button",{name:"Counter DUMP",exact:true}).click();
      else if(m.type==="counter-pass")await dock.getByRole("button",{name:"Keep cards",exact:true}).click();
      else if(m.type==="followup")await dock.locator('[data-hotkey="snap"]').click();
      else if(m.type==="slam")await dock.locator('[data-hotkey="slam"]').click();
      else if(m.type==="take")await dock.locator('[data-hotkey="take"]').click();
      else if(m.source==="down")await page.locator(".blind-under .card-hit").first().press("Enter");
      else{
        for(const id of m.ids){
          const card=page.locator('.player-zones .playing-card[data-card-id="'+id+'"] .card-hit');
          // Keyboard activation avoids ambiguity between overlapping cards.
          if(await card.getAttribute("aria-pressed")!=="true")await card.press("Enter");
        }
        await dock.locator('[data-hotkey="play"]').click();
      }
    }
    await page.waitForFunction(({key,before})=>localStorage.getItem(key)!==before,{key:SAVE,before},{timeout:10000});
  }
  throw Error("Offline round failed to finish within bounded legal moves");
}
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
      const finished=await completeOfflineRound(page);
      console.log("PASS full offline classic round from first turn to results: seed "+finished.seed+", "+finished.moves+" moves");
      server=startServer();await waitReady();await context.setOffline(false);
      await page.goto(BASE+"/play");
      await page.getByRole("button",{name:"Create a room"}).waitFor();
      // A second tab shares the completed snapshot. Returning to it after
      // removal must refresh its status without deleting local saves.
      const other=await context.newPage();
      await other.goto(BASE+"/play");
      await other.getByText("Offline table ready",{exact:true}).waitFor();
      await page.bringToFront();
      await page.getByRole("button",{name:"Remove offline files"}).click({timeout:30000});
      await page.getByText("Offline files removed.",{exact:false}).waitFor();
      assert.deepEqual(await page.evaluate(()=>caches.keys()),[]);
      assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem("stack-next-local-save-v1")).game.seed),finished.seed);
      await other.bringToFront();
      await other.getByRole("button",{name:"Download offline table",exact:true}).waitFor();
      await other.close();
      console.log("PASS offline download, disconnected origin, real local move, save/resume, private invite isolation, online recovery and removal");
    }finally{await context.close();}
  }finally{if(browser)await browser.close();await stopServer();}
})().catch(error=>{console.error(error);process.exitCode=1;});
