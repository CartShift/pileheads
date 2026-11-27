"use client";
import {useEffect,useState} from "react";
import {useRouter} from "next/navigation";
import type {DeckTheme} from "./card-view";

const NAME_KEY="stack-next-display-name", DECK_KEY="stack-next-deck-theme-v1";
const decks:{id:DeckTheme;label:string}[]=[{id:"refined",label:"Illustrated"},{id:"characters",label:"Characters"},{id:"original",label:"Original"}];

/** Browser-only settings, not an authenticated or server-backed profile. */
export default function LocalPreferences(){
 const router=useRouter();
 const [name,setName]=useState(""),[deck,setDeck]=useState<DeckTheme>("refined"),[ready,setReady]=useState(false),[saved,setSaved]=useState(false),[error,setError]=useState("");
 useEffect(()=>{
  try{
   setName((localStorage.getItem(NAME_KEY)||"").slice(0,24));
   const stored=localStorage.getItem(DECK_KEY);
   if(decks.some(d=>d.id===stored))setDeck(stored as DeckTheme);
  }catch{setError("Your browser is blocking local settings. You can still play.")}
  finally{setReady(true)}
 },[]);
 function save(play=false){
  if(!ready||!name.trim())return;
  setSaved(false);setError("");
  try{
   localStorage.setItem(NAME_KEY,name.trim());localStorage.setItem(DECK_KEY,deck);
   setName(name.trim());setSaved(true);
   if(play)router.push("/play");
  }catch{setError("Could not save your settings on this device. Check browser storage and retry.")}
 }
 return <section aria-label="Device preferences">
  <div className="eyebrow">THIS DEVICE ONLY</div>
  <p>Personalize your game without signing in. These settings stay in this browser; they do not sync across devices or earn account XP.</p>
  <form onSubmit={e=>{e.preventDefault();save()}}>
   <label>Nickname <input maxLength={24} required value={name} disabled={!ready} onChange={e=>{setName(e.target.value);setSaved(false)}}/></label>
   <label>Favorite deck <select value={deck} disabled={!ready} onChange={e=>{setDeck(e.target.value as DeckTheme);setSaved(false)}}>{decks.map(d=><option key={d.id} value={d.id}>{d.label}</option>)}</select></label>
   <button className="cta" type="submit" disabled={!ready||!name.trim()}>Save device preferences</button>
   <button className="learn-button" type="button" disabled={!ready||!name.trim()} onClick={()=>save(true)}>Save and play →</button>
  </form>
  {saved&&<p role="status">Preferences saved on this device.</p>}
  {error&&<p role="alert">{error}</p>}
 </section>
}
