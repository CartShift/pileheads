"use client";
import {useEffect,useRef,useState} from "react";
import {useRouter} from "next/navigation";
import type {DeckTheme} from "./card-view";
import SavedRoundHistory from "./saved-round-history";
import PlayerProgression from "./player-progression";
type Profile={kind:"account";name:string;deck:DeckTheme;expiresAt:string};
type Result={enabled:boolean;privacyUrl?:string|null;profile:Profile|null};
type Action={action:"login"|"logout"|"import_guest"}|{action:"delete";confirm:true}|{action:"preferences";name:string;deck:DeckTheme};
const decks:{id:DeckTheme;label:string}[]=[{id:"refined",label:"Illustrated"},{id:"characters",label:"Characters"},{id:"original",label:"Original"}];
async function request(action?:Action){
 const res=await fetch("/api/account",{method:action?"POST":"GET",credentials:"same-origin",cache:"no-store",...(action?{headers:{"Content-Type":"application/json"},body:JSON.stringify(action)}:{})});
 if(!res.ok)throw Error("account unavailable");
 return res.json();
}
function validated(value:Result):Result{
 if(typeof value?.enabled!=="boolean"||(value.profile!==null&&(value.profile?.kind!=="account"||typeof value.profile.name!=="string"||!decks.some(d=>d.id===value.profile?.deck)||!Number.isFinite(Date.parse(value.profile.expiresAt)))))throw Error("invalid account");
 return value;
}
export default function AccountPanel(){
 const router=useRouter(),lock=useRef(false);
 const [data,setData]=useState<Result|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState(""),[name,setName]=useState(""),[deck,setDeck]=useState<DeckTheme>("refined"),[confirm,setConfirm]=useState(false),[saved,setSaved]=useState(false);
 async function update(action?:Action){
  if(lock.current)return;lock.current=true;setBusy(true);setError("");setSaved(false);
  try{
   const response=await request(action);
   if(action?.action==="login"){
    const url=new URL(response.url);
    if(url.origin!=="https://accounts.google.com"||url.pathname!=="/o/oauth2/v2/auth")throw Error("invalid sign-in destination");
    window.location.assign(url.href);return;
   }
   const next=validated(response);setData(next);setConfirm(false);
   if(next.profile){setName(next.profile.name);setDeck(next.profile.deck);}
   if(action?.action==="preferences"||action?.action==="import_guest")setSaved(true);
  }catch{setError(action?.action==="import_guest"?"No active guest profile could be imported.":"Account unavailable. You can still play for free.")}
  finally{lock.current=false;setBusy(false);}
 }
 useEffect(()=>{
  void update().then(()=>{
   const login=new URLSearchParams(window.location.search).get("login");
   if(login==="failed"||login==="unavailable")setError("Sign-in was not completed. You can try again.");
  });
 },[]);
 function play(){
  if(!data?.profile)return;
  try{localStorage.setItem("stack-next-display-name",data.profile.name);localStorage.setItem("stack-next-deck-theme-v1",data.profile.deck);router.push("/play");}
  catch{setError("This browser could not save your game settings.")}
 }

 return <section className="mode-card" aria-label="Persistent account">
  <div className="eyebrow">YOUR ACCOUNT</div><h2>Play on every device.</h2>
  {busy&&<p role="status">Connecting to your account…</p>}
  {error&&<p role="alert">{error} <button type="button" className="learn-button" disabled={busy} onClick={()=>void update()}>Retry</button></p>}
  {data?.privacyUrl&&<p><a href={data.privacyUrl}>Privacy notice</a></p>}
  {data&&!data.enabled&&!data.profile&&<p role="status">Sign-in is not available yet. Account preferences, saved rounds and optional XP will be available when enabled. You can still play for free.</p>}
  {data?.enabled&&!data.profile&&<><p>Sign in to keep your nickname and favorite deck across devices, and access optional private history and progression when available. A free guest profile or no account still works.</p><button className="cta" disabled={busy} onClick={()=>void update({action:"login"})}>Continue with Google</button></>}
  {data?.profile&&<>
   <form onSubmit={e=>{e.preventDefault();void update({action:"preferences",name,deck});}}>
    <label>Account nickname <input maxLength={24} required value={name} disabled={busy||!data.enabled} onChange={e=>{setName(e.target.value);setSaved(false);}}/></label>
    <label>Account deck <select value={deck} disabled={busy||!data.enabled} onChange={e=>{setDeck(e.target.value as DeckTheme);setSaved(false);}}>{decks.map(d=><option key={d.id} value={d.id}>{d.label}</option>)}</select></label>
    <button className="cta" disabled={busy||!data.enabled||!name.trim()} type="submit">Save account preferences</button>
   </form>
   {saved&&<p role="status">Account preferences saved.</p>}
   <button className="learn-button" disabled={busy||!data.enabled} onClick={()=>void update({action:"import_guest"})}>Copy guest preferences to account</button>
   <button className="learn-button" disabled={busy} onClick={play}>Play with account preferences →</button>
   <PlayerProgression/>
   <SavedRoundHistory/>
   <button className="secondary-button" disabled={busy} onClick={()=>void update({action:"logout"})}>Sign out</button>
   {confirm?<div><p>Delete your account, saved personal history, progression and every signed-in session? Your local games and guest profile are separate.</p><button className="secondary-button profile-danger" disabled={busy} onClick={()=>void update({action:"delete",confirm:true})}>Delete account permanently</button><button className="learn-button" disabled={busy} onClick={()=>setConfirm(false)}>Cancel account deletion</button></div>:<button className="learn-button profile-danger" disabled={busy} onClick={()=>setConfirm(true)}>Delete account</button>}
  </>}
 </section>;
}
