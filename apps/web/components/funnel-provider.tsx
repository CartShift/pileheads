"use client";
import {createContext,useCallback,useContext,useEffect,useRef,useState} from "react";
import {usePathname} from "next/navigation";
import {campaignFromSearch,growthPost,growthStatus,type Attribution,type GrowthStatus} from "../lib/growth-api";

export type FunnelEvent="play_opened"|"first_started"|"first_completed"|"rematch_started"|"invite_copied"|"room_joined"|"result_shared";
const order:FunnelEvent[]=["play_opened","first_started","first_completed","rematch_started","invite_copied","room_joined","result_shared"];
const STORAGE="pileheads-funnel-consent-v1";
const DAY=86400000;
type Session={id:string;token:string;entry:"home"|"play"|"invite";attribution:Attribution;noticeVersion:string;createdAt:number;registered:boolean;withdrawn:boolean};
type Context={available:boolean;active:boolean;hasSession:boolean;canBegin:boolean;busy:boolean;message:string;privacyUrl:string|null;sessionId:string|null;begin:()=>Promise<void>;stop:()=>Promise<void>;emit:(event:FunnelEvent)=>void};
const noop=()=>{};
const Funnel=createContext<Context>({available:false,active:false,hasSession:false,canBegin:false,busy:false,message:"",privacyUrl:null,sessionId:null,begin:async()=>{},stop:async()=>{},emit:noop});
export const useFunnel=()=>useContext(Funnel);
const eligible=(p:string)=>["/","/stack","/play","/stack/","/play/"].includes(p);
const play=(p:string)=>p==="/play"||p==="/play/";
function load():Session|null{
  try{
    const s=JSON.parse(sessionStorage.getItem(STORAGE)||"null");
    if(!s||typeof s.id!=="string"||!/^[a-f0-9-]{36}$/.test(s.id)||typeof s.token!=="string"||!/^[a-f0-9]{64}$/.test(s.token)||!Number.isFinite(s.createdAt)||!["home","play","invite"].includes(s.entry)||typeof s.noticeVersion!=="string"||typeof s.registered!=="boolean"||typeof s.withdrawn!=="boolean")return null;
    // The only stored campaign strings are the fixed-category values.
    const p=new URLSearchParams({utm_source:String(s.attribution?.source??""),utm_medium:String(s.attribution?.medium??""),utm_campaign:String(s.attribution?.campaign??"")});
    return {id:s.id,token:s.token,entry:s.entry,createdAt:s.createdAt,noticeVersion:s.noticeVersion,registered:s.registered,withdrawn:s.withdrawn,attribution:campaignFromSearch(p.toString())};
  }catch{return null;}
}
function persist(s:Session|null){
  try{if(s)sessionStorage.setItem(STORAGE,JSON.stringify(s));else sessionStorage.removeItem(STORAGE);}catch{}
}
const fresh=(s:Session)=>Date.now()-s.createdAt>=0&&Date.now()-s.createdAt<DAY;
const token=()=>Array.from(crypto.getRandomValues(new Uint8Array(32)),n=>n.toString(16).padStart(2,"0")).join("");
function request(s:Session,action:string,extra:object={}){
  return growthPost({action,id:s.id,token:s.token,...extra});
}

export default function FunnelProvider({children}:{children:React.ReactNode}){
  const pathname=usePathname()??"";
  const [status,setStatus]=useState<GrowthStatus|null>(null);
  const [session,setSession]=useState<Session|null>(null);
  const [active,setActive]=useState(false);
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState("");
  const ref=useRef<Session|null>(null),activeRef=useRef(false),busyRef=useRef(false);
  const observed=useRef(new Set<FunnelEvent>()),sent=useRef(new Set<FunnelEvent>());
  const running=useRef<Promise<void>|null>(null);
  const setRecord=useCallback((s:Session|null)=>{ref.current=s;persist(s);setSession(s);},[]);
  const activate=useCallback((on:boolean)=>{activeRef.current=on;setActive(on);},[]);
  const flush=useCallback(()=>{
    if(running.current||!activeRef.current||!ref.current)return;
    const s=ref.current;
    const job=async()=>{
      while(activeRef.current&&ref.current?.id===s.id&&fresh(s)){
        const event=order.find(v=>observed.current.has(v)&&!sent.current.has(v));
        if(!event)break;
        try{await request(s,"funnel_event",{event,noticeVersion:s.noticeVersion});sent.current.add(event);}
        catch{break;} // A later observation may retry; no gameplay or infinite retries.
      }
    };
    running.current=job().finally(()=>{running.current=null;});
  },[]);
  const emit=useCallback((event:FunnelEvent)=>{
    const s=ref.current;
    if(!activeRef.current||!s||!fresh(s))return;
    if(event!=="play_opened")observed.current.add("play_opened");
    observed.current.add(event);flush();
  },[flush]);
  useEffect(()=>{
    const s=load();ref.current=s;setSession(s);
  },[]);
  useEffect(()=>{
    if(!eligible(pathname))return;
    let live=true;
    growthStatus().then(v=>{if(live)setStatus(v);}).catch(()=>{if(live)setStatus(null);});
    return()=>{live=false;};
  },[pathname]);
  useEffect(()=>{
    const s=ref.current;
    activate(!!(status?.funnel&&s?.registered&&!s.withdrawn&&fresh(s)&&s.noticeVersion===status.noticeVersion));
  },[status,session,activate]);
  useEffect(()=>{if(active&&play(pathname))emit("play_opened");},[active,pathname,emit]);

  const begin=async()=>{
    if(busyRef.current||activeRef.current||!status?.funnel||!status.noticeVersion||!status.privacyUrl)return;
    let s=ref.current;
    if(s&&(s.withdrawn||!fresh(s)||s.noticeVersion!==status.noticeVersion))return;
    busyRef.current=true;setBusy(true);setMessage("");
    try{
      if(!s){
        const search=window.location.search,p=new URLSearchParams(search);
        s={id:crypto.randomUUID(),token:token(),entry:play(pathname)?(/^[a-zA-Z0-9]{8}$/.test(p.get("room")||"")?"invite":"play"):"home",attribution:campaignFromSearch(search),noticeVersion:status.noticeVersion,createdAt:Date.now(),registered:false,withdrawn:false};
        observed.current.clear();sent.current.clear();setRecord(s);
      }
      await request(s,"funnel_start",{entry:s.entry,attribution:s.attribution,noticeVersion:s.noticeVersion});
      setRecord({...s,registered:true});activate(true);
    }catch{setMessage("Could not start measurement. Retry or remove the session request.");}
    finally{busyRef.current=false;setBusy(false);}
  };
  const stop=async()=>{
    const s=ref.current;if(!s||busyRef.current)return;
    busyRef.current=true;setBusy(true);setMessage("");
    activate(false);setRecord({...s,withdrawn:true});
    try{
      await running.current;
      await request(s,"funnel_delete");
      observed.current.clear();sent.current.clear();setRecord(null);
      setMessage("Measurement stopped and session removal requested.");
    }catch{setMessage("Measurement stopped. Removal could not be confirmed; retry before closing this tab.");}
    finally{busyRef.current=false;setBusy(false);}
  };
  const available=!!(status?.funnel&&status.noticeVersion&&status.privacyUrl);
  const canBegin=available&&!active&&(!session||!session.withdrawn&&fresh(session)&&session.noticeVersion===status?.noticeVersion);
  return <Funnel.Provider value={{available,active,hasSession:!!session,canBegin,busy,message,privacyUrl:status?.privacyUrl??null,sessionId:active?session?.id??null:null,begin,stop,emit}}>{children}</Funnel.Provider>;
}

export function FunnelConsent(){
  const f=useFunnel();
  if(!f.available&&!f.hasSession&&!f.message)return null;
  return <section aria-label="Optional session measurement" style={{padding:12,border:"1px solid currentColor",borderRadius:8,margin:"10px 0",maxWidth:540}}>
    <strong>Optional game improvement measurement</strong>
    <p>Allow one temporary browser session to measure game entry, completion, replay and share actions. No names, room codes or card contents. No cross-day tracking. You can play without agreeing.</p>
    {f.privacyUrl&&<p><a href={f.privacyUrl} target="_blank" rel="noreferrer">Privacy notice</a></p>}
    {f.active?<p>Session measurement is on.</p>:null}
    {f.canBegin&&<button type="button" className="secondary-button" disabled={f.busy} onClick={()=>void f.begin()}>{f.hasSession?"Retry measurement":"Allow session measurement"}</button>}
    {f.hasSession&&<button type="button" className="secondary-button" disabled={f.busy} onClick={()=>void f.stop()}>Stop and remove session data</button>}
    <p role="status">{f.message}</p>
  </section>;
}
