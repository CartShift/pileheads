"use client";
import { useEffect, useRef, useState } from "react";
import { playSound, setSoundVolume, stopSound, unlockSound, type SoundEffect } from "../lib/sound";
import type { Event } from "../lib/engine";
const Policy = require("../lib/feedback-core.cjs") as {
  volumeValue: (value: unknown) => number;
  committedFeedback: (event: Event, cue: {kind:string}|null, phase: string, me:number, loser:number|null) => SoundEffect;
  HAPTICS: Partial<Record<SoundEffect,number|number[]>>;
};
const Motion = require("../lib/motion-core.cjs") as {
  fromCommittedEvent: (event: Event) => {kind:string}|null;
  advanceSoundCursor: (previous:{key:string;move:number}, input:{gameKey:string;moveNo:number;phase:string;event?:Event;enabled:boolean;visible:boolean}) => {cursor:{key:string;move:number};shouldPlay:boolean};
};
const VOLUME_KEY="stack-next-sfx-volume-v1", HAPTICS_KEY="stack-next-haptics-v1";
export const SOUND_KEY="stack-next-sound-enabled-v1";
function vibrate(pattern: number | number[]) {
  try { if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") navigator.vibrate(pattern); }
  catch { /* optional hardware */ }
}
export function useGameFeedback({gameKey, moveNo, phase, event, me, loser}: {
  gameKey:string; moveNo:number; phase:string; event?:Event; me:number; loser:number|null;
}) {
  const [soundEnabled,setSoundEnabled]=useState(false);
  const [volume,setVolume]=useState(70);
  const [haptics,setHaptics]=useState(false);
  const [supported,setSupported]=useState(false);
  const [loaded,setLoaded]=useState(false);
  const cursor=useRef({key:"",move:0});
  const scope=useRef(gameKey);
  useEffect(()=>{
    setSupported(typeof navigator.vibrate==="function");
    try {
      setSoundEnabled(localStorage.getItem(SOUND_KEY)==="true");
      setVolume(Policy.volumeValue(localStorage.getItem(VOLUME_KEY)));
      setHaptics(localStorage.getItem(HAPTICS_KEY)==="true");
    } catch {}
    setLoaded(true);
  },[]);
  useEffect(()=>{
    setSoundVolume(volume);
    if(!soundEnabled) stopSound();
    if(!haptics) vibrate(0);
    if(!loaded) return;
    try{
      localStorage.setItem(SOUND_KEY,String(soundEnabled));
      localStorage.setItem(VOLUME_KEY,String(volume));
      localStorage.setItem(HAPTICS_KEY,String(haptics));
    }catch{}
  },[soundEnabled,volume,haptics,loaded]);
  useEffect(()=>{
    const unlock=()=>{if(soundEnabled) unlockSound();};
    const hidden=()=>{if(document.visibilityState==="hidden"){stopSound();vibrate(0);}};
    window.addEventListener("pointerdown",unlock,true);
    window.addEventListener("keydown",unlock,true);
    document.addEventListener("visibilitychange",hidden);
    return ()=>{
      window.removeEventListener("pointerdown",unlock,true);
      window.removeEventListener("keydown",unlock,true);
      document.removeEventListener("visibilitychange",hidden);
    };
  },[soundEnabled]);
  useEffect(()=>()=>{stopSound();vibrate(0);},[]);
  useEffect(()=>{
    if(scope.current!==gameKey){scope.current=gameKey;stopSound();vibrate(0);}
    const result=Motion.advanceSoundCursor(cursor.current,{gameKey,moveNo,phase,event,
      enabled:soundEnabled||(haptics&&supported),visible:document.visibilityState==="visible"});
    cursor.current=result.cursor;
    if(!result.shouldPlay||!event) return;
    const effect=Policy.committedFeedback(event,Motion.fromCommittedEvent(event),phase,me,loser);
    if(soundEnabled) playSound(effect);
    // Remote ordinary moves must not vibrate the user's device continuously.
    if(haptics&&supported&&(event.seat===me||phase==="over")){
      const pattern=Policy.HAPTICS[effect]; if(pattern) vibrate(pattern);
    }
  },[gameKey,moveNo,phase,event,me,loser,soundEnabled,haptics,supported]);
  function changeSound(enabled:boolean){
    setSoundEnabled(enabled);
    if(enabled){setSoundVolume(volume);unlockSound();playSound("select");}
    else stopSound();
  }
  function changeHaptics(enabled:boolean){
    setHaptics(enabled);
    if(supported&&enabled) vibrate(8); else vibrate(0);
  }
  function select(){
    if(soundEnabled) playSound("select");
    if(haptics&&supported) vibrate(8);
  }
  return {soundEnabled,volume,haptics,supported,changeSound,changeHaptics,
    changeVolume:(next:number)=>{setVolume(Policy.volumeValue(next));setSoundVolume(Policy.volumeValue(next));},select};
}
