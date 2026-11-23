"use client";

/**
 * STACK tabletop presentation, never gameplay authority.
 * Only the latest committed move can start a visual cue. Every card is already
 * rendered in its real authoritative destination, so this layer uses an opaque
 * silhouette for transfers and never duplicates the face of a played card.
 */
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { createPortal } from "react-dom";
import type { Event } from "../lib/engine";
import type { BlindReveal } from "../lib/room";

type Point = { x: number; y: number };
type Kind = "burn" | "dump" | "pickup" | "reject" | "reset" | "ghost" |
  "under" | "skip" | "snap" | "slam" | "combo";
export type MotionLevel = "balanced" | "full" | "reduced";
type Cue = {
  kind: Kind; label: string; symbol: string; duration: number;
  actor: number; recipient: number | null; skippedSeat: number | null;
  destination: "ashes" | "hand" | null; transferCount: number | null;
  hasTransfer: boolean; erodedCount: number; move: number; reveal: boolean;
};
type Cursor = { key: string; move: number };
const Motion = require("../lib/motion-core.cjs") as {
  advanceCursor: (
    previous: Cursor,
    input: { gameKey: string; moveNo: number; phase: string; events: Event[]; visible: boolean }
  ) => { cursor: Cursor; cue: Cue | null; clear: boolean };
};
type Scene = {
  key: string; move: number; kind: Kind; label: string; symbol: string;
  detail: string; duration: number;
  at: Point; from: Point; to: Point | null; target: Point | null;
  erodedTo: Point | null; erodedCount: number;
  count: number; reveal: BlindReveal["card"] | null;
  ashes: Point | null;
};
type Props = {
  gameKey: string; moveNo: number; phase: string; events: Event[];
  me: number; theme: "characters" | "original"; motionLevel?: MotionLevel;
  nameForSeat: (seat: number) => string;
  blindReveal?: BlindReveal | null;
};
const ACTIONS = ["reset", "ghost", "under", "skip", "burn", "dump"];

function center(element: Element | null): Point | null {
  if (!element) return null;
  const rect = element.getBoundingClientRect();
  if (!rect.width || !rect.height) return null;
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
}
function buildScene(event: Event, cue: Cue, gameKey: string, me: number,
  nameForSeat: (seat: number) => string, blindReveal?: BlindReveal | null): Scene | null {
  const table = document.querySelector(".tabletop");
  if (!table) return null;
  const query = (selector: string) => table.querySelector(selector);
  const pile = center(query(".pile-slot.played"));
  if (!pile) return null;
  const ashes = center(query(".pile-slot.burned"));
  const seatPoint = (seat: number) => seat === me ? center(query(".hand-stage")) :
    center(query('.opponent-seat[data-seat="' + seat + '"] .opponent-card-stack')) ||
    center(query('.opponent-seat[data-seat="' + seat + '"]'));
  const destination = cue.destination === "ashes" ? ashes :
    cue.destination === "hand" && cue.recipient !== null ? seatPoint(cue.recipient) : null;
  const target = cue.kind === "skip" && cue.skippedSeat !== null ?
    seatPoint(cue.skippedSeat) :
    cue.kind === "dump" && cue.recipient !== null ? seatPoint(cue.recipient) : null;
  const count = cue.transferCount ?? 0;
  const reveal = cue.reveal && blindReveal?.move === cue.move &&
    blindReveal.seat === event.seat ? blindReveal.card : null;
  const actor = nameForSeat(event.seat);
  const detail = cue.kind === "dump" && cue.recipient !== null ?
    actor + " sent " + count + " pile cards to " + nameForSeat(cue.recipient) :
    cue.kind === "pickup" || cue.kind === "reject" ?
    actor + " collected " + count + " cards" :
    cue.kind === "burn" || cue.kind === "slam" ||
    (cue.kind === "snap" && cue.destination === "ashes") ?
    actor + " burned the pile" :
    cue.kind === "skip" && cue.skippedSeat !== null ?
    actor + " skipped " + nameForSeat(cue.skippedSeat) :
    actor + " played " + cue.label;
  return {
    key: gameKey + ":" + cue.move,
    move: cue.move, kind: cue.kind, label: cue.label, symbol: cue.symbol,
    duration: cue.duration,
    detail: cue.erodedCount ? detail + ". The visible top card was burned first" : detail,
    at: pile, from: pile, to: cue.hasTransfer ? destination : null,
    target, count, erodedCount: cue.erodedCount,
    erodedTo: cue.erodedCount > 0 ? ashes : null,
    reveal, ashes
  };
}
function cardFaceStyle(card: BlindReveal["card"]): CSSProperties {
  const index = card.kind === "number" ? (card.rank ?? 1) - 1 :
    10 + ACTIONS.indexOf(card.action ?? "");
  return { backgroundPosition:
    ((index % 4) * 100 / 3) + "% " + (Math.floor(index / 4) * 100 / 3) + "%" };
}
function flightVector(from: Point, to: Point): CSSProperties {
  return {
    left: from.x, top: from.y,
    "--move-x": (to.x - from.x) + "px",
    "--move-y": (to.y - from.y) + "px"
  } as CSSProperties;
}

export default function MoveTheater({ gameKey, moveNo, phase, events, me, theme,
  nameForSeat, blindReveal, motionLevel = "balanced" }: Props) {
  const [scene, setScene] = useState<Scene | null>(null);
  // Initialize from the very first rendered authoritative snapshot.
  // A resumed game may receive its first click before passive effects run;
  // an empty-key cursor would otherwise silently swallow that first move.
  const cursor = useRef<Cursor>({ key: gameKey, move: moveNo });
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cancel = () => {
    if (timer.current !== null) clearTimeout(timer.current);
    timer.current = null;
  };

  useEffect(() => {
    const decision = Motion.advanceCursor(cursor.current, {
      gameKey, moveNo, phase, events,
      visible: document.visibilityState !== "hidden"
    });
    cursor.current = decision.cursor;
    if (!decision.clear) return;
    cancel();
    const last = decision.cue ? events.findLast(event => event.move === moveNo) : null;
    const next = decision.cue && last ?
      buildScene(last, decision.cue, gameKey, me, nameForSeat, blindReveal) : null;
    setScene(next);
    if (next) {
      timer.current = setTimeout(() => {
        timer.current = null;
        setScene(current => current?.key === next.key ? null : current);
      }, next.duration);
    }
  }, [gameKey, moveNo, phase, events, me, nameForSeat, blindReveal]);

  useEffect(() => {
    // Fixed screen-space vectors must not survive viewport resize or a hidden
    // tab. Do NOT cancel on scroll: mobile focus/Play actions can scroll the
    // document during the same commit and instantly erase the visual cue.
    const dismiss = () => {
      cancel();
      setScene(null);
    };
    const hidden = () => {
      if (document.visibilityState === "hidden") dismiss();
    };
    document.addEventListener("visibilitychange", hidden);
    window.addEventListener("resize", dismiss);
    window.visualViewport?.addEventListener("resize", dismiss);
    return () => {
      document.removeEventListener("visibilitychange", hidden);
      window.removeEventListener("resize", dismiss);
      window.visualViewport?.removeEventListener("resize", dismiss);
      cancel();
    };
  }, []);

  if (!scene) return null;
  const showTransfer = !!scene.to && scene.count > 0;
  return createPortal(
    <div className="move-story-overlay move-story-stable" key={scene.key}
      data-move={scene.move} data-kind={scene.kind} data-motion={motionLevel}
      data-eroded={scene.erodedCount > 0}
      style={{ "--story-ms": scene.duration + "ms" } as CSSProperties}>
      <span className="move-story-caption" role="status" aria-live="polite"
        aria-label={scene.detail} style={{
          left: scene.at.x, top: Math.max(36, scene.at.y - 94)
        }}>
        <strong>{scene.label}</strong>
      </span>
      <span className="move-story-sigil" aria-hidden="true"
        data-kind={scene.kind} style={{left: scene.at.x, top: scene.at.y}}>
        {scene.symbol}
      </span>
      <span className="move-story-impact" data-kind={scene.kind}
        style={{left: scene.at.x, top: scene.at.y}} aria-hidden="true" />
      {scene.reveal && <div className={"move-story-flip theme-" + theme}
        style={{left: scene.at.x, top: scene.at.y}} aria-hidden="true">
        <div className={"playing-card theme-" + theme}>
          <div className="card-art" style={cardFaceStyle(scene.reveal)} />
        </div>
      </div>}
      {scene.erodedTo && <div className="move-story-erosion"
        style={flightVector(scene.from, scene.erodedTo)} aria-hidden="true">
        <div className={"playing-card is-back theme-" + theme}><div className="card-art" /></div>
        <b>×{scene.erodedCount}</b>
      </div>}
      {showTransfer && scene.to && <div className="move-story-transfer"
        data-kind={scene.kind} style={flightVector(scene.from, scene.to)}
        aria-hidden="true">
        <div className="move-story-stack">
          <div className="move-story-stack-back" />
          <div className="move-story-stack-back" />
          <div className={"playing-card is-back theme-" + theme}>
            <div className="card-art" />
          </div>
          <b>×{scene.count}</b>
        </div>
      </div>}
      {scene.kind === "dump" && scene.ashes && <span className="move-story-spent"
        style={{ left: scene.ashes.x, top: scene.ashes.y }} aria-hidden="true">✕</span>}
      {scene.target && <span className="move-story-recipient"
        data-target-kind={scene.kind === "skip" ? "skipped" : "recipient"}
        style={{left: scene.target.x, top: scene.target.y}} aria-hidden="true" />}
    </div>, document.body
  );
}
