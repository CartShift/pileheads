"use client";
import {useState} from "react";

type Round={started:number;completed:number;notObservedCompleted:number;observedCompletionFraction:number|null};
type Rating={answered:number;unanswered:number;mean:number|null;distribution:number[]};
type Summary={reports:{received:number;included:number;excludedTruncated:number};rounds:{local:Round;online:Round;all:Round};feedback:{fun:Rating;clarity:Rating;wouldReplay:{yes:number;no:number;unsure:number;unanswered:number;statedYesFraction:number|null}};limitations:string[]};
type FunnelMetrics={sessions:number;homeSessions:number;homeToPlay:number;opened:number;started:number;completed:number;rematch:number;inviteCopied:number;roomJoined:number;resultShared:number;inviteEntrySessions:number;inviteEntryJoined:number;startFraction:number|null;completionFraction:number|null;rematchFraction:number|null};
type FunnelSummary={all:FunnelMetrics;sources:Record<string,FunnelMetrics>;campaigns:Record<string,FunnelMetrics>};
type Dashboard={windowDays:number;all:Summary;sources:Record<string,Summary>;waitlist:{confirmed:number;pending:number};funnel:FunnelSummary|null};
const pct=(n:number|null)=>n===null?"—":Math.round(n*100)+"%";
const decimal=(n:number|null)=>n===null?"—":n.toFixed(1);
export default function GrowthDashboard(){
  const [token,setToken]=useState("");
  const [data,setData]=useState<Dashboard|null>(null);
  const [message,setMessage]=useState("");
  const [busy,setBusy]=useState(false);
  async function load(e:React.FormEvent){
    e.preventDefault();if(!token||busy)return;
    setBusy(true);setMessage("");setData(null);
    try{
      const response=await fetch("/api/growth?summary=1",{headers:{Authorization:"Bearer "+token},credentials:"omit",cache:"no-store",referrerPolicy:"no-referrer",signal:AbortSignal.timeout(10000)});
      if(!response.ok)throw Error("unavailable");
      const result=await response.json();if(!result.ok)throw Error("unavailable");
      setData(result);
    }catch{setMessage("Dashboard unavailable or access denied.");}
    finally{setToken("");setBusy(false);}
  }
  return <main style={{maxWidth:960,margin:"40px auto",padding:"0 20px",fontFamily:"system-ui"}}>
    <h1>PILEHEADS Growth</h1><p>Operator view · voluntary observations · not unique players</p>
    <form onSubmit={load} style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
      <label>Operator token <input type="password" autoComplete="off" required value={token} onChange={e=>setToken(e.target.value)}/></label>
      <button type="submit" disabled={busy}>Load report</button>
      {data&&<button type="button" onClick={()=>setData(null)}>Clear report</button>}
    </form><p role="status">{message}</p>
    {data&&<>
      <h2>Last {data.windowDays} days</h2>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:12}}>
        {[
          ["Reports included",data.all.reports.included],["Observed starts",data.all.rounds.all.started],
          ["Observed completions",data.all.rounds.all.completed],["Completion fraction",pct(data.all.rounds.all.observedCompletionFraction)],
          ["Fun / 5",decimal(data.all.feedback.fun.mean)],["Clarity / 5",decimal(data.all.feedback.clarity.mean)],
          ["Would replay",pct(data.all.feedback.wouldReplay.statedYesFraction)],["Confirmed deck emails",data.waitlist.confirmed]
        ].map(([label,value])=><section key={String(label)} style={{border:"1px solid currentColor",borderRadius:8,padding:12}}><small>{label}</small><div style={{fontSize:28,fontWeight:700}}>{value}</div></section>)}
      </div>
      <h2>Opted-in session funnel</h2>
      {data.funnel?<><p>Temporary browser sessions with explicit consent, not unique people or total site traffic.</p><div style={{display:"grid",gap:10}}>{([["Opted-in sessions","sessions"],["Opened play","opened"],["Started a round","started"],["Observed completion","completed"],["Started requested rematch","rematch"]] as const).map(([label,key])=><div key={key}><div style={{display:"flex",justifyContent:"space-between"}}><span>{label}</span><strong>{data.funnel!.all[key]}</strong></div><div style={{background:"#d9dedb",height:10,borderRadius:4}}><div style={{background:"#087f80",height:10,borderRadius:4,width:(data.funnel!.all.sessions?100*data.funnel!.all[key]/data.funnel!.all.sessions:0)+"%"}}/></div></div>)}</div><p>Start / opened: {pct(data.funnel.all.startFraction)} · Completion / started: {pct(data.funnel.all.completionFraction)} · Requested rematch started / completed: {pct(data.funnel.all.rematchFraction)}</p><p>Home consent sessions reaching play: {data.funnel.all.homeToPlay} / {data.funnel.all.homeSessions}. Invite-entry sessions joining a room: {data.funnel.all.inviteEntryJoined} / {data.funnel.all.inviteEntrySessions}. Invite copied: {data.funnel.all.inviteCopied}; room joined: {data.funnel.all.roomJoined}; result shared/copied: {data.funnel.all.resultShared}.</p>{(["sources","campaigns"] as const).map(group=><section key={group}><h3>Session {group}</h3><div style={{overflowX:"auto"}}><table style={{width:"100%",textAlign:"left"}}><thead><tr><th>Category</th><th>Sessions</th><th>Starts</th><th>Completed</th><th>Replay</th></tr></thead><tbody>{Object.entries(data.funnel![group]).map(([key,m])=><tr key={key}><td>{key}</td><td>{m.sessions}</td><td>{m.started}</td><td>{m.completed}</td><td>{m.rematch}</td></tr>)}</tbody></table></div></section>)}</>:<p>Session measurement is not configured.</p>}
      <h2>Observation modes</h2>
      {(["local","online"] as const).map(mode=><p key={mode}>{mode}: {data.all.rounds[mode].completed} / {data.all.rounds[mode].started} observed rounds completed ({pct(data.all.rounds[mode].observedCompletionFraction)})</p>)}
      <h2>Reported campaign source</h2>
      <div style={{overflowX:"auto"}}><table style={{width:"100%",textAlign:"left"}}><thead><tr><th>Source</th><th>Reports</th><th>Starts</th><th>Completions</th></tr></thead><tbody>
      {Object.entries(data.sources).map(([source,s])=><tr key={source}><td>{source}</td><td>{s.reports.included}</td><td>{s.rounds.all.started}</td><td>{s.rounds.all.completed}</td></tr>)}</tbody></table></div>
      <h2>Interpretation</h2><p>Excluded truncated reports: {data.all.reports.excludedTruncated}. Fun responses: {data.all.feedback.fun.answered}; clarity responses: {data.all.feedback.clarity.answered}. Pending confirmations: {data.waitlist.pending}. Waitlist counts are current totals, not restricted to the report window.</p>
      <ul>{data.all.limitations.map(note=><li key={note}>{note}</li>)}</ul>
      <p>Report campaign source describes voluntarily submitted observations. The separate session funnel covers consented sessions only; no total traffic, unique people, linked invite conversions or cross-day retention are available.</p>
    </>}
  </main>;
}
