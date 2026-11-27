"use client";
import {useEffect,useRef,useState} from "react";
import {useRouter} from "next/navigation";
import Link from "next/link";
import type {DeckTheme} from "./card-view";

const decks:{id:DeckTheme;label:string}[]=[{id:"refined",label:"Illustrated"},{id:"characters",label:"Characters"},{id:"original",label:"Original"}];
type Profile={kind:"guest";name:string;deck:DeckTheme;expiresAt:string};
type Result={enabled:boolean;privacyUrl?:string|null;profile:Profile|null};
type Action={action:"create"|"delete"}|{action:"preferences";name:string;deck:DeckTheme};
async function request(action?:Action):Promise<Result>{
 const response=await fetch("/api/player",{method:action?"POST":"GET",credentials:"same-origin",cache:"no-store",
  ...(action?{headers:{"Content-Type":"application/json"},body:JSON.stringify(action)}:{})});
 if(!response.ok)throw Error("profile_unavailable");
 const data=await response.json();
 if(typeof data.enabled!=="boolean"||(data.profile!==null&&
  (data.profile?.kind!=="guest"||typeof data.profile.name!=="string"||!decks.some(d=>d.id===data.profile.deck)||!Number.isFinite(Date.parse(data.profile.expiresAt)))))
  throw Error("invalid_profile");
 return data;
}
export default function PlayerProfile(){
 const router=useRouter();
 const [data,setData]=useState<Result|null>(null);
 const [name,setName]=useState("");
 const [deck,setDeck]=useState<DeckTheme>("refined");
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState("");
 const [confirm,setConfirm]=useState(false);
 const [saved,setSaved]=useState(false);
 const lock=useRef(false);
 async function update(action?:Action){
  if(lock.current)return;
  lock.current=true;setBusy(true);setError("");setSaved(false);
  try{
   const next=await request(action);setData(next);setConfirm(false);
   if(next.profile){setName(next.profile.name);setDeck(next.profile.deck);}
   if(action?.action==="preferences")setSaved(true);
  }catch{setError("Could not update your profile. You can still play without one.");}
  finally{lock.current=false;setBusy(false);}
 }
 useEffect(()=>{void update();},[]);
 function usePreferences(){
  if(!data?.profile)return;
  try{
   localStorage.setItem("stack-next-display-name",data.profile.name);
   localStorage.setItem("stack-next-deck-theme-v1",data.profile.deck);
   router.push("/play");
  }catch{setError("This browser could not save your game settings.");}
 }
 return <div className="mode-card">
  <div className="eyebrow">YOUR PLAYER PROFILE</div><h2>Make it yours.</h2>
  {busy&&<p role="status">Connecting to your profile…</p>}
  {error&&<p role="alert">{error} <button type="button" className="learn-button" disabled={busy} onClick={()=>void update()}>Retry</button></p>}
  {data&&!data.enabled&&!data.profile&&<p>Guest profiles are not available yet. You can still play for free.</p>}
  {data?.enabled&&!data.profile&&<>
   <p>Create an optional profile for this browser. No email or password. It expires after 90 days; clearing cookies can remove access.</p>
   <p>This is not a recoverable account or purchase wallet.</p>
   {data.privacyUrl&&<p><a href={data.privacyUrl}>Privacy notice</a></p>}
   <button className="cta" disabled={busy} onClick={()=>void update({action:"create"})}>Create guest profile</button>
  </>}
  {data?.profile&&<>
   {!data.enabled&&<p role="status">Profile editing is temporarily unavailable. You can still delete your profile.</p>}
   {data.privacyUrl&&<p><a href={data.privacyUrl}>Privacy notice</a></p>}
   <p>Guest profile · Expires {new Date(data.profile.expiresAt).toLocaleDateString()}</p>
   <form onSubmit={e=>{e.preventDefault();void update({action:"preferences",name,deck});}}>
    <label>Nickname <input maxLength={24} required value={name} disabled={busy||!data.enabled} onChange={e=>{setName(e.target.value);setSaved(false);}}/></label>
    <label>Favorite deck <select value={deck} disabled={busy||!data.enabled} onChange={e=>{setDeck(e.target.value as DeckTheme);setSaved(false);}}>{decks.map(d=><option key={d.id} value={d.id}>{d.label}</option>)}</select></label>
    <button className="cta" type="submit" disabled={busy||!data.enabled||!name.trim()}>Save profile</button>
   </form>
   {saved&&<p role="status">Profile saved.</p>}
   <button className="learn-button" type="button" disabled={busy} onClick={usePreferences}>Play with saved preferences →</button>
   {confirm?<div><p>Delete your guest profile? Local game saves and settings are separate.</p>
    <button type="button" className="secondary-button profile-danger" disabled={busy} onClick={()=>void update({action:"delete"})}>Delete profile permanently</button>
    <button type="button" className="learn-button" disabled={busy} onClick={()=>setConfirm(false)}>Cancel</button></div>:
    <button className="learn-button profile-danger" type="button" disabled={busy} onClick={()=>setConfirm(true)}>Delete profile</button>}
  </>}
  <p><Link href="/play">Continue without a profile →</Link></p>
 </div>;
}
