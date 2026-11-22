"use client";

/**
 * Public, event-driven physical card storytelling for the React table.
 *
 * The server remains authoritative. Every participant replays the same public
 * move events, but each client measures its own seat and table coordinates.
 * Never inspect opponents' hands, blind slot identities, or the draw deck.
 */
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { createPortal } from "react-dom";
import type { Event } from "../lib/engine";
import type { BlindReveal } from "../lib/room";

type Point = {x:number;y:number};
type Scene = {
  key:string; event:Event; label:string; symbol:string; detail:string;
  kind:string; from:Point; pile:Point; playTo:Point; transferTo:Point;
  stock:Point; hand:Point; transfer:"pickup"|"burn"|"none";
  transferCount:number; drawnCount:number;
};
type Props = {
  gameKey:string; moveNo:number; phase:string; events:Event[];
  me:number; theme:"characters"|"original"; nameForSeat:(seat:number)=>string;
  blindReveal?:BlindReveal|null;
};
const SPECIAL_DURATION=2100;
const NORMAL_DURATION=1370;
const ACTIONS=["reset","ghost","under","skip","burn","dump"];
const center=(el:Element|null):Point|null=>{
  if(!el)return null;
  const r=el.getBoundingClientRect();
  return{x:r.left+r.width/2,y:r.top+r.height/2};
};
function cardFace(event:Event){
  const action=event.action||(["reset","ghost","under","skip","burn","dump"].includes(event.reason||"")?event.reason:null);
  if(action && ACTIONS.includes(action))return 10+ACTIONS.indexOf(action);
  if(typeof event.rank==="number"&&event.rank>=1&&event.rank<=10)return event.rank-1;
  return null;
}
function description(event:Event,name:(seat:number)=>string){
 const actor=name(event.seat),target=typeof event.target==="number"?name(event.target):"another player";
 const num=event.takenCount??event.count??0;
 // Ordinary cards explain themselves through movement. Only special actions
 // deserve a short visual emblem; longer descriptions are for screen readers.
 if(event.type==="blind-fail")return{label:"INVALID",symbol:"×",detail:`${actor} revealed an invalid card and collected ${num} cards`,kind:"reject"};
 if(event.type==="take")return{label:"PICKUP",symbol:"↑",detail:`${actor} picked up ${num} cards`,kind:"pickup"};
 if(event.action==="dump"||event.reason==="dump")return{label:"DUMP",symbol:"➜",detail:`${actor} transferred the pile to ${target}`,kind:"dump"};
 if(event.type==="slam"||event.reason==="slam")return{label:"SLAM",symbol:"✹",detail:`${actor} burned four matching cards`,kind:"burn"};
 if(event.type==="followup"||event.reason==="snap")return{label:"SNAP",symbol:"✦",detail:`${actor} snapped a matching card`,kind:"snap"};
 if(event.burned||event.action==="burn"||event.reason==="four")return{label:"BURN",symbol:"✹",detail:`${actor} burned the pile`,kind:"burn"};
 const action=event.action||event.reason||"";
 const specials:Record<string,{label:string;symbol:string;detail:string;kind:string}>={
  reset:{label:"RESET",symbol:"↺",detail:`${actor} reset the number limit`,kind:"reset"},
  under:{label:"UNDER",symbol:"1–4",detail:`${actor} restricted the next number to 1 through 4`,kind:"under"},
  ghost:{label:"GHOST",symbol:"◌",detail:`${actor} kept the existing number restriction`,kind:"ghost"},
  skip:{label:"SKIP",symbol:"»",detail:`${actor} skipped ${target}'s turn`,kind:"skip"}
 };
 if(specials[action])return specials[action];
 return{label:"",symbol:"",detail:"",kind:"number"};
}
function buildScene(event:Event,key:string,me:number,name:(seat:number)=>string):Scene|null{
 const table=document.querySelector(".tabletop");
 if(!table)return null;
 const lookup=(selector:string)=>table.querySelector(selector);
 const pile=center(lookup(".pile-slot.played"));
 if(!pile)return null;
 const stock=center(lookup(".pile-zone:not(.is-main) .pile-slot"))||pile;
 const ashes=center(lookup(".pile-slot.burned"))||pile;
 const own=event.seat===me;
 const seatSelector='.opponent-seat[data-seat="'+event.seat+'"]';
 const actorHand=center(lookup(own?".hand-stage":seatSelector+" .opponent-card-stack"))||pile;
 const origin=(event.source==="down"||event.type==="blind-fail")?
   center(lookup(own?".faceup-row .blind-under":seatSelector+" .mini-back")):
   event.source==="up"?
   center(lookup(own?".faceup-row .visible-up":seatSelector+" .opponent-up")):
   actorHand;
 const recipient=event.action==="dump"||event.reason==="dump"?event.target:event.seat;
 const recipientPoint=recipient===me?center(lookup(".hand-stage")):
   typeof recipient==="number"?center(lookup('.opponent-seat[data-seat="'+recipient+'"] .opponent-card-stack')):null;
 const burned=!!event.burned;
 const transfer=event.type==="take"||event.type==="blind-fail"||event.action==="dump"||event.reason==="dump"?"pickup":burned?"burn":"none";
 const desc=description(event,name);
 return{
   key,event,...desc,from:origin||actorHand,pile,
   playTo:event.action==="dump"?ashes:pile,
   transferTo:transfer==="burn"?ashes:recipientPoint||pile,
   stock,hand:actorHand,transfer,
   transferCount:transfer==="pickup"?Math.max(0,event.takenCount??event.count??0):
     Math.max(1,event.burnedCount??event.count??1),
   drawnCount:Math.max(0,event.drawnCount??0)
 };
}
function cardArt(event:Event,theme:"characters"|"original",back=false){
 const idx=cardFace(event);
 const faceStyle:CSSProperties=idx===null?{}:{
   backgroundPosition:`${(idx%4)*100/3}% ${Math.floor(idx/4)*100/3}%`
 };
 return <div className={"playing-card move-story-card theme-"+theme+(back?" is-back":"")}>
   <div className="card-art" style={back?undefined:faceStyle} />
 </div>;
}
function vector(from:Point,to:Point):CSSProperties{
 const x=to.x-from.x,y=to.y-from.y;
 return{
   left:from.x,top:from.y,
   "--move-x":x+"px","--move-y":y+"px",
   "--half-x":(x*.53)+"px","--half-y":(y*.53)+"px"
 } as CSSProperties;
}

export default function MoveTheater({gameKey,moveNo,phase,events,me,theme,nameForSeat,blindReveal}:Props){
 const [scene,setScene]=useState<Scene|null>(null);
 const queue=useRef<Array<{event:Event;reveal:BlindReveal|null}>>([]);
 const cursor=useRef({gameKey:"",move:0});
 const running=useRef(false);
 const timer=useRef<ReturnType<typeof setTimeout>|null>(null);
 const latest=useRef({me,nameForSeat,theme});
 latest.current={me,nameForSeat,theme};
 const pump=useRef<()=>void>(()=>{});
 pump.current=()=>{
   if(running.current||!queue.current.length)return;
   if(document.visibilityState==="hidden"){queue.current=[];return}
   const queued=queue.current.shift()!;
   const ctx=latest.current;
   // A failed blind play emits only a pickup event. Its public face is
   // supplied separately by the authoritative blindReveal, never guessed.
   const reveal=queued.reveal;
   const event=queued.event.type==="blind-fail" && reveal!==null && reveal.move===queued.event.move ?
     {...queued.event,source:"down" as const,
       rank:reveal.card.kind==="number"?reveal.card.rank:undefined,
       action:reveal.card.kind==="action"?reveal.card.action:undefined}:
     queued.event;
   const key=gameKey+":"+event.move;
   const next=buildScene(event,key,ctx.me,ctx.nameForSeat);
   if(!next){pump.current();return}
   running.current=true;
   setScene(next);
   timer.current=setTimeout(()=>{
     timer.current=null;setScene(null);running.current=false;
     pump.current();
   },next.kind==="number"?NORMAL_DURATION:SPECIAL_DURATION);
 };
 useEffect(()=>{
   // Do not replay history on a refresh, reconnect, or a new round.
   if(cursor.current.gameKey!==gameKey||phase==="setup"){
     cursor.current={gameKey,move:moveNo};
     queue.current=[];
     running.current=false;
     if(timer.current!==null)clearTimeout(timer.current);
     timer.current=null;setScene(null);
     return;
   }
   if(moveNo<=cursor.current.move)return;
   const fresh=events.filter(e=>typeof e.move==="number"&&e.move>cursor.current.move&&e.move<=moveNo)
     .sort((a,b)=>(a.move||0)-(b.move||0));
   if(!fresh.length && events.length)fresh.push(events[events.length-1]);
   cursor.current.move=moveNo;
   queue.current.push(...fresh.slice(-6).map(event=>({event,
     reveal:blindReveal && blindReveal.move===event.move?blindReveal:null})));
   if(queue.current.length>8)queue.current.splice(0,queue.current.length-8);
   pump.current();
 },[gameKey,moveNo,phase,events,blindReveal]);
 useEffect(()=>()=>{
   if(timer.current!==null)clearTimeout(timer.current);
   queue.current=[];running.current=false;
 },[]);
 if(!scene)return null;
 const e=scene.event;
 const flight=e.type!=="take"&&e.type!=="dump-pending";
 const blind=e.source==="down";
 const transfer=scene.transfer!=="none"&&scene.transferCount>0;
 const highlight=scene.kind!=="number";
 return createPortal(
  <div className="move-story-overlay" data-move={e.move} data-kind={scene.kind}
     aria-hidden={!highlight}>
    {highlight&&<>
      <div className="move-story-caption" role="status" aria-live="polite"
        aria-label={scene.detail} data-kind={scene.kind}
        style={{left:scene.pile.x,top:Math.max(48,scene.pile.y-113)}}>
        <strong>{scene.label}</strong>
      </div>
      <div className="move-story-sigil" data-kind={scene.kind} aria-hidden="true"
        style={{left:scene.pile.x,top:scene.pile.y}}>{scene.symbol}</div>
    </>}
   {flight&&<div className="move-story-flight" data-blind={blind?"true":"false"}
      style={vector(scene.from,scene.playTo)}>
     {blind?<><div className="move-story-back">{cardArt(e,theme,true)}</div>
        <div className="move-story-front">{cardArt(e,theme,cardFace(e)===null)}</div></>:
        cardArt(e,theme,cardFace(e)===null)}
     {(e.count??1)>1&&<span className="move-story-count">×{e.count}</span>}
   </div>}
   {highlight&&<div className="move-story-impact"
        data-kind={scene.kind} style={{left:scene.pile.x,top:scene.pile.y}} />}
   {transfer&&<div className="move-story-transfer" data-kind={scene.kind}
       style={vector(scene.pile,scene.transferTo)}>
      <div className="move-story-stack">
        <div className="move-story-stack-back" />
        <div className="move-story-stack-back" />
        {cardArt(e,theme,true)}
        <b>×{scene.transferCount}</b>
      </div>
   </div>}
   {scene.drawnCount>0&&e.type!=="blind-fail"&&e.type!=="take"&&
     <div className="move-story-refill" style={vector(scene.stock,scene.hand)}>
       {cardArt(e,theme,true)}
       <b>+{scene.drawnCount}</b>
     </div>}
  </div>,document.body
 );
}
