"use client";
import {useEffect,useState} from "react";
import {growthPost} from "../../lib/growth-api";
import Link from "next/link";
import SiteHeader from "../../components/site-header";
export default function DeckUpdates(){
  const [request,setRequest]=useState<{action:"waitlist_confirm"|"waitlist_unsubscribe";token:string}|null>(null);
  const [ready,setReady]=useState(false);
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState("");
  useEffect(()=>{
    const p=new URLSearchParams(location.hash.slice(1));
    const confirm=p.get("confirm"),unsubscribe=p.get("unsubscribe");
    const token=confirm||unsubscribe;
    if(token&&/^[a-f0-9]{64}$/.test(token)&&!(confirm&&unsubscribe)){
      setRequest({action:confirm?"waitlist_confirm":"waitlist_unsubscribe",token});
      history.replaceState(null,"",location.pathname);
    }
    setReady(true);
  },[]);
  async function submit(){
    if(!request||busy)return;
    setBusy(true);
    try{
      await growthPost(request);
      setMessage(request.action==="waitlist_confirm"?"Confirmed. You're on the list.":"Your address has been removed from the list.");
      setRequest(null);
    }catch{setMessage("This link may be expired or unavailable. You can try requesting a new confirmation.");}
    finally{setBusy(false);}
  }
  return <div className="launch-public deck-updates-shell"><SiteHeader/><main className="public-main"><section className="public-hero">
    <p>THE PHYSICAL GAME</p><h1>Deck updates</h1>
    {!ready?<p>Checking link…</p>:request?<><p>{request.action==="waitlist_confirm"?"Confirm that you want physical deck updates.":"Remove your email address from the waitlist."}</p><button className="public-cta" disabled={busy} onClick={()=>void submit()}>{request.action==="waitlist_confirm"?"Confirm subscription":"Unsubscribe"}</button></>:!message?<p>Open the link from your confirmation email to manage your request.</p>:null}
    <p role="status">{message}</p></section><Link href="/">Back to PILEHEADS</Link>
  </main></div>;
}
