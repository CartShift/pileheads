"use client";
import {useEffect,useState} from "react";
import type {RoomGame} from "../../../packages/game-protocol";
type Deadline=NonNullable<RoomGame["deadline"]>;
const labels={setup:"Setup",turn:"Turn",dump:"DUMP decision",counter:"Counter DUMP",intermission:"Next round"};
export default function PublicDeadline({deadline,me}:{deadline:Deadline;me:number}){
 const [seconds,setSeconds]=useState(Math.max(0,Math.ceil(deadline.remainingMs/1000)));
 useEffect(()=>{
  const started=performance.now(),remaining=Math.max(0,deadline.remainingMs);
  const tick=()=>setSeconds(Math.max(0,Math.ceil((remaining-(performance.now()-started))/1000)));
  tick();const timer=setInterval(tick,250);return()=>clearInterval(timer);
 },[deadline.expiresAt,deadline.remainingMs]);
 const owner=deadline.seat===null?"":deadline.seat===me?" · You":" · Opponent";
 return <span aria-label={labels[deadline.kind]+" time remaining"}>{labels[deadline.kind]}{owner} · {seconds}s{seconds===0?" · Checking server":""}</span>;
}
