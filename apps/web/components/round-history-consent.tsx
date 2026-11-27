"use client";
import {useEffect,useRef,useState} from "react";
type Status={signedIn:boolean;linked:boolean;progressionSelected:boolean};
type Props={code:string;round:number;revision:number;phase:"setup"|"play"|"over";token:string;busy:boolean;progressionAvailable?:boolean;onChanged:()=>void};
type Action="history-status"|"history-link"|"history-unlink";
async function request(action:Action,{code,round,revision,token}:Props,signal?:AbortSignal,earn=false):Promise<Status>{
 const res=await fetch("/api/pilehead",{method:"POST",credentials:"same-origin",cache:"no-store",headers:{"Content-Type":"application/json",Authorization:"Bearer "+token},
  body:JSON.stringify({action,code,round,...(action==="history-status"?{}:{revision,confirm:true,...(earn?{progression:true}:{})})}),signal:signal?AbortSignal.any([signal,AbortSignal.timeout(10000)]):AbortSignal.timeout(10000)});
 const data=await res.json().catch(()=>null);
 if(!res.ok||data?.ok!==true||typeof data.signedIn!=="boolean"||typeof data.linked!=="boolean")throw Error("history_unavailable");
 return {signedIn:data.signedIn,linked:data.linked,progressionSelected:data.progressionSelected===true};
}
export default function RoundHistoryConsent(props:Props){
 const {code,round,token,phase,busy,onChanged}=props;
 const [status,setStatus]=useState<Status|null>(null),[pending,setPending]=useState(false),[error,setError]=useState("");
 const lock=useRef(false),mounted=useRef(false);
 useEffect(()=>{
  mounted.current=true;
  const controller=new AbortController();
  setStatus(null);setError("");setPending(true);
  void request("history-status",props,controller.signal).then(result=>{if(!controller.signal.aborted)setStatus(result)}).catch(()=>{if(!controller.signal.aborted)setError("Round history status is unavailable.")}).finally(()=>{if(!controller.signal.aborted)setPending(false)});
  return()=>{mounted.current=false;controller.abort()};
 // The status does not depend on every gameplay revision. No poll loop.
 },[code,round,token]);
 async function act(action:Action,earn=false){
  if(lock.current||pending||busy)return;
  lock.current=true;setPending(true);setError("");
  try{
   const next=await request(action,props,undefined,earn);
   if(mounted.current)setStatus(next);
   if(action!=="history-status")onChanged();
  }catch{
   if(mounted.current){
    setError(action==="history-status"?"Round history status is unavailable.":"Could not confirm the change. Refresh your status before trying again.");
    // Do not display stale consent after an unknown-result mutation.
    if(action!=="history-status")setStatus(null);
   }
   if(action!=="history-status")onChanged();
  }finally{lock.current=false;if(mounted.current)setPending(false)}
 }
 return <section className="round-history-consent" aria-label="Private round history">
  <strong>Save this round to your account</strong>
  <p>Optional and private. Only your completed placement is saved, for up to 90 days. Each round requires a new choice. Signing out does not cancel a choice already made.</p>
  {pending&&<p role="status">Checking your round history…</p>}
  {error&&<p role="alert">{error}</p>}
  {status&&!status.signedIn&&<p>Sign in on the <a href="/profile" target="_blank" rel="noopener noreferrer">profile page</a> in another tab, then refresh here. You can play without signing in.</p>}
  {status?.signedIn&&status.linked&&<p role="status">This round is selected for your private history.</p>}
  {status?.signedIn&&!status.linked&&<p role="status">This round is not selected for your account.</p>}
  {status?.signedIn&&status.linked&&status.progressionSelected&&<p>Also selected for account XP, if eligible when the round finishes.</p>}
  {status?.signedIn&&!status.linked&&phase==="setup"&&props.progressionAvailable&&<><p>Optional: also earn 10 XP for a completed all-human round, up to 50 XP per UTC day. XP and achievements stay with your account until deletion. They are private, not a competitive rating, and have no cash value.</p><button type="button" className="secondary-button" disabled={pending||busy} onClick={()=>void act("history-link",true)}>Save round and earn XP</button></>}
  {status?.signedIn&&status.linked&&phase!=="over"&&<button type="button" className="secondary-button" disabled={pending||busy} onClick={()=>void act("history-unlink")}>Do not save this round</button>}
  {status?.signedIn&&!status.linked&&phase==="setup"&&<button type="button" className="secondary-button" disabled={pending||busy} onClick={()=>void act("history-link")}>Save this round</button>}
  {phase==="play"&&!status?.linked&&<p>Saving a new result is only available before the round starts.</p>}
  {phase==="over"&&<p>The round has ended. View saved results in your profile.</p>}
  <button type="button" className="learn-button" disabled={pending||busy} onClick={()=>void act("history-status")}>Refresh history status</button>
 </section>;
}
