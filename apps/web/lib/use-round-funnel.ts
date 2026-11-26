"use client";
import {useEffect,useRef} from "react";
import {useFunnel,type FunnelEvent} from "../components/funnel-provider";
type Sample={key:string;scope:string|null;phase:string;drill:boolean};
type Observer=object;
const Core=require("./funnel-observer.cjs") as {createObserver:()=>Observer;observe:(s:Observer,v:Sample)=>FunnelEvent[];requestRematch:(s:Observer,key:string,scope:string)=>void};
export function useRoundFunnel(sample:Sample){
  const funnel=useFunnel();
  const tracker=useRef<{session:string|null;observer:Observer}>({session:null,observer:Core.createObserver()});
  const {key,scope,phase,drill}=sample;
  const {sessionId,emit}=funnel;
  useEffect(()=>{
    if(tracker.current.session!==sessionId)tracker.current={session:sessionId,observer:Core.createObserver()};
    if(!sessionId)return;
    for(const event of Core.observe(tracker.current.observer,{key,scope,phase,drill}))emit(event);
  },[sessionId,key,scope,phase,drill,emit]);
  return {requestRematch:()=>{if(sessionId&&scope&&!drill&&phase==="over")Core.requestRematch(tracker.current.observer,key,scope);}};
}
