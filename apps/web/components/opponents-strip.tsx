"use client";
import type { Card } from "../lib/engine";
import type { Room, RoomGame, Reaction } from "../lib/room";
import { ACTIONS, cardLabel, type DeckTheme } from "./card-view";
function PlayerPosition({ name, seat, active, self, out, handCount, up, downCount, presence, reaction, theme, targetable = false, onTarget, onInspect }: {
  name: string; seat: number; active: boolean; self: boolean; out: boolean;
  handCount: number; up: Card[]; downCount: number; presence?: string; reaction?: string; theme: DeckTheme;
  targetable?: boolean; onTarget?: () => void; onInspect?: () => void;
}) {
  return <div className={`opponent-seat theme-${theme} ${active ? "seat-active" : ""} ${out ? "seat-out" : ""} ${targetable ? "is-dump-target" : ""}`}
    data-seat={seat} role={targetable ? "button" : undefined} tabIndex={targetable ? 0 : undefined}
    onClick={targetable ? onTarget : undefined}
    onKeyDown={targetable ? event => {
      if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onTarget?.(); }
    } : undefined}
    aria-label={targetable ? `Send the pile to ${name}` : `${name}: ${handCount} in hand, ${up.length} face-up, ${downCount} face-down`}>
    <div className="seat-heading">
      <span className="avatar" aria-hidden="true">{self ? "Y" : String(seat + 1)}</span>
      <div><strong>{name}</strong><small>{out ? "Finished" : presence === "offline" ? "Offline" :
          presence === "away" ? "Away" : active ? "Playing now" : `${handCount} in hand`}</small></div>
      {active && <span className="turn-dot" aria-label="Current turn" />}
      {reaction && <span className="seat-reaction" role="status">{reaction}</span>}
    </div>
    <div className="opponent-card-stack" aria-hidden="true">
      {Array.from({ length: Math.min(5, handCount) }, (_, i) =>
        <span className="hand-back" key={i} style={{ transform: `translateX(${i * 12}px) rotate(${(i - 2) * 5}deg)` }} />)}
      {!!handCount && <span className="hand-stack-count">{handCount}</span>}
      {!handCount && <span className="empty-seat">No hand cards</span>}
    </div>
    <div className="opponent-up">
      {Array.from({ length: Math.max(up.length, downCount) }, (_, i) => {
        const card = up[i];
        const artIndex = card?.kind === "number" ? (card.rank ?? 1) - 1 :
          card ? 10 + ACTIONS.indexOf(card.action || "") : -1;
        return <div className="mini-pair" key={i}>
          {i < downCount && <span className="mini-back" />}
          {card && <span className={`mini-face theme-${theme}`} data-card-id={card.id}
            title={cardLabel(card)} aria-label={cardLabel(card)}
            style={{ backgroundPosition: `${(artIndex % 4) * 100 / 3}% ${Math.floor(artIndex / 4) * 100 / 3}%` }} />}
        </div>;
      })}
      {!targetable && up.length > 0 && onInspect &&
        <button className="opponent-inspect-hit" type="button"
          aria-label={`${name} face-up cards`} title="Inspect visible cards"
          onClick={onInspect} />}
    </div>
  </div>;
}


export default function OpponentsStrip({g, me, theme: deckTheme, room, nameForSeat, choosingDumpTarget, chooseDumpSeat, onInspect, newestReactions, reactionSymbols}: {
  g: RoomGame; me: number; theme: DeckTheme; room: Room | null;
  nameForSeat: (seat: number) => string; choosingDumpTarget: boolean;
  chooseDumpSeat: (seat: number) => void; onInspect: (seat: number) => void;
  newestReactions: Reaction[]; reactionSymbols: Record<Reaction["kind"], string>;
}) {
  return <div className="opponents-row">
          {g.players.filter(p => p.seat !== me).map(p =>
            <PlayerPosition key={p.seat} seat={p.seat} theme={deckTheme} name={nameForSeat(p.seat)} self={false} out={p.out}
              targetable={choosingDumpTarget && !p.out} onTarget={() => chooseDumpSeat(p.seat)}
              onInspect={() => onInspect(p.seat)}
              active={g.phase === "play" && g.turn === p.seat}
              handCount={p.handCount} up={p.up} downCount={p.downCount}
              presence={room?.members.find(m => m.seat === p.seat)?.presence}
              reaction={newestReactions.filter(r => r.seat === p.seat).slice(-1)
                .map(r => reactionSymbols[r.kind]).join("")} />)}
        </div>;
}
