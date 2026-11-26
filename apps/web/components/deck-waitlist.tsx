"use client";
import {useEffect,useState} from "react";
import {growthPost,growthStatus} from "../lib/growth-api";
export default function DeckWaitlist(){
  const [notice,setNotice]=useState<{privacyUrl:string;noticeVersion:string}|null>(null);
  const [email,setEmail]=useState("");
  const [consent,setConsent]=useState(false);
  const [pending,setPending]=useState(false);
  const [message,setMessage]=useState("");
  useEffect(()=>{let active=true;growthStatus().then(s=>{if(active&&s.waitlist&&s.privacyUrl&&s.noticeVersion)setNotice({privacyUrl:s.privacyUrl,noticeVersion:s.noticeVersion});}).catch(()=>{});return()=>{active=false;};},[]);
  if(!notice)return null;
  async function submit(event:React.FormEvent){
    event.preventDefault();
    if(pending||!consent||!notice)return;
    setPending(true);setMessage("");
    try{
      await growthPost({action:"waitlist_request",email,consent:true,noticeVersion:notice.noticeVersion});
      setEmail("");setConsent(false);
      setMessage("If confirmation is needed, check your inbox (and spam folder) for a confirmation link. Your subscription is not active until confirmed.");
    }catch{setMessage("We couldn't process the request right now. Please try again later.");}
    finally{setPending(false);}
  }
  return <form onSubmit={submit} style={{display:"grid",gap:12,maxWidth:440,marginTop:20}}>
    <h3>Get physical deck updates.</h3>
    <p>One email address, only for updates about the physical PILEHEADS deck. Confirm by email; unsubscribe anytime. This is not a preorder. <a href={notice.privacyUrl} target="_blank" rel="noreferrer">Privacy notice.</a></p>
    <label>Email address <input type="email" autoComplete="email" required maxLength={254} value={email} onChange={e=>setEmail(e.target.value)} style={{width:"100%",padding:10,color:"#1a2520",background:"#fffdf4",border:"1px solid currentColor",borderRadius:6}} /></label>
    <label style={{display:"flex",gap:8,alignItems:"start"}}><input type="checkbox" required checked={consent} onChange={e=>setConsent(e.target.checked)}/>I agree to receive physical deck updates by email.</label>
    <button className="secondary-button" disabled={pending||!consent} type="submit">{pending?"Requesting…":"Notify me"}</button>
    <p role="status">{message}</p>
  </form>;
}
