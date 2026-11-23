"use client";

/**
 * Authoritative table feedback.
 *
 * Never replay a queue of old moves: live players and bots may act much faster
 * than a cinematic animation. The rendered table is always the source of
 * truth; this layer shows only the latest *committed*, consequential outcome.
 *
 * Ordinary card placement is rendered by the real pile/hand immediately.
 * No duplicate flying cards, guessed card faces or artificial input delays.
 */
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { createPortal } from "react-dom";
import type { Event } from "../lib/engine";
import type { BlindReveal } from "../lib/room";

type Point = { x: number; y: number };
type Kind = "burn" | "dump" | "pickup" | "reject" | "reset" | "ghost" |
  "under" | "skip" | "snap" | "slam" | "combo";
type Scene = {
  key: string;
  kind: Kind;
  label: string;
  symbol: string;
  detail: string;
  move: number;
  at: Point;
  from: Point;
  to: Point | null;
  target: Point | null;
  count: number;
  reveal: BlindReveal["card"] | null;
};
type Props = {
  gameKey: string;
  moveNo: number;
  phase: string;
  events: Event[];
  me: number;
  theme: "characters" | "original";
  nameForSeat: (seat: number) => string;
  blindReveal?: BlindReveal | null;
};
const NORMAL_EFFECT_MS = 950;
const REVEAL_EFFECT_MS = 1350;
const ACTIONS = ["reset", "ghost", "under", "skip", "burn", "dump"];

function center(element: Element | null): Point | null {
  if (!element) return null;
  const rect = element.getBoundingClientRect();
  if (!rect.width || !rect.height) return null;
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
}
function classify(event: Event): {kind: Kind; label: string; symbol: string} | null {
  // dump-pending only opens a target chooser. It has not moved any cards yet.
  if (event.type === "dump-pending") return null;
  if (event.type === "blind-fail") return { kind: "reject", label: "INVALID", symbol: "×" };
  if (event.type === "take") return { kind: "pickup", label: "PICKUP", symbol: "↑" };
  if (event.action === "dump" || event.reason === "dump")
    return { kind: "dump", label: "DUMP", symbol: "➜" };
  if (event.type === "slam" || event.reason === "slam")
    return { kind: "slam", label: "SLAM", symbol: "✹" };
  // A SNAP may complete the fourth matching number. Show the burn rather
  // than a misleading SNAP-only animation when the pile really burned.
  if (event.burned || event.action === "burn" || event.reason === "four")
    return { kind: "burn", label: event.type === "followup" ? "SNAP + BURN" : "BURN", symbol: "✹" };
  if (event.type === "followup" || event.reason === "snap")
    return { kind: "snap", label: "SNAP", symbol: "✦" };
  if (event.action === "reset") return { kind: "reset", label: "RESET", symbol: "↺" };
  if (event.action === "under") return { kind: "under", label: "UNDER", symbol: "1–4" };
  if (event.action === "ghost") return { kind: "ghost", label: "GHOST", symbol: "◌" };
  if (event.action === "skip") return { kind: "skip", label: "SKIP", symbol: "»" };
  if (event.bridgeCount) return { kind: "combo", label: "COMBO", symbol: "✦" };
  return null;
}
function buildScene(event: Event, gameKey: string, me: number,
  nameForSeat: (seat: number) => string, blindReveal?: BlindReveal | null): Scene | null {
  const classified = classify(event);
  const table = document.querySelector(".tabletop");
  if (!classified || !table || typeof event.move !== "number") return null;
  const query = (selector: string) => table.querySelector(selector);
  const pile = center(query(".pile-slot.played"));
  if (!pile) return null;
  const ashes = center(query(".pile-slot.burned"));
  const recipient = classified.kind === "dump" ? event.target : event.seat;
  const seatPoint = (seat: number) =>
    seat === me ? center(query(".hand-stage")) :
    center(query('.opponent-seat[data-seat="' + seat + '"] .opponent-card-stack')) ||
    center(query('.opponent-seat[data-seat="' + seat + '"]'));
  const needsTransfer = ["dump", "pickup", "reject", "burn", "slam"].includes(classified.kind);
  const end = classified.kind === "burn" || classified.kind === "slam" ? ashes :
    typeof recipient === "number" ? seatPoint(recipient) : null;
  // Never manufacture a transfer count. An incomplete event is visualized
  // as a short pile pulse, not an invented number of flying cards.
  const count = classified.kind === "burn" || classified.kind === "slam" ?
    (event.burnedCount ?? 0) : (event.takenCount ?? event.count ?? 0);
  const target = classified.kind === "skip" && typeof event.target === "number" ?
    seatPoint(event.target) : classified.kind === "dump" ? end : null;
  const reveal = classified.kind === "reject" && blindReveal?.move === event.move &&
    blindReveal.seat === event.seat ? blindReveal.card : null;
  const actor = nameForSeat(event.seat);
  const detail = classified.kind === "dump" && typeof recipient === "number" ?
    actor + " passed " + count + " pile cards to " + nameForSeat(recipient) :
    classified.kind === "pickup" || classified.kind === "reject" ?
    actor + " collected " + count + " cards" :
    classified.kind === "burn" || classified.kind === "slam" ?
    actor + " burned the pile" :
    actor + " played " + classified.label;
  return {
    key: gameKey + ":" + event.move,
    move: event.move,
    ...classified,
    detail,
    at: pile,
    from: pile,
    to: needsTransfer && count > 0 ? end : null,
    target,
    count: Math.max(0, count),
    reveal
  };
}
function cardFaceStyle(card: BlindReveal["card"]): CSSProperties {
  const index = card.kind === "number" ? (card.rank ?? 1) - 1 :
    10 + ACTIONS.indexOf(card.action ?? "");
  return { backgroundPosition:
    `${(index % 4) * 100 / 3}% ${Math.floor(index / 4) * 100 / 3}%` };
}
function flightVector(from: Point, to: Point): CSSProperties {
  return {
    left: from.x, top: from.y,
    "--move-x": (to.x - from.x) + "px",
    "--move-y": (to.y - from.y) + "px"
  } as CSSProperties;
}

export default function MoveTheater({ gameKey, moveNo, phase, events, me, theme,
  nameForSeat, blindReveal }: Props) {
  const [scene, setScene] = useState<Scene | null>(null);
  const cursor = useRef({ key: "", move: 0 });
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clear = () => { if (timer.current !== null) clearTimeout(timer.current); timer.current = null; };

  useEffect(() => {
    if (cursor.current.key !== gameKey || phase !== "play") {
      cursor.current = { key: gameKey, move: moveNo };
      clear();
      setScene(null);
      return;
    }
    if (moveNo <= cursor.current.move) {
      // Undo and rematch can rewind the move counter without replacing this
      // component; a previous animation must never survive that reset.
      if (moveNo < cursor.current.move) {
        cursor.current.move = moveNo;
        clear();
        setScene(null);
      }
      return;
    }
    const previous = cursor.current.move;
    cursor.current.move = moveNo;
    clear();
    // Only the *current* authoritative move is eligible. Replaying backlogged
    // bot turns makes card motion contradict the already-updated table.
    const latest = [...events].reverse().find(event => event.move === moveNo && event.move > previous);
    if (!latest || document.visibilityState === "hidden") {
      setScene(null);
      return;
    }
    const next = buildScene(latest, gameKey, me, nameForSeat, blindReveal);
    setScene(next);
    if (next) {
      timer.current = setTimeout(() => {
        timer.current = null;
        setScene(current => current?.key === next.key ? null : current);
      }, next.kind === "reject" ? REVEAL_EFFECT_MS : NORMAL_EFFECT_MS);
    }
  }, [gameKey, moveNo, phase, events, me, nameForSeat, blindReveal]);

  useEffect(() => {
    const hidden = () => {
      if (document.visibilityState !== "hidden") return;
      clear();
      setScene(null);
    };
    document.addEventListener("visibilitychange", hidden);
    return () => {
      document.removeEventListener("visibilitychange", hidden);
      clear();
    };
  }, []);

  if (!scene) return null;
  const showTransfer = !!scene.to && scene.count > 0;
  return createPortal(
    <div className="move-story-overlay move-story-stable" key={scene.key}
      data-move={scene.move} data-kind={scene.kind}>
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
      {scene.target && <span className="move-story-recipient"
        style={{left: scene.target.x, top: scene.target.y}} aria-hidden="true" />}
    </div>, document.body
  );
}
