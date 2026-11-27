"use client";
import {useEffect,useRef,useState} from "react";
import Link from "next/link";
import {sessionKey,backendOrigin} from "../lib/room";
type Status={state:"idle"|"waiting"|"offered"|"ready"|"assigned"|"expired";ticket?:string;offer?:string;expiresAt?:string;ownReady?:boolean;rivalReady?:boolean;canRelease?:boolean;canRecover?:boolean};
type Action={action:"status"|"join"|"recover"}|{action:"accept"|"release";offer:string}|{action:"cancel";ticket:string}|{action:"cancel";offer:string};
type Result={available:boolean;authorized?:boolean;status?:Status;seat?:{code:string;seat:number;session:string}};
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function validStatus(s:Status|undefined):s is Status{
 if(!s||!["idle","waiting","offered","ready","assigned","expired"].includes(s.state))return false;
 if(s.state==="waiting")return UUID.test(s.ticket||"")&&Number.isFinite(Date.parse(s.expiresAt||""));
 if(s.state==="offered"||s.state==="ready")return UUID.test(s.offer||"")&&Number.isFinite(Date.parse(s.expiresAt||""))&&typeof s.ownReady==="boolean"&&typeof s.rivalReady==="boolean";
 if(s.state==="assigned")return UUID.test(s.offer||"")&&typeof s.canRelease==="boolean";
 return true;
}
export default function QuickPlayPreview(){
 const [result,setResult]=useState<Result|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState(""),[clock,setClock]=useState(0);
 const lock=useRef(false),mounted=useRef(false),controller=useRef<AbortController|null>(null);
 async function request(action?:Action){
  if(lock.current||backendOrigin)return;
  lock.current=true;setBusy(true);
  const c=new AbortController();controller.current=c;
  try{
   const res=await fetch("/api/matchmaking",{method:action?"POST":"GET",credentials:"same-origin",cache:"no-store",headers:action?{"Content-Type":"application/json"}:{},body:action?JSON.stringify(action):undefined,signal:AbortSignal.any([c.signal,AbortSignal.timeout(10000)])});
   if(!res.ok)throw Error(res.status===429?"Too many requests. Try again shortly.":"Could not confirm your request. Refresh status before retrying.");
   const data:Result=await res.json();
   if(typeof data.available!=="boolean")throw Error("Invalid queue response.");
   if(action?.action==="recover"){
    const seat=data.seat;
    if(!data.authorized||!seat||!/^[A-HJ-NP-Z2-9]{8}$/.test(seat.code)||!Number.isInteger(seat.seat)||seat.seat<0||seat.seat>1||!/^[A-Za-z0-9_-]{43}$/.test(seat.session))throw Error("Could not recover your seat.");
    if(!mounted.current)return;
    localStorage.setItem(sessionKey(seat.code),seat.session);
    window.location.assign("/play?room="+encodeURIComponent(seat.code));return;
   }
   if(data.available&&data.authorized&&!validStatus(data.status))throw Error("Invalid queue state.");
   if(mounted.current){setResult(data);setClock(Date.now());setError("")}
  }catch(e){if(mounted.current&&!c.signal.aborted)setError(e instanceof Error?e.message:"Connection unavailable.")}
  finally{lock.current=false;if(mounted.current)setBusy(false)}
 }
 useEffect(()=>{mounted.current=true;void request();return()=>{mounted.current=false;controller.current?.abort()}},[]);
 const state=result?.status?.state;
 useEffect(()=>{
  if(!result?.authorized||!["waiting","offered","ready"].includes(state||""))return;
  const t=setInterval(()=>{if(document.visibilityState==="visible")void request({action:"status"})},3000);
  const onVisible=()=>{if(document.visibilityState==="visible")void request({action:"status"})};
  document.addEventListener("visibilitychange",onVisible);
  return()=>{clearInterval(t);document.removeEventListener("visibilitychange",onVisible)}
 },[state,result?.authorized]);
 useEffect(()=>{if(state!=="waiting"&&state!=="offered"&&state!=="ready")return;const t=setInterval(()=>setClock(Date.now()),1000);return()=>clearInterval(t)},[state]);
 const s=result?.status,seconds=s?.expiresAt?Math.max(0,Math.ceil((Date.parse(s.expiresAt)-clock)/1000)):null;
 return <section className="mode-card" aria-label="Quick Play preview">
  <div className="eyebrow">INVITE-ONLY PILOT</div><h2>Find a real opponent.</h2>
  <p>Two human players, three rounds. No ranking or substitute bots.</p>
  {backendOrigin||result?.available===false?<p>Quick Play is not open yet. Private tables and practice are available.</p>:!result?<p role="status">Checking availability…</p>:!result.authorized?<p>This pilot is limited to invited accounts. <Link href="/profile">Go to your profile</Link>.</p>:<>
   {s?.state==="idle"&&<><p>Join only when you are ready to play.</p><button className="cta" disabled={busy} onClick={()=>void request({action:"join"})}>Find opponent</button></>}
   {s?.state==="expired"&&<><p>Your ticket or ready check expired. You can try again.</p><button className="cta" disabled={busy} onClick={()=>void request({action:"join"})}>Find another opponent</button></>}
   {s?.state==="waiting"&&<><p role="status">Looking for another player… {seconds!==null&&`(${seconds}s remaining)`}</p><button className="learn-button" disabled={busy} onClick={()=>void request({action:"cancel",ticket:s.ticket!})}>Cancel search</button></>}
   {(s?.state==="offered"||s?.state==="ready")&&<><h3>Match found</h3><p role="status">{s.ownReady?"You are ready":"Confirm that you are ready"} · {s.rivalReady?"Opponent ready":"Waiting for opponent"}</p><p>{seconds!==null&&`${seconds}s remaining`}</p>{!s.ownReady&&<button className="cta" disabled={busy||seconds===0} onClick={()=>void request({action:"accept",offer:s.offer!})}>Accept match</button>}<button className="learn-button" disabled={busy} onClick={()=>void request({action:"cancel",offer:s.offer!})}>Decline match</button></>}
   {s?.state==="assigned"&&<><h3>Your table is ready</h3><p>Your account can recover the same seat on another device.</p>{s.canRecover!==false&&<button className="cta" disabled={busy} onClick={()=>void request({action:"recover"})}>Enter table</button>}{s.canRecover===false&&<p>This room has expired. Leave the assignment to search again.</p>}{s.canRelease&&<button className="learn-button" disabled={busy} onClick={()=>void request({action:"release",offer:s.offer!})}>Leave completed match</button>}</>}
   <button className="learn-button" disabled={busy} onClick={()=>void request({action:"status"})}>Refresh queue status</button>
  </>}
  {error&&<p role="alert">{error} <button className="learn-button" disabled={busy} onClick={()=>void request()}>Retry connection</button></p>}
  <Link className="learn-button" href="/play">Back to private play</Link>
 </section>;
}
