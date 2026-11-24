"use client";
import Link from "next/link";
import {useEffect,useState} from "react";
export default function ShopPanel(){
 const [url,setUrl]=useState<string|null>(null),[loaded,setLoaded]=useState(false);
 useEffect(()=>{let active=true;void fetch("/api/storefront",{cache:"no-store",credentials:"omit"}).then(r=>r.ok?r.json():null).then(data=>{if(active&&typeof data?.physicalShopUrl==="string"){const u=new URL(data.physicalShopUrl);if(u.protocol==="https:")setUrl(u.href);}}).catch(()=>{}).finally(()=>{if(active)setLoaded(true);});return()=>{active=false;};},[]);
 return <section className="guest-profile-panel"><h2>Bring STACK to the table.</h2><p>54 cards. Two to five players. One pile. Play the same game online or with a physical deck.</p>{url?<a className="cta" href={url} rel="noopener noreferrer">Visit our physical shop</a>:<p>{loaded?"Physical editions are not on sale here yet.":"Checking availability…"}</p>}<p><Link href="/decks">Explore digital editions →</Link></p><p><Link href="/account">Redeem a code or view your collection →</Link></p></section>;
}
