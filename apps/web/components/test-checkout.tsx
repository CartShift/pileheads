"use client";
import {useEffect,useRef,useState} from "react";
type Draft={id:string;quantity:number};
const KEY="pileheads-test-cart-v1";
async function request(body:object){
 const response=await fetch("/api/commerce-test",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body),cache:"no-store"});
 if(!response.ok)throw Error("unavailable");return response.json();
}
export default function TestCheckout(){
 const [enabled,setEnabled]=useState(false),[quantity,setQuantity]=useState(1),[busy,setBusy]=useState(false),[message,setMessage]=useState("");
 const lock=useRef(false),draft=useRef<Draft|null>(null);
 useEffect(()=>{let active=true;
  fetch("/api/commerce-test",{cache:"no-store"}).then(r=>r.ok?r.json():null).then(async s=>{
   if(!active||s?.enabled!==true||s.unitMinor!==1500||s.currency!=="EUR")return;
   setEnabled(true);
   try{const saved=JSON.parse(sessionStorage.getItem(KEY)||"null");if(saved&&typeof saved.id==="string"&&Number.isInteger(saved.quantity)&&saved.quantity>=1&&saved.quantity<=10){draft.current=saved;setQuantity(saved.quantity);}}catch{}
   const returned=new URLSearchParams(location.search).get("test");
   if(returned==="cancel"&&active)setMessage("Test checkout cancelled. No order has been fulfilled.");
   if(returned==="return"&&draft.current){try{const result=await request({action:"status",id:draft.current.id});if(active)setMessage(result.state==="paid"?"Test payment verified. No physical product will be shipped.":"Payment verification is pending. Refresh this page to check again.");}catch{if(active)setMessage("Unable to verify the test payment yet.");}}
  }).catch(()=>{});
  return()=>{active=false;};
 },[]);
 if(!enabled)return null;
 async function checkout(){
  if(lock.current)return;lock.current=true;setBusy(true);setMessage("");
  try{
   if(!draft.current||draft.current.quantity!==quantity){draft.current={id:crypto.randomUUID(),quantity};sessionStorage.setItem(KEY,JSON.stringify(draft.current));}
   const r=await request({action:"checkout",...draft.current});const url=new URL(r.url);
   if(url.origin!=="https://checkout.stripe.com")throw Error("invalid_url");
   location.assign(url.href);
  }catch{setMessage("Test checkout unavailable. Retry or start a new test cart.");}
  finally{lock.current=false;setBusy(false);}
 }
 function reset(){draft.current=null;sessionStorage.removeItem(KEY);setMessage("");setQuantity(1);}
 return <section aria-label="Test shopping cart" style={{border:"2px dashed #086879",padding:16,borderRadius:12,margin:"20px 0"}}>
  <h3>Sandbox cart</h3><p>TEST ONLY. Use fictional contact information and Stripe test cards. No real payment, stock reservation or delivery. Test shipping and tax are zero.</p>
  <label>Quantity <select value={quantity} disabled={busy} onChange={e=>setQuantity(Number(e.target.value))}>{Array.from({length:10},(_,i)=><option key={i+1} value={i+1}>{i+1}</option>)}</select></label>
  <p>Test subtotal: {new Intl.NumberFormat("en-DE",{style:"currency",currency:"EUR"}).format(quantity*15)}</p>
  <button type="button" className="public-cta" disabled={busy} onClick={()=>void checkout()}>{busy?"Opening sandbox…":"Test checkout"}</button><button type="button" className="public-cta" disabled={busy} onClick={reset}>New test cart</button>
  <p role="status">{message}</p>
 </section>;
}
