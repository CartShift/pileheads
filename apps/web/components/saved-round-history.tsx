"use client";
import {useEffect,useState} from "react";
type SavedRound={playedAt:string;round:number;players:number;humans:number;place:number;rulesVersion:string;endgameRule:"classic"|"final-duel";roundLimit:3|5|10|null};
type History={available:boolean;rounds:SavedRound[]};
function validRound(r:SavedRound){
 return !!r&&typeof r.playedAt==="string"&&Number.isFinite(Date.parse(r.playedAt))&&Number.isInteger(r.round)&&r.round>=1&&Number.isInteger(r.players)&&r.players>=2&&r.players<=5&&Number.isInteger(r.humans)&&r.humans>=1&&r.humans<=r.players&&Number.isInteger(r.place)&&r.place>=1&&r.place<=r.players&&(r.endgameRule==="classic"||r.endgameRule==="final-duel")&&[null,3,5,10].includes(r.roundLimit)&&typeof r.rulesVersion==="string";
}
export default function SavedRoundHistory(){
 const [data,setData]=useState<History|null>(null),[error,setError]=useState(false),[retry,setRetry]=useState(0);
 useEffect(()=>{
  const controller=new AbortController();
  setData(null);setError(false);
  void (async()=>{
   try{
    const response=await fetch("/api/account",{method:"POST",credentials:"same-origin",cache:"no-store",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"history"}),signal:AbortSignal.any([controller.signal,AbortSignal.timeout(10000)])});
    if(!response.ok)throw Error("history unavailable");
    const result=await response.json();
    if(typeof result?.available!=="boolean"||!Array.isArray(result.rounds)||result.rounds.length>50||!result.rounds.every(validRound))throw Error("invalid history");
    if(!controller.signal.aborted)setData(result);
   }catch{if(!controller.signal.aborted)setError(true)}
  })();
  return()=>controller.abort();
 },[retry]);
 if(data&&!data.available)return <section className="saved-round-history" aria-label="Saved round history"><div className="eyebrow">YOUR PRIVATE HISTORY</div><h3>Recent saved rounds</h3><p role="status">Private round history is not available yet.</p></section>;
 const rounds=data?.rounds??[],wins=rounds.filter(r=>r.place===1).length,losses=rounds.filter(r=>r.place===r.players).length;
 return <section className="saved-round-history" aria-label="Saved round history">
  <div className="eyebrow">YOUR PRIVATE HISTORY</div><h3>Recent saved rounds</h3>
  {error?<p role="alert">Could not load your history. <button className="learn-button" type="button" onClick={()=>setRetry(x=>x+1)}>Retry history</button></p>:!data?<p role="status">Loading saved rounds…</p>:<>
   <p>Up to 50 completed rounds from the last 90 days. Only rounds you selected before play appear here, including casual matches with bots. This is not a lifetime or ranked record.</p>
   {rounds.length===0?<p>No saved rounds yet. In an online room, open Settings and choose Save this round before the game starts.</p>:<>
    <div className="history-summary"><div><strong>{rounds.length}</strong><small>Saved</small></div><div><strong>{wins}</strong><small>First out</small></div><div><strong>{losses}</strong><small>Pilehead</small></div></div>
    <ol className="history-round-list">{rounds.map((r,i)=><li key={i}>
     <div><strong>{r.place===1?"First out":r.place===r.players?"Pilehead":`Place ${r.place} of ${r.players}`}</strong><small>{new Date(r.playedAt).toLocaleDateString()} · {r.roundLimit?`Tournament round ${r.round}/${r.roundLimit}`:`Round ${r.round}`}</small></div>
     <div><strong>{r.place}/{r.players}</strong><small>{r.humans} human{r.humans===1?"":"s"} · {r.players-r.humans} bot{r.players-r.humans===1?"":"s"}</small></div>
    </li>)}</ol>
   </>}
  </>}
 </section>;
}
