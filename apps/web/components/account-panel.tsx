"use client";
import Link from "next/link";
import {useEffect,useRef,useState} from "react";
import {DECKS,deckPlayHref,isDeckTheme,type DeckTheme} from "../lib/deck-registry";
type Profile={kind:"account";deck:DeckTheme;owned:string[]};
type State={enabled:boolean;profile:Profile|null};
type Action={action:"login"|"logout"|"import_guest"|"delete"}|{action:"preferences";deck:DeckTheme}|{action:"redeem";code:string};
export default function AccountPanel(){
 const [data,setData]=useState<State|null>(null),[busy,setBusy]=useState(false),[message,setMessage]=useState(""),[code,setCode]=useState(""),[confirm,setConfirm]=useState(false);
 const lock=useRef(false);
 async function update(action?:Action){
  if(lock.current)return;lock.current=true;setBusy(true);setMessage("");
  try{
   const r=await fetch("/api/account",{method:action?"POST":"GET",credentials:"same-origin",cache:"no-store",referrerPolicy:"origin",...(action?{headers:{"Content-Type":"application/json"},body:JSON.stringify(action)}:{})});
   if(!r.ok){setMessage(r.status===409?"Code unavailable or no guest preference to import.":r.status===401?"Sign in again to continue.":"Account service unavailable. You can still play.");return;}
   const result=await r.json();
   if(action?.action==="login"){
    const url=new URL(result.url);
    if(url.origin!=="https://accounts.google.com"||url.pathname!=="/o/oauth2/v2/auth")throw Error("invalid_login_url");
    window.location.assign(url.href);return;
   }
   setData(result);setConfirm(false);
   if(action?.action==="redeem"){setCode("");setMessage("Code accepted. Your collection has been updated.");}
   if(action?.action==="import_guest")setMessage("Guest deck preference imported.");
  }catch{setMessage("Account service unavailable. You can still play.");}
  finally{lock.current=false;setBusy(false);}
 }
 useEffect(()=>{void update();},[]);
 const profile=data?.profile;
 return <section className="guest-profile-panel" aria-label="STACK account">
  {busy&&<p role="status">Connecting…</p>}{message&&<p role="status">{message}</p>}
  {data&&!data.enabled&&<p>Recoverable accounts are not available yet. <Link href="/profile">Use a guest profile</Link> or keep playing.</p>}
  {data?.enabled&&!profile&&<><h2>Keep your collection.</h2><p>Sign in with Google to recover your account across devices. STACK requests only your unique account identifier, not your email or contacts.</p><button className="cta" disabled={busy} onClick={()=>void update({action:"login"})}>Continue with Google</button></>}
  {profile&&<><div className="eyebrow">YOUR ACCOUNT</div><h2>Your collection</h2>
   <label>Favorite deck <select value={profile.deck} disabled={busy} onChange={e=>{if(isDeckTheme(e.target.value))void update({action:"preferences",deck:e.target.value});}}>{DECKS.map(d=><option key={d.id} value={d.id}>{d.name}</option>)}</select></label>
   <p><Link className="cta" href={deckPlayHref(profile.deck)}>Play with my deck</Link></p>
   <button className="secondary-button" disabled={busy} onClick={()=>void update({action:"import_guest"})}>Import favorite deck from guest profile</button>
   <h3>Unlocked extras</h3><p>{profile.owned.includes("founder-supporter")?"Founder supporter badge unlocked.":"No extras unlocked yet."}</p>
   <form onSubmit={e=>{e.preventDefault();void update({action:"redeem",code:code.trim()});}}><label>Redemption code <input autoComplete="off" spellCheck={false} maxLength={32} value={code} onChange={e=>setCode(e.target.value)}/></label><button className="secondary-button" disabled={busy||!/^[A-Za-z0-9_-]{32}$/.test(code.trim())}>Redeem</button></form>
   <p><button className="secondary-button" disabled={busy} onClick={()=>void update({action:"logout"})}>Sign out</button></p>
   {confirm?<><p>Delete this account and its unlocked extras? Redeemed codes cannot be reused.</p><button className="secondary-button" disabled={busy} onClick={()=>void update({action:"delete"})}>Permanently delete account</button> <button className="secondary-button" onClick={()=>setConfirm(false)}>Cancel</button></>:<button className="subtle-link guest-delete" disabled={busy} onClick={()=>setConfirm(true)}>Delete account</button>}
  </>}
  <p><Link href="/play">Play without signing in</Link></p>
 </section>;
}
