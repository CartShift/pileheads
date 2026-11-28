"use client";
import {useState,useRef} from "react";
import styles from "./commerce-admin.module.css";
type Stock={units:number;low_threshold:number;version:number};
type Overview={orders:number;pending:number;paid:number;expired:number;gross_minor:string;units_paid:string;to_pack:number;to_ship:number;shipped:number;stock:Stock};
type Order={id:string;quantity:number;amount_minor:number;state:string;fulfillment_state:string;created_at:string;updated_at:string};
const money=(minor:number|string)=>new Intl.NumberFormat("en-DE",{style:"currency",currency:"EUR"}).format(Number(minor)/100);
export default function CommerceAdmin(){
 const credential=useRef(""),lock=useRef(false);
 const [token,setToken]=useState(""),[overview,setOverview]=useState<Overview|null>(null),[orders,setOrders]=useState<Order[]>([]),[busy,setBusy]=useState(false),[error,setError]=useState(""),[filter,setFilter]=useState("all"),[offset,setOffset]=useState(0),[more,setMore]=useState(false),[delta,setDelta]=useState(""),[reason,setReason]=useState("test_receipt");
 async function api(body:object){
  const res=await fetch("/api/commerce-test-admin",{method:"POST",cache:"no-store",headers:{"Content-Type":"application/json",Authorization:"Bearer "+credential.current},body:JSON.stringify(body)});
  if(!res.ok)throw Error(res.status===401?"Access denied.":res.status===409?"State changed. Refresh and retry.":"Sandbox unavailable.");
  return res.json();
 }
 async function load(f=filter,o=offset){
  const [a,b]=await Promise.all([api({action:"overview"}),api({action:"orders",filter:f,offset:o})]);
  setOverview(a.overview);setOrders(b.orders);setMore(b.hasMore);setFilter(f);setOffset(o);
 }
 async function run(work:()=>Promise<void>){
  if(lock.current)return;lock.current=true;setBusy(true);setError("");
  try{await work();}catch(e){setError(e instanceof Error?e.message:"Operation failed.");}finally{lock.current=false;setBusy(false);}
 }
 function logout(){credential.current="";setToken("");setOverview(null);setOrders([]);setError("");}
 return <main className={styles.main}>
  <header className={styles.header}><div><p>PILEHEADS / OPERATIONS</p><h1>Commerce sandbox</h1><p>Test data only. No real sales, shipping or refunds.</p></div>{overview&&<button disabled={busy} onClick={logout}>Sign out</button>}</header>
  {!overview?<form className={styles.panel} onSubmit={e=>{e.preventDefault();void run(async()=>{credential.current=token;try{await load("all",0);setToken("");}catch(e){credential.current="";throw e;}});}}><h2>Operator access</h2><p>Available only on the configured protected preview. Credential stays in memory.</p><label>Operator token<input type="password" autoComplete="off" value={token} required onChange={e=>setToken(e.target.value)}/></label><button disabled={busy}>Open sandbox</button></form>:<>
  <div className={styles.metrics}>{[["Test gross payments",money(overview.gross_minor)],["Paid orders",overview.paid],["Pending orders",overview.pending],["Expired orders",overview.expired],["Units paid",overview.units_paid],["To pack",overview.to_pack],["To ship",overview.to_ship],["Simulated shipped",overview.shipped]].map(([label,value])=><article key={label}><p>{label}</p><strong>{value}</strong></article>)}</div>
  <section className={styles.panel}><h2>Rehearsal stock</h2><p><strong>{overview.stock.units} units</strong> · {overview.stock.units<=overview.stock.low_threshold?"Low stock":"Stock above threshold"}</p><p>Independent of test checkout. Adjustments do not reserve or sell units.</p><form className={styles.controls} onSubmit={e=>{e.preventDefault();const n=Number(delta);if(!Number.isInteger(n)||!n)return;void run(async()=>{await api({action:"adjust",eventId:crypto.randomUUID(),delta:n,reason,version:overview.stock.version});setDelta("");await load();});}}><label>Adjustment<input type="number" min="-100000" max="100000" step="1" required value={delta} onChange={e=>setDelta(e.target.value)}/></label><label>Reason<select value={reason} onChange={e=>setReason(e.target.value)}><option value="test_receipt">Test receipt</option><option value="count_correction">Count correction</option></select></label><button disabled={busy}>Apply adjustment</button></form></section>
  <section className={styles.panel}><div className={styles.controls}><h2>Test orders</h2><label>Payment state<select disabled={busy} value={filter} onChange={e=>void run(()=>load(e.target.value,0))}>{["all","pending","paid","expired"].map(s=><option key={s}>{s}</option>)}</select></label><button disabled={busy} onClick={()=>void run(()=>load())}>Refresh</button></div>
  <div className={styles.table}><table><thead><tr>{["Order","Date","Quantity","Total","Payment","Fulfillment","Action"].map(x=><th key={x} scope="col">{x}</th>)}</tr></thead><tbody>{orders.map(o=><tr key={o.id}><td title={o.id}>{o.id.slice(0,8)}</td><td>{new Date(o.created_at).toLocaleDateString()}</td><td>{o.quantity}</td><td>{money(o.amount_minor)}</td><td>{o.state}</td><td>{o.fulfillment_state}</td><td>{o.state==="paid"&&o.fulfillment_state!=="shipped"?<button disabled={busy} onClick={()=>void run(async()=>{await api({action:"advance",id:o.id,expected:o.fulfillment_state,eventId:crypto.randomUUID()});await load();})}>{o.fulfillment_state==="unfulfilled"?"Simulate packing":"Simulate shipping"}</button>:"—"}</td></tr>)}</tbody></table>{!orders.length&&<p>No test orders match this filter.</p>}</div>
  <div className={styles.controls}><button disabled={busy||offset===0} onClick={()=>void run(()=>load(filter,offset-25))}>Previous</button><span>Page {offset/25+1}</span><button disabled={busy||!more} onClick={()=>void run(()=>load(filter,offset+25))}>Next</button></div></section>
 </>}{error&&<p role="alert" className={styles.error}>{error}</p>}</main>;
}
