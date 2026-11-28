"use client";
import {useEffect,useRef,useState} from "react";

export const offlineEnabled=process.env.NEXT_PUBLIC_PILEHEADS_PWA==="1" &&
  process.env.NEXT_PUBLIC_PILEHEADS_OFFLINE==="1";
type Snapshot={ready:boolean;version:string|null;totalBytes:number;updateAvailable:boolean};
type Progress={done:number;total:number};
async function activeWorker():Promise<ServiceWorker>{
  const registration=await Promise.race([
    navigator.serviceWorker.ready,
    new Promise<never>((_,reject)=>setTimeout(()=>reject(Error("worker not ready")),12000))
  ]);
  if(!registration.active||registration.active.scriptURL!==new URL("/pwa-sw.js",location.origin).href)
    throw Error("offline worker unavailable");
  return registration.active;
}
async function request(action:"status"|"download"|"remove",onProgress:(progress:Progress)=>void=()=>{}):Promise<Snapshot>{
  const worker=await activeWorker();
  return new Promise((resolve,reject)=>{
    const channel=new MessageChannel();
    const timeout=setTimeout(()=>{channel.port1.close();reject(Error("offline request timeout"));},action==="download"?180000:12000);
    channel.port1.onmessage=event=>{
      const data=event.data;
      if(data?.kind==="progress"){onProgress({done:data.done,total:data.total});return;}
      if(data?.kind!=="result")return;
      clearTimeout(timeout);channel.port1.close();
      if(data.ok)resolve({ready:data.ready,version:data.version,totalBytes:data.totalBytes,updateAvailable:data.updateAvailable});
      else reject(Error("offline storage unavailable"));
    };
    try{worker.postMessage({action},[channel.port2]);}
    catch(error){clearTimeout(timeout);channel.port1.close();reject(error);}
  });
}
export default function OfflineControl(){
  const [available,setAvailable]=useState(false);
  const [online,setOnline]=useState(true);
  const [snapshot,setSnapshot]=useState<Snapshot|null>(null);
  const [busy,setBusy]=useState(false);
  const [progress,setProgress]=useState<Progress|null>(null);
  const [message,setMessage]=useState("");
  const running=useRef(false);
  const channelRef=useRef<BroadcastChannel|null>(null);
  useEffect(()=>{
    if(!offlineEnabled||!("serviceWorker" in navigator)||!("caches" in window)||!window.isSecureContext)return;
    let live=true;
    const detect=()=>setOnline(navigator.onLine);
    detect();window.addEventListener("online",detect);window.addEventListener("offline",detect);
    setAvailable(true);
    const refresh=()=>{
      if(document.visibilityState==="hidden"||running.current)return;
      void request("status").then(value=>{if(live&&!running.current){setSnapshot(value);setMessage("");}}).catch(()=>{
        if(live)setMessage("Offline setup is unavailable. Reopen the game after the app update.");
      });
    };
    refresh();
    try{
      if("BroadcastChannel" in window){
        const channel=new BroadcastChannel("pileheads-offline-status-v1");
        channel.onmessage=refresh;channelRef.current=channel;
      }
    }catch{/* visibility refresh remains available */}
    document.addEventListener("visibilitychange",refresh);
    navigator.serviceWorker.addEventListener("controllerchange",refresh);
    return()=>{live=false;channelRef.current?.close();channelRef.current=null;window.removeEventListener("online",detect);window.removeEventListener("offline",detect);document.removeEventListener("visibilitychange",refresh);navigator.serviceWorker.removeEventListener("controllerchange",refresh);};
  },[]);
  async function act(action:"download"|"remove"){
    if(running.current)return;
    running.current=true;setBusy(true);setProgress(null);setMessage("");
    try{
      const value=await request(action,setProgress);
      setSnapshot(value);
      try{channelRef.current?.postMessage("changed");}catch{}
      setMessage(action==="download"?"Offline table downloaded. You can reopen /play without internet.":"Offline files removed. Your saved local game is unchanged.");
    }catch{setMessage("Could not finish. Check your connection or storage and try again. Previously completed downloads remain available.");}
    finally{running.current=false;setBusy(false);setProgress(null);}
  }
  if(!available)return null;
  return <section className="pwa-install pwa-offline" aria-label="Offline table">
    <strong>{snapshot?.ready?"Offline table ready":"Play without internet"}</strong>
    <p>Optional download of public game files for bot matches only. No account or multiplayer data is downloaded.
      {snapshot&&" Approx. "+Math.ceil(snapshot.totalBytes/1048576)+" MB."}</p>
    <div className="pwa-offline-actions">
      <button type="button" className="secondary-button" disabled={!snapshot||busy||!online||!!(snapshot?.ready&&!snapshot.updateAvailable)}
        onClick={()=>void act("download")}>{busy&&progress?"Downloading "+progress.done+" / "+progress.total:
          snapshot?.ready?(snapshot.updateAvailable?"Update offline table":"Downloaded"):"Download offline table"}</button>
      {(snapshot?.ready||(!snapshot&&message))&&<button type="button" className="secondary-button" disabled={busy} onClick={()=>void act("remove")}>Remove offline files</button>}
    </div>
    {message&&<p role="status">{message}</p>}
  </section>;
}
