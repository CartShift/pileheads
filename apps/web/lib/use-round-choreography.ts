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
  const running = useRef<{node: HTMLElement; timer: number} | null>(null);
  function clear() {
    const old = running.current;
    if (!old) return;
    window.clearTimeout(old.timer);
    delete old.node.dataset.roundCue;
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
    const timer = window.setTimeout(clear, result.cue === "deal" ? 520 : 340);
    running.current = {node, timer};
  }, [gameKey, roomCode, phase, moveNo, turn, freshDeal, motionLevel]);

  useLayoutEffect(() => {
    const hidden = () => { if (document.visibilityState === "hidden") clear(); };
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const preference = () => { if (media.matches) clear(); };
    document.addEventListener("visibilitychange", hidden);
    media.addEventListener("change", preference);
    return () => {
      clear();
      document.removeEventListener("visibilitychange", hidden);
      media.removeEventListener("change", preference);
    };
  }, []);
}
