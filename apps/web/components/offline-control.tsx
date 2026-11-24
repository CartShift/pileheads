"use client";
import {useEffect,useState} from "react";
const PREFIX="stack-offline-";
export default function OfflineControl(){
 const [available,setAvailable]=useState(false),[ready,setReady]=useState(false),[busy,setBusy]=useState(false),[message,setMessage]=useState("");
 useEffect(()=>{
  if(!("serviceWorker" in navigator)||!("caches" in window)||!window.isSecureContext)return;
  setAvailable(true);
  void navigator.serviceWorker.getRegistration("/").then(async r=>{if(r?.active?.scriptURL===new URL("/stack-sw.js",location.origin).href)setReady((await caches.keys()).some(k=>k.startsWith(PREFIX)));}).catch(()=>{});
 },[]);
 async function enable(){
  setBusy(true);setMessage("");
  try{
   const registration=await navigator.serviceWorker.register("/stack-sw.js",{scope:"/"});
   const worker=registration.installing||registration.waiting||registration.active;
   if(!worker)throw Error("missing_worker");
   if(!["installed","activated"].includes(worker.state))await new Promise<void>((resolve,reject)=>{
    const timer=window.setTimeout(()=>{worker.removeEventListener("statechange",check);reject(Error("timeout"));},60000);
    function check(){if(["installed","activated","redundant"].includes(worker!.state)){clearTimeout(timer);worker!.removeEventListener("statechange",check);if(worker!.state==="redundant")reject(Error("installation_failed"));else resolve();}}
    worker.addEventListener("statechange",check);check();
   });
   if(!(await caches.keys()).some(k=>k.startsWith(PREFIX)))throw Error("missing_cache");
   setReady(true);setMessage("Classic offline resources downloaded. Reopen the page if the new version is waiting to activate.");
  }catch{setMessage("Could not download the offline table. You can still play online.");}
  finally{setBusy(false);}
 }
 async function remove(){
  setBusy(true);setMessage("");
  try{
   const registration=await navigator.serviceWorker.getRegistration("/");
   if(registration&&[registration.active,registration.waiting,registration.installing].some(w=>w?.scriptURL===new URL("/stack-sw.js",location.origin).href))await registration.unregister();
   for(const key of await caches.keys())if(key.startsWith(PREFIX))await caches.delete(key);
   setReady(false);setMessage("Offline resources removed. Close and reopen the tab to stop the worker.");
  }catch{setMessage("Could not remove offline resources.");}
  finally{setBusy(false);}
 }
 if(!available)return null;
 return <div className="measurement-preference"><button className="secondary-button" disabled={busy} onClick={()=>void(ready?remove():enable())}>{busy?"Working…":ready?"Remove offline table":"Download offline table"}</button><small>Optional download of public Classic game files for local play. No account or private data is cached.</small>{message&&<small role="status">{message}</small>}</div>;
}
