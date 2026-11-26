"use client";

import { useLayoutEffect, useRef } from "react";
import type { MotionLevel } from "../components/move-theater";

type Cursor = {key: string; room: string | null; phase: string; move: number; turn: number};
type Cue = "deal" | "start" | "handoff";
const Round = require("./motion-core.cjs") as {
  advanceRoundCursor: (previous: Cursor | null, input: {
    gameKey: string; roomCode: string | null; phase: string; moveNo: number;
    turn: number; freshDeal: boolean; visible: boolean; reduced: boolean;
  }) => {cursor: Cursor; cue: Cue | null};
};

/** Decorative cues only; no duplicated cards, timers affecting gameplay,
 * layout changes, or overlay intercepting clicks. */
export function useRoundChoreography({gameKey, roomCode, phase, moveNo, turn, freshDeal, motionLevel}: {
  gameKey: string; roomCode: string | null; phase: string; moveNo: number;
  turn: number; freshDeal: boolean; motionLevel: MotionLevel;
}) {
  const cursor = useRef<Cursor | null>(null);
  const running = useRef<{node: HTMLElement; timer: number; arts: {node:HTMLElement;animation:Animation}[]} | null>(null);
  function clear() {
    const old = running.current;
    if (!old) return;
    window.clearTimeout(old.timer);
    delete old.node.dataset.roundCue;
    for(const art of old.arts){art.animation.cancel();delete art.node.dataset.dealMotion;}
    running.current = null;
  }
  useLayoutEffect(() => {
    const previous = cursor.current;
    const reduced = motionLevel === "reduced" || window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const result = Round.advanceRoundCursor(previous, {
      gameKey, roomCode, phase, moveNo, turn, freshDeal,
      visible: document.visibilityState !== "hidden", reduced
    });
    cursor.current = result.cursor;
    const changed = !previous || previous.key !== gameKey || previous.phase !== phase ||
      previous.move !== moveNo || previous.turn !== turn;
    if (changed || reduced) clear();
    if (!result.cue) return;
    const node = document.querySelector<HTMLElement>(".tabletop");
    if (!node) return;
    node.dataset.roundCue = result.cue;
    const arts:{node:HTMLElement;animation:Animation}[]=[];
    if(result.cue==="deal"){
      const stock=node.querySelector(".pile-zone:not(.is-main) .pile-slot .playing-card.is-back")?.getBoundingClientRect();
      if(stock&&stock.width>0){
        // Move only existing art/back layers, never the interactive card frame.
        // Batch geometry reads first; no per-frame layout reads or duplicate faces.
        const candidates=[
          ...Array.from(node.querySelectorAll<HTMLElement>(".player-zones .playing-card .card-art")),
          ...Array.from(node.querySelectorAll<HTMLElement>(".opponent-up .mini-back, .opponent-card-stack .hand-back"))
        ].slice(0,motionLevel==="full"?18:12).map(art=>({art,rect:art.getBoundingClientRect()}));
        for(const [i,{art,rect}] of candidates.entries()){
          if(!rect.width||!rect.height||typeof art.animate!=="function")continue;
          const dx=stock.left+stock.width/2-rect.left-rect.width/2;
          const dy=stock.top+stock.height/2-rect.top-rect.height/2;
          // Existing mini-backs may already have an authored transform.
          // Use independent translate/scale properties to preserve that transform.
          art.dataset.dealMotion=String(i);
          const animation=art.animate([
            {translate:dx+"px "+dy+"px",scale:".65",opacity:.25},
            {translate:"0px 0px",scale:"1",opacity:1}
          ],{duration:motionLevel==="full"?320:260,delay:i*14,
            easing:"cubic-bezier(.18,.75,.25,1)",fill:"both"});
          arts.push({node:art,animation});
        }
      }
    }
    const timer = window.setTimeout(clear, result.cue === "deal" ? (motionLevel==="full"?620:520) : 340);
    running.current = {node, timer, arts};
  }, [gameKey, roomCode, phase, moveNo, turn, freshDeal, motionLevel]);

  useLayoutEffect(() => {
    const hidden = () => { if (document.visibilityState === "hidden") clear(); };
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const preference = () => { if (media.matches) clear(); };
    document.addEventListener("visibilitychange", hidden);
    window.addEventListener("resize",clear);
    window.visualViewport?.addEventListener("resize",clear);
    // A real user interaction settles the deal immediately; hit boxes never move.
    const interact=()=>{if(running.current?.node.dataset.roundCue==="deal")clear();};
    document.addEventListener("pointerdown",interact,true);
    document.addEventListener("keydown",interact,true);
    media.addEventListener("change", preference);
    return () => {
      clear();
      document.removeEventListener("visibilitychange", hidden);
      window.removeEventListener("resize",clear);
      window.visualViewport?.removeEventListener("resize",clear);
      document.removeEventListener("pointerdown",interact,true);
      document.removeEventListener("keydown",interact,true);
      media.removeEventListener("change", preference);
    };
  }, []);
}
