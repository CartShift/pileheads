/* Generated from the canonical static /play export. Explicit opt-in only. */
"use strict";
const INDEX = /*__OFFLINE_INDEX__*/ null;
const PREFIX="pileheads-offline-v1-";
const META=PREFIX+"meta";
const META_URL="/__pileheads_offline_metadata__";
const STATIC=/^\/_next\/static\/[A-Za-z0-9._/-]+\.(?:js|css|woff2?|ttf|webp|png|svg|jpe?g|ico|json)$/;
const permitted=new Set(INDEX.entries.map(entry=>entry.url));
let queue=Promise.resolve();

const offline='<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>PILEHEADS – Offline</title><style>body{background:#086879;color:#fff4d7;font:1rem system-ui;max-width:28rem;margin:15vh auto;padding:1.5rem}h1{font-size:2rem}a{display:inline-block;background:#f6c32c;color:#172421;padding:14px 22px;border-radius:12px;font-weight:bold}</style><main><h1>PILEHEADS</h1><h2>You’re offline.</h2><p>Reconnect to open the game or rejoin your table. Offline matches are not available yet on this device.</p><a href="/play">Try again</a></main></html>';
const fallback=()=>new Response(offline,{status:503,headers:{"Content-Type":"text/html; charset=utf-8","Cache-Control":"no-store"}});
const validSnapshot=s=>s && typeof s.name==="string" && /^pileheads-offline-v1-[a-f0-9]{64}-[a-f0-9-]{36}$/.test(s.name) &&
  /^[a-f0-9]{64}$/.test(s.version) && s.name.startsWith(PREFIX+s.version+"-") &&
  Number.isSafeInteger(s.count) && s.count>0 && Number.isSafeInteger(s.totalBytes) && s.totalBytes>0;
async function snapshots(){
  if(!await caches.has(META))return [];
  const response=await (await caches.open(META)).match(META_URL);
  if(!response)return [];
  const data=await response.json();
  return Array.isArray(data)?data.filter(validSnapshot).slice(0,2):[];
}
async function complete(s){
  if(!await caches.has(s.name))return false;
  const cache=await caches.open(s.name);
  return (await cache.keys()).length===s.count && !!await cache.match("/play");
}
async function status(){
  for(const s of await snapshots())if(await complete(s))return {ready:true,version:s.version,totalBytes:s.totalBytes,updateAvailable:s.version!==INDEX.version};
  return {ready:false,version:null,totalBytes:INDEX.totalBytes,updateAvailable:false};
}
async function cleanup(keep){
  for(const name of await caches.keys())if(name.startsWith(PREFIX)&&name!==META&&!keep.includes(name))await caches.delete(name);
}
async function sha256(bytes){
  const digest=await crypto.subtle.digest("SHA-256",bytes);
  return Array.from(new Uint8Array(digest),n=>n.toString(16).padStart(2,"0")).join("");
}
async function download(port){
  const old=await snapshots();
  for(const s of old)if(s.version===INDEX.version&&await complete(s))return status();
  const name=PREFIX+INDEX.version+"-"+crypto.randomUUID();
  const cache=await caches.open(name);
  let committed=false;
  try{
    let done=0;
    for(const entry of INDEX.entries){
      const response=await fetch(entry.url,{credentials:"omit",cache:"reload",redirect:"error"});
      if(!response.ok||response.status!==200||response.type==="opaque"||
         /(?:^|,)\s*(?:private|no-store)(?:\s|,|=|$)/i.test(response.headers.get("Cache-Control")||"")||
         response.headers.get("Vary")==="*")throw Error("Not a public cacheable build asset");
      const bytes=await response.arrayBuffer();
      if(bytes.byteLength!==entry.bytes||await sha256(bytes)!==entry.sha256)throw Error("Build changed while downloading");
      const headers=new Headers();
      for(const h of ["Content-Type","Content-Security-Policy","Referrer-Policy","X-Content-Type-Options","X-Frame-Options","Permissions-Policy"]){
        const value=response.headers.get(h);if(value)headers.set(h,value);
      }
      headers.set("Cache-Control","no-store");
      await cache.put(entry.url,new Response(bytes,{status:200,headers}));
      port.postMessage({kind:"progress",done:++done,total:INDEX.entries.length});
    }
    const current={name,version:INDEX.version,totalBytes:INDEX.totalBytes,count:INDEX.entries.length};
    // Commit the pointer only after every public file was verified and stored.
    const previous=[];
    for(const s of old)if(s.version!==current.version&&await complete(s)){previous.push(s);break;}
    const next=[current,...previous];
    await (await caches.open(META)).put(META_URL,new Response(JSON.stringify(next),{headers:{"Content-Type":"application/json"}}));
    committed=true;
    // Keep one previous complete release for still-open tabs. No forced reload.
    await cleanup(next.map(s=>s.name)).catch(()=>{});
    return status();
  }finally{if(!committed)await caches.delete(name).catch(()=>{});}
}
async function remove(){
  // Remove only PILEHEADS offline data, not the install worker or local game saves.
  await caches.delete(META);
  await cleanup([]);
  return status();
}
self.addEventListener("message",event=>{
  const port=event.ports?.[0];
  const source=event.source?.url;
  if(!port||!source)return;
  const url=new URL(source);
  if(url.origin!==self.location.origin||url.pathname!=="/play"||url.search)return;
  const action=event.data?.action;
  if(!["status","download","remove"].includes(action))return;
  // Serialize mutations across tabs. All operations are explicit; no sync or push.
  queue=queue.catch(()=>{}).then(async()=>{
    try{
      const data=action==="download"?await download(port):action==="remove"?await remove():await status();
      port.postMessage({kind:"result",ok:true,...data});
    }catch{port.postMessage({kind:"result",ok:false});}
  });
  event.waitUntil(queue);
});
async function cached(request){
  for(const s of await snapshots()){
    if(!await caches.has(s.name))continue;
    const response=await (await caches.open(s.name)).match(request.url);
    if(response)return response;
  }
  return null;
}
async function withRange(response,request,url){
  const range=request.headers.get("Range");
  if(!range||!url.pathname.endsWith(".mp3"))return response;
  const match=/^bytes=(\d+)-(\d*)$/.exec(range);
  const bytes=await response.arrayBuffer();
  const start=match?Number(match[1]):-1;
  const end=match&&match[2]?Math.min(Number(match[2]),bytes.byteLength-1):bytes.byteLength-1;
  if(start<0||start>=bytes.byteLength||end<start)return new Response(null,{status:416,headers:{"Content-Range":"bytes */"+bytes.byteLength}});
  const headers=new Headers(response.headers);
  headers.set("Content-Range","bytes "+start+"-"+end+"/"+bytes.byteLength);
  headers.set("Content-Length",String(end-start+1));
  headers.set("Accept-Ranges","bytes");
  return new Response(bytes.slice(start,end+1),{status:206,headers});
}
self.addEventListener("fetch",event=>{
  const request=event.request,url=new URL(request.url);
  if(request.method!=="GET"||url.origin!==self.location.origin||request.headers.has("Authorization"))return;
  const navigation=request.mode==="navigate"&&!url.search&&["/","/play","/play/"].includes(url.pathname);
  const asset=request.mode!=="navigate"&&(
    (url.pathname!=="/play"&&permitted.has(url.pathname+url.search))||
    (!url.search&&STATIC.test(url.pathname))
  );
  if(!navigation&&!asset)return;
  // Network-first: online HTML/API/realtime never come from Cache Storage.
  // Cache is considered only for a network exception, never an HTTP error.
  event.respondWith(fetch(request).catch(async()=>{
    try{
      if(asset||(navigation&&url.pathname==="/play")){
        const response=await cached(request);
        if(response)return withRange(response,request,url);
      }
    }catch{/* storage unavailable: fall back honestly */}
    return navigation?fallback():Response.error();
  }));
});
// Do not use skipWaiting, clients.claim, automatic downloads or forced reloads.
