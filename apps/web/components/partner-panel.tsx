"use client";
import Link from "next/link";
import {useEffect,useState} from "react";
import {deckPlayHref,isDeckTheme,type DeckTheme} from "../lib/deck-registry";
type Edition={slug:string;name:string;description:string;deck:DeckTheme;accent:string};
export default function PartnerPanel(){
 const [edition,setEdition]=useState<Edition|null>(null),[contact,setContact]=useState<string|null>(null),[missing,setMissing]=useState(false),[loading,setLoading]=useState(true);
 useEffect(()=>{
  let active=true;const slug=new URLSearchParams(window.location.search).get("partner");
  void fetch("/api/editions"+(slug===null?"":"?partner="+encodeURIComponent(slug)),{cache:"no-store",credentials:"omit",referrerPolicy:"origin"}).then(r=>r.ok?r.json():null).then(d=>{
   if(!active)return;
   if(slug!==null){const e=d?.edition;if(e&&isDeckTheme(e.deck)&&/^#[0-9a-f]{6}$/i.test(e.accent))setEdition(e);else setMissing(true);}
   else if(typeof d?.contact==="string")setContact(d.contact);
  }).catch(()=>{if(active&&slug!==null)setMissing(true);}).finally(()=>{if(active)setLoading(false);});
  return()=>{active=false;};
 },[]);
 return <section className="guest-profile-panel" style={edition?{borderColor:edition.accent}:undefined}>
  {loading?<p role="status">Loading edition…</p>:edition?<><div className="eyebrow">PARTNER EDITION</div><h2>{edition.name}</h2><p>{edition.description}</p><Link className="cta" href={deckPlayHref(edition.deck)}>Play this edition →</Link><p><Link href="/account">Redeem a private code</Link></p></>:missing?<><h2>Edition unavailable.</h2><p>This edition has not been published or is no longer available.</p><Link className="cta" href="/play">Play STACK</Link></>:<><div className="eyebrow">STACK FOR BUSINESS</div><h2>Good times, together.</h2><p>Explore branded editions, team events, creator collaborations and physical card bundles.</p>{contact?<a className="cta" href={"mailto:"+contact+"?subject="+encodeURIComponent("STACK partnership inquiry")}>Contact STACK</a>:<p>Partnership inquiries are not open online yet.</p>}<p><Link href="/play">Try the game first →</Link></p></>}
 </section>;
}
