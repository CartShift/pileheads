"use strict";
const assert = require("node:assert/strict");
const {spawn} = require("node:child_process");
const path = require("node:path");
const ROOT = path.resolve(__dirname,"..");
const routes = ["/play","/stack","/decks","/profile","/account","/shop","/partners"];
function waitPort(child) {
  return new Promise((resolve,reject)=>{
    let output="";
    const timer=setTimeout(()=>finish(new Error("Render server startup timed out")),15000);
    function finish(error,port){
      clearTimeout(timer);child.stdout.off("data",read);child.off("exit",exit);child.off("error",fail);
      error?reject(error):resolve(port);
    }
    function exit(code){finish(new Error("Render server exited: "+code));}
    function fail(error){finish(error);}
    function read(chunk){
      output=(output+chunk.toString()).slice(-4096);
      const m=output.match(/STACK listening on port (\d+) with WebSocket rooms/);
      if(m&&Number(m[1])>0)finish(null,Number(m[1]));
    }
    child.stdout.on("data",read);child.once("exit",exit);child.once("error",fail);
  });
}
async function verifyHttp(origin,request=fetch) {
  const get=(pathname,options={})=>request(origin+pathname,{redirect:"manual",signal:AbortSignal.timeout(10000),...options});
  for(const route of routes){
    const r=await get(route);assert.equal(r.status,200,route);
    assert.match(r.headers.get("content-type")||"",/text\/html/);
    assert.match(await r.text(),/STACK/);
  }
  const classic=await get("/pilehead/index.html");assert.equal(classic.status,200);await classic.arrayBuffer();
  const sw=await get("/stack-sw.js");assert.equal(sw.status,200);
  assert.equal(sw.headers.get("service-worker-allowed"),"/");
  assert.equal(sw.headers.get("cache-control"),"no-cache");assert.match(await sw.text(),/stack-offline-/);
  const manifest=await get("/stack.webmanifest");assert.equal(manifest.status,200);assert.equal((await manifest.json()).start_url,"/play");
  const expected=[
    ["/api/product-events",{enabled:false}],
    ["/api/player",{enabled:false,profile:null}],
    ["/api/account",{enabled:false,profile:null}],
    ["/api/checkout",{enabled:false}],
    ["/api/storefront",{physicalShopUrl:null}],
    ["/api/editions",{contact:null}]
  ];
  for(const [route,body] of expected){
    const r=await get(route);assert.equal(r.status,200,route);assert.deepEqual(await r.json(),body,route);
    assert.match(r.headers.get("cache-control")||"",/no-store/);
    assert.equal(r.headers.get("set-cookie"),null);
  }
  for(const [route,body] of [["/api/player",{action:"create"}],["/api/account",{action:"login"}],["/api/product-events",{event:"landing_view"}],["/api/checkout",{product:"sandbox-supporter"}],["/api/checkout/webhook",{}]]){
    const r=await get(route,{method:"POST",headers:{"content-type":"application/json",origin},body:JSON.stringify(body)});
    assert.equal(r.status,503,route+" must be off by default");assert.equal(r.headers.get("set-cookie"),null);await r.arrayBuffer();
  }
  const missing=await get("/api/editions?partner=unpublished");assert.equal(missing.status,404);await missing.arrayBuffer();
  const live=await get("/livez");assert.equal(live.status,200);assert.equal((await live.json()).websocket,true);
  console.log("PASS HTTP smoke: seven routes, offline headers, WebSocket liveness and disabled commercial integrations");
}
async function run(){
  // Inherit only runtime path/config essentials, not database/provider credentials.
  const env={PORT:"0",NODE_ENV:"production"};
  for(const key of ["PATH","HOME","TMPDIR","TEMP","SystemRoot","WINDIR"])if(process.env[key])env[key]=process.env[key];
  const child=spawn(process.execPath,["scripts/render-server.cjs"],{cwd:ROOT,env,stdio:["ignore","pipe","pipe"]});
  child.stderr.on("data",()=>{});
  try{const port=await waitPort(child);await verifyHttp("http://127.0.0.1:"+port);}
  finally{
    if(child.exitCode===null&&child.signalCode===null){
      await new Promise(resolve=>{
        const timer=setTimeout(()=>{child.kill("SIGKILL");},3000);
        child.once("exit",()=>{clearTimeout(timer);resolve();});
        child.kill("SIGTERM");
      });
    }
  }
}
if(require.main===module)run().catch(error=>{console.error(error);process.exitCode=1;});
module.exports={verifyHttp,run};
