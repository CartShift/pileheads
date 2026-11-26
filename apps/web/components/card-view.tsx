"use client";
import { useRef, useState } from "react";
import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";
import { createPortal } from "react-dom";
import type { Card } from "../lib/engine";
import { availabilityDescription, type CardAvailability } from "../lib/card-availability";
export type DeckTheme = "refined" | "characters" | "original";
export const ACTIONS = ["reset", "ghost", "under", "skip", "burn", "dump"];
export const ACTION_DESCRIPTIONS: Record<string, string> = {
  reset: "Any number can follow", ghost: "Keep the current restriction",
  under: "Next number must be 1–4", skip: "Skip the next player's turn",
  burn: "Burn the pile and play again", dump: "Give the pile to any opponent; they can counter with their own DUMP"
};
export const cardLabel = (card: Card) => card.kind === "number" ? `Number ${card.rank}` :
  `${card.action?.toUpperCase()}: ${ACTION_DESCRIPTIONS[card.action || ""]}`;

export function PlayingCard({ card, hidden = false, selected = false, small = false, onClick, onDrop, disabled = false, theme = "refined",
  description, offsetX = 0, availability = "neutral" }: {
  card?: Card; hidden?: boolean; selected?: boolean; small?: boolean; theme?: DeckTheme;
  onClick?: () => void; onDrop?: () => void; disabled?: boolean; description?: string; offsetX?: number; availability?: CardAvailability;
}) {
  const index = !hidden && card
    ? card.kind === "number" ? (card.rank || 1) - 1 : 10 + ACTIONS.indexOf(card.action || "")
    : -1;
  const gesture = useRef<{x: number; y: number; moved: boolean} | null>(null);
  const blockClick = useRef(false);
  const [floating, setFloating] = useState<{x: number; y: number; touch: boolean} | null>(null);
  function pointerDown(e: ReactPointerEvent<HTMLButtonElement>) {
    if (!onDrop || e.button !== 0) return;
    blockClick.current = false;
    gesture.current = { x: e.clientX, y: e.clientY, moved: false };
    e.currentTarget.setPointerCapture(e.pointerId);
  }
  function pointerMove(e: ReactPointerEvent<HTMLButtonElement>) {
    const start = gesture.current;
    if (!start) return;
    if (!start.moved && Math.hypot(e.clientX - start.x, e.clientY - start.y) <
        (e.pointerType === "touch" ? 12 : 8)) return;
    start.moved = true;
    setFloating({ x: e.clientX, y: e.clientY, touch: e.pointerType === "touch" });
  }
  function pointerUp(e: ReactPointerEvent<HTMLButtonElement>) {
    const start = gesture.current;
    if (!start) return;
    gesture.current = null; setFloating(null);
    if (!start.moved) return;
    // Pointer capture sends the mouseup to this card even when it was
    // released over the pile. Suppress only the synthetic click generated
    // by this drag; never swallow the player's next intentional tap.
    blockClick.current = true;
    window.setTimeout(() => { blockClick.current = false; }, 0);
    if (document.elementFromPoint(e.clientX, e.clientY)?.closest('[data-drop-target="pile"]'))
      onDrop?.();
  }
  const faceStyle: CSSProperties = index >= 0 ? {
    backgroundPosition: `${(index % 4) * 100 / 3}% ${Math.floor(index / 4) * 100 / 3}%`
  } : {};
  return (
    <div
      className={`playing-card theme-${theme} ${hidden ? "is-back" : ""} ${selected ? "is-selected" : ""} ${floating ? "is-dragging" : ""} ${small ? "is-small" : ""} ${onClick && !disabled ? "is-interactive" : ""}`}
      data-card-id={card?.id}
      data-availability={hidden ? "neutral" : availability}
      style={offsetX ? {left: offsetX} : undefined}>
      <div aria-hidden="true" className="card-art" style={faceStyle} />
      {!hidden && availability !== "neutral" && <span className="card-availability-mark" aria-hidden="true">
        {availability === "playable" ? "✓" : availability === "blocked" ? "×" : availability === "snap" ? "SNAP" : availability === "slam" ? "SLAM" : "S/S"}
      </span>}
      {onClick && !disabled ? (
        <button type="button" className="card-hit"
          aria-label={description || (hidden ? "Flip a face-down card" : card ? cardLabel(card) : "Card")}
          aria-pressed={selected}
          aria-description={!hidden && availability !== "neutral" ? availabilityDescription[availability] : undefined}
          title={!hidden && availability !== "neutral" ? availabilityDescription[availability] : undefined}
          onPointerDown={pointerDown}
          onPointerMove={pointerMove}
          onPointerUp={pointerUp}
          onPointerCancel={() => { gesture.current = null; setFloating(null); }}
          onClick={e => {
            if (blockClick.current && e.detail !== 0) {
              blockClick.current = false; e.preventDefault(); return;
            }
            blockClick.current = false;
            onClick();
          }} />
      ) : null}
      {floating && createPortal(
        <div className={"drag-ghost theme-" + theme + (floating.touch ? " is-touch" : "")}
          style={{left:floating.x,top:floating.y}} aria-hidden="true">
          <div className="card-art" style={faceStyle} />
        </div>, document.body)}
    </div>
  );
}

