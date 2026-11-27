"use client";
import {useEffect,useState} from "react";
type Achievement={id:string;name:string;rounds:number;unlocked:boolean};
type Progress={version:1;xp:number;level:number;levelXP:number;nextLevelXP:number;rewardedRounds:number;achievements:Achievement[]};
function valid(p:Progress){return p?.version===1&&Number.isSafeInteger(p.xp)&&p.xp>=0&&Number.isInteger(p.level)&&p.level>=1&&Number.isInteger(p.levelXP)&&p.levelXP>=0&&p.nextLevelXP===100&&p.levelXP<p.nextLevelXP&&Number.isSafeInteger(p.rewardedRounds)&&p.rewardedRounds>=0&&Array.isArray(p.achievements)&&p.achievements.length===4&&p.achievements.every(a=>typeof a.id==="string"&&typeof a.name==="string"&&Number.isInteger(a.rounds)&&typeof a.unlocked==="boolean");}
export default function PlayerProgression(){
 const [data,setData]=useState<Progress|null>(null),[available,setAvailable]=useState<boolean|null>(null),[error,setError]=useState(false),[retry,setRetry]=useState(0);
 useEffect(()=>{
  const controller=new AbortController();
  setError(false);setAvailable(null);setData(null);
  void (async()=>{try{
   const res=await fetch("/api/account",{method:"POST",credentials:"same-origin",cache:"no-store",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"progression"}),signal:AbortSignal.any([controller.signal,AbortSignal.timeout(10000)])});
   if(!res.ok)throw Error("progress unavailable");
   const result=await res.json();
   if(typeof result?.available!=="boolean"||(result.available&&!valid(result.progression)))throw Error("invalid progress");
   if(!controller.signal.aborted){setAvailable(result.available);setData(result.progression)}
  }catch{if(!controller.signal.aborted)setError(true)}})();
  return()=>controller.abort();
 },[retry]);
 if(available===false)return null;
 return <section className="player-progression" aria-label="Player progression">
  <div className="eyebrow">YOUR PROGRESS</div><h3>Make your mark.</h3>
  {error?<p role="alert">Could not load progression. <button className="learn-button" onClick={()=>setRetry(x=>x+1)}>Retry progress</button></p>:!data?<p role="status">Loading progression…</p>:<>
   <div className="progress-level"><strong>Level {data.level}</strong><span>{data.xp.toLocaleString()} XP</span></div>
   <progress aria-label="XP to next level" max={data.nextLevelXP} value={data.levelXP}/><p>{data.nextLevelXP-data.levelXP} XP to level {data.level+1} · {data.rewardedRounds} rewarded rounds</p>
   <p>Optional casual progress only. No ranking, spending, or penalties for time away. Choose Save round and earn XP in table Settings before an all-human round.</p>
   <h4>Achievements</h4><ul className="achievement-list">{data.achievements.map(a=><li key={a.id}><strong>{a.name}</strong><small>{a.unlocked?"Unlocked":`${Math.min(data.rewardedRounds,a.rounds)}/${a.rounds} rewarded rounds`}</small></li>)}</ul>
  </>}
 </section>;
}
