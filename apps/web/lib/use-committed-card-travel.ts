"use client";

/**
 * Animate the ACTUAL committed card at its final DOM position.
 *
 * No speculative moves, replayed history, hidden-card faces or overlay copies:
 * the engine/server commits first; the destination card then travels from the
 * previously measured source rect. New moves immediately cancel old flights.
 */
import { useLayoutEffect, useRef } from "react";
import type { Card, Event } from "../lib/engine";
import type { MotionLevel } from "../components/move-theater";

type Point = { x: number; y: number };
type Snapshot = {
  gameKey: string;
  move: number;
  pileIds: Set<number>;
  handIds: Set<number>;
  stock: Point | null;
  sources: Map<number, Point>;
  opponents: Map<number, Point>;
};

function midpoint(element: Element | null): Point | null {
  if (!element) return null;
  const rect = element.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return null;
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
}

function capture(table: HTMLElement, gameKey: string, move: number, pile: Card[]): Snapshot {
  const sources = new Map<number, Point>();
  const handIds = new Set<number>();
  const opponents = new Map<number, Point>();
  for (const node of table.querySelectorAll<HTMLElement>(
    ".player-hand .playing-card[data-card-id], " +
    ".faceup-row .playing-card[data-card-id], " +
    ".opponent-up [data-card-id]"
  )) {
    const id = Number(node.dataset.cardId);
    const point = midpoint(node);
    if (Number.isSafeInteger(id) && point) {
      sources.set(id, point);
      if (node.closest(".player-hand")) handIds.add(id);
    }
  }
  for (const seat of table.querySelectorAll<HTMLElement>(".opponent-seat[data-seat]")) {
    const id = Number(seat.dataset.seat);
    const point = midpoint(seat.querySelector(".opponent-card-stack")) || midpoint(seat);
    if (Number.isSafeInteger(id) && point) opponents.set(id, point);
  }
  const stock = midpoint(table.querySelector(".pile-zone:not(.is-main) .pile-slot .playing-card.is-back"));
  return { gameKey, move, pileIds: new Set(pile.map(card => card.id)),
    handIds, stock, sources, opponents };
}

export function useCommittedCardTravel({
  gameKey, moveNo, phase, pile, event, me, motionLevel
}: {
  gameKey: string;
  moveNo: number;
  phase: string;
  pile: Card[];
  event?: Event;
  me: number;
  motionLevel: MotionLevel;
}) {
  const previous = useRef<Snapshot | null>(null);
  const running = useRef<Animation[]>([]);

  // Deliberately capture after *every* React render. Sorting, selecting and
  // responsive layout changes can change source positions without a move.
  useLayoutEffect(() => {
    const table = document.querySelector<HTMLElement>(".tabletop");
    if (!table) {
      previous.current = null;
      return;
    }
    const next = capture(table, gameKey, moveNo, pile);
    const before = previous.current;
    previous.current = next;

    // A single newer authoritative move wins. Never animate room hydration,
    // snapshots that skip moves, replay, setup swaps, or post-game screens.
    if (!before || (before.gameKey === gameKey && before.move === moveNo)) return;
    for (const animation of running.current) animation.cancel();
    running.current = [];
    if (before.gameKey !== gameKey) return;

    if (before.move + 1 !== moveNo || !["play", "over"].includes(phase) ||
        !event || event.move !== moveNo) return;
    if (motionLevel === "reduced" ||
        window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
        document.visibilityState === "hidden") return;

    const actuallyPlaced = ["play", "followup", "slam"].includes(event.type) &&
      event.source !== "down" && !event.burned && event.action !== "dump";
    const arrived = actuallyPlaced ? Array.from(table.querySelectorAll<HTMLElement>(
      ".pile-slot.played .pile-layer .playing-card[data-card-id]"
    )).filter(node => {
      const id = Number(node.dataset.cardId);
      return Number.isSafeInteger(id) && !before.pileIds.has(id);
    }) : [];
    // Only cards actually present in the committed pile may fly. They are
    // already rendered in their final state; no second face is ever created.
    const limit = Math.min(Math.max(event.count ?? 1, 0), arrived.length, 4);
    for (let i = 0; i < limit; i++) {
      const node = arrived[i];
      const id = Number(node.dataset.cardId);
      const from = before.sources.get(id) ||
        (event.seat !== me ? before.opponents.get(event.seat) : null);
      const to = midpoint(node);
      if (!from || !to) continue;
      const dx = from.x - to.x, dy = from.y - to.y;
      if (Math.hypot(dx, dy) < 12) continue;
      // Stable testing evidence on the real pile card, never an extra DOM face.
      node.dataset.arrivalMotion = String(moveNo);
      const animation = node.animate([
        { transform: `translate3d(${dx}px,${dy}px,0) rotate(-5deg) scale(.96)`,
          opacity: .88, offset: 0 },
        { transform: "translate3d(0,0,0) rotate(1deg) scale(1.04)",
          opacity: 1, offset: .78 },
        { transform: "translate3d(0,0,0) rotate(0deg) scale(1)",
          opacity: 1, offset: 1 }
      ], {
        duration: motionLevel === "full" ? 480 : 370,
        delay: i * 38,
        easing: "cubic-bezier(.2,.76,.22,1)",
        fill: "both"
      });
      animation.onfinish = () => animation.cancel();
      running.current.push(animation);
    }

    // Draw-to-three is a genuine physical card transfer too. Animate the
    // *recipient's own* newly drawn hand cards from the previous draw stock,
    // never reveal a remote player's hidden cards and never duplicate a face.
    if (event.seat === me && (event.drawnCount ?? 0) > 0 && before.stock) {
      const drawn = Array.from(table.querySelectorAll<HTMLElement>(
        ".player-hand .playing-card[data-card-id]"
      )).filter(node => {
        const id = Number(node.dataset.cardId);
        return Number.isSafeInteger(id) && !before.handIds.has(id);
      });
      const count = Math.min(event.drawnCount ?? 0, drawn.length, 3);
      for (let i = 0; i < count; i++) {
        const node = drawn[i];
        const to = midpoint(node);
        if (!to) continue;
        const dx = before.stock.x - to.x;
        const dy = before.stock.y - to.y;
        if (Math.hypot(dx, dy) < 12) continue;
        node.dataset.drawMotion = String(moveNo);
        const animation = node.animate([
          { transform: `translate3d(${dx}px,${dy}px,0) rotateY(-72deg) scale(.86)`,
            opacity: .35, offset: 0 },
          { transform: "translate3d(0,0,0) rotateY(0deg) scale(1.025)",
            opacity: 1, offset: .82 },
          { transform: "translate3d(0,0,0) rotateY(0deg) scale(1)",
            opacity: 1, offset: 1 }
        ], {
          duration: motionLevel === "full" ? 420 : 330,
          delay: i * 42,
          easing: "cubic-bezier(.2,.76,.22,1)",
          fill: "both"
        });
        animation.onfinish = () => animation.cancel();
        running.current.push(animation);
      }
    }
  });

  useLayoutEffect(() => {
    // Fixed screen coordinates are not valid after a viewport change.
    // Do not cancel on document scroll: mobile interactions can scroll the
    // page while a legitimate committed move is settling.
    const invalidate = () => {
      running.current.forEach(animation => animation.cancel());
      running.current = [];
      previous.current = null;
    };
    const backgrounded = () => {
      if (document.visibilityState === "hidden") invalidate();
    };
    window.addEventListener("resize", invalidate);
    window.visualViewport?.addEventListener("resize", invalidate);
    document.addEventListener("visibilitychange", backgrounded);
    return () => {
      window.removeEventListener("resize", invalidate);
      window.visualViewport?.removeEventListener("resize", invalidate);
      document.removeEventListener("visibilitychange", backgrounded);
      invalidate();
    };
  }, []);

  useLayoutEffect(() => {
    if (motionLevel === "reduced" ||
        window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      running.current.forEach(animation => animation.cancel());
      running.current = [];
    }
  }, [motionLevel]);
}
