"use strict";
// Existing Playwright dependency; no external provider or database access.
const assert=require("node:assert/strict");
const {spawn}=require("node:child_process");
const path=require("node:path");
const {chromium}=require("playwright");
const ROOT=path.resolve(__dirname,"..");
function start(){
 const env={PORT:"0",NODE_ENV:"production"};
 for(const key of ["PATH","HOME","TMPDIR","TEMP","SystemRoot","WINDIR"])if(process.env[key])env[key]=process.env[key];
 const server=spawn(process.execPath,["scripts/render-server.cjs"],{cwd:ROOT,env,stdio:["ignore","pipe","pipe"]});
 const origin=new Promise((resolve,reject)=>{
  let log="";
  const timer=setTimeout(()=>finish(new Error("Server startup timeout")),15000);
  function finish(err,url){clearTimeout(timer);server.stdout.off("data",read);server.off("exit",exit);server.off("error",fail);err?reject(err):resolve(url);}
  function exit(code){finish(new Error("Server exited: "+code));}
  function fail(e){finish(e);}
  function read(data){log=(log+data.toString()).slice(-4096);const m=log.match(/STACK listening on port (\d+) with WebSocket rooms/);if(m&&Number(m[1]))finish(null,"http://127.0.0.1:"+m[1]);}
  server.stdout.on("data",read);server.once("exit",exit);server.once("error",fail);
 });
 server.stderr.resume();
 return {server,origin};
}
async function run(){
 const {server,origin}=start();let browser;
 try{
  const base=await origin;
  browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_EXECUTABLE_PATH?{executablePath:process.env.CHROMIUM_EXECUTABLE_PATH}:{})});
  const ctx=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:"reduce"});
  try{
   const page=await ctx.newPage(),errors=[];page.on("pageerror",e=>errors.push(e.message));
   await page.goto(base+"/stack");
   for(const href of ["/decks","/account","/shop","/partners"])assert.ok(await page.locator('footer a[href="'+href+'"]').count(),href);
   await page.goto(base+"/decks");
   assert.equal(await page.locator(".deck-edition").count(),3);
   for(const id of ["refined","characters","original"])assert.ok(await page.locator('a[href="/play?deck='+id+'"]').count(),id);
   await page.goto(base+"/profile");await page.getByText("Guest profiles are not available yet.",{exact:false}).waitFor();
   await page.goto(base+"/account");await page.getByText("Recoverable accounts are not available yet.",{exact:false}).waitFor();
   await page.goto(base+"/shop");await page.getByText("Physical editions are not on sale here yet.",{exact:false}).waitFor();
   await page.goto(base+"/partners?partner=unpublished");await page.getByText("Edition unavailable.",{exact:true}).waitFor();
   await page.goto(base+"/stack");await page.getByRole("button",{name:"Download offline table",exact:true}).click();
   await page.getByRole("button",{name:"Remove offline table",exact:true}).waitFor({timeout:65000});
   await page.waitForFunction(()=>!!navigator.serviceWorker.controller,{timeout:20000});
   const cached=await page.evaluate(async()=>{
    const names=(await caches.keys()).filter(k=>k.startsWith("stack-offline-"));
    const urls=[];for(const name of names)for(const req of await(await caches.open(name)).keys())urls.push(new URL(req.url).pathname);
    return urls;
   });
   for(const p of ["/stack-media/stack-design-system.css","/stack-media/barlow-condensed-black-italic.ttf","/pilehead/assets/stack-characters-v2.webp","/pilehead/engine.js"])assert.ok(cached.includes(p),p);
   assert.ok(cached.every(p=>p==="/stack-offline.html"||p.startsWith("/pilehead/")||p.startsWith("/stack-media/")));
   assert.equal((await ctx.cookies()).length,0,"no account cookie created");
   await ctx.setOffline(true);await page.goto(base+"/play");
   await page.getByRole("heading",{name:"You're offline."}).waitFor();
   await page.getByRole("link",{name:"Open Classic table"}).click();
   await page.locator('[data-do="create"]').waitFor();
   await page.locator("#seat-count").selectOption("2");
   await page.locator('[data-do="create"]').click();
   await page.locator('[data-do="ready"]').click();
   await page.locator(".table").waitFor();
   assert.equal(await page.evaluate(()=>typeof globalThis.PileheadEngine.create),"function");
   assert.ok(await page.evaluate(()=>JSON.parse(localStorage.getItem("pilehead-playtest-v11")).g.people.length===2));
   await ctx.setOffline(false);await page.goto(base+"/stack");
   await page.getByRole("button",{name:"Remove offline table",exact:true}).click();
   await page.getByRole("button",{name:"Download offline table",exact:true}).waitFor();
   assert.equal(await page.evaluate(async()=>(await caches.keys()).filter(k=>k.startsWith("stack-offline-")).length),0);
   assert.deepEqual(errors,[]);
   console.log("PASS commercial browser: navigation, three editions, disabled features, offline Classic setup and removal");
  }finally{await ctx.close();}
 }finally{
  if(browser)await browser.close();
  if(server.exitCode===null&&server.signalCode===null)await new Promise(resolve=>{const timer=setTimeout(()=>server.kill("SIGKILL"),3000);server.once("exit",()=>{clearTimeout(timer);resolve();});server.kill("SIGTERM");});
 }
}
run().catch(e=>{console.error(e);process.exitCode=1;});
