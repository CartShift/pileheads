"use client";
import { useEffect, useState } from "react";
import type { CSSProperties, RefObject } from "react";
import type { Card } from "../lib/engine";
import type { RoomGame } from "../lib/room";
import { PlayingCard, type DeckTheme } from "./card-view";
import { canExtendSelection, getCardAvailability } from "../lib/card-availability";
export type HandSort = "dealt" | "asc" | "desc";
export default function PlayerHandArea({g, current, theme: deckTheme, ready, active, stage, canBridge, clickBlind, selection, swap, chooseCard, playCardDirect, onClear, onSort, handSort, handStageRef, handCount, handLayout, handRows, handColumns, handCards, lastRowShift, swapHand}: {
  g: RoomGame; current: RoomGame["players"][number]; theme: DeckTheme; ready: boolean;
  active: boolean; stage: "hand" | "up" | "down" | "out"; canBridge: (card: Card) => boolean;
  clickBlind: (index: number) => void; selection: number[];
  swap: (card: Card, zone: "hand" | "up") => void; chooseCard: (card: Card) => void;
  playCardDirect: (card: Card) => void; onClear: () => void; onSort: () => void;
  handSort: HandSort; handStageRef: RefObject<HTMLDivElement | null>; handCount: number;
  handLayout: CSSProperties; handRows: number; handColumns: number; handCards: Card[];
  lastRowShift: number; swapHand: number | null;
}) {
  const [spread,setSpread]=useState(false);
  const expanded=spread && handCount>=9;
  useEffect(()=>{if(handCount<9)setSpread(false);},[handCount]);
  return <div className="player-zones">
          <div className="zone-heading"><strong>YOUR FACE-UP CARDS</strong><span>{current.up.length} cards · {current.downCount} blind</span></div>
          <div className="faceup-row">
            {Array.from({ length: Math.max(current.up.length, current.downCount) }, (_, index) => {
              const upCard = current.up[index];
              const canUp = g.phase === "setup" ? !ready : active &&
                (stage === "up" || canBridge(upCard));
              const upAvailability = upCard ? getCardAvailability(g, active, upCard.id) : "neutral";
              return <div className="faceup-pair" key={index}>
                {index < current.downCount && <div className="blind-under">
                  <PlayingCard hidden theme={deckTheme} description={`Flip face-down card ${index + 1} of ${current.downCount}`} onClick={stage === "down" && active ? () => clickBlind(index) : undefined} />
                </div>}
                {upCard && <div className="visible-up">
                  <PlayingCard card={upCard} theme={deckTheme} selected={selection.includes(upCard.id)}
                    availability={upAvailability === "blocked" && !canUp ? "neutral" : upAvailability}
                    extendsSelection={canExtendSelection(g,active,selection,upCard.id)}
                    onClick={canUp ? () => g.phase === "setup" ? swap(upCard, "up") : chooseCard(upCard) : undefined}
                    onDrop={canUp && g.phase === "play" ? () => playCardDirect(upCard) : undefined} />
                </div>}
              </div>;
            })}
          </div>
          <div className="zone-heading hand-heading"><strong>YOUR HAND · {current.handCount}</strong>
            <span className="hand-utilities">
              {handCount>=9 && <button type="button" className="hand-tool" aria-label="Spread hand"
                aria-pressed={expanded} onClick={()=>setSpread(value=>!value)}>{expanded?"Compact":"Spread"}</button>}
              {selection.length > 0 && <button type="button" className="hand-tool"
                onClick={onClear}>
                Clear {selection.length}
              </button>}
              {g.phase === "setup" ? "Swap cards before starting" :
                <button type="button" className="hand-tool" aria-label="Sort hand"
                  onClick={onSort}>
                  Sort {handSort === "dealt" ? "↑" : handSort === "asc" ? "↓" : "↺"}
                </button>}
            </span></div>
          <div className={`hand-stage${expanded?" is-spread":""}`} ref={handStageRef}
            role="group" aria-label={`Your hand, ${current.handCount} cards`}>
            <div className={`player-hand ${handCount ? expanded ? "is-spread" : "is-adaptive" : "is-empty"}`}
              style={handCount && !expanded ? handLayout : undefined} data-hand-rows={handRows}
              data-hand-columns={handColumns}>
              {handCards.map((card, index) =>
                <PlayingCard key={card.id} card={card}
                  offsetX={!expanded && lastRowShift && Math.floor(index / handColumns) === handRows - 1 ? lastRowShift : 0}
                  theme={deckTheme} selected={selection.includes(card.id) || swapHand === card.id}
                  availability={getCardAvailability(g, active, card.id)}
                  extendsSelection={canExtendSelection(g,active,selection,card.id)}
                  onClick={g.phase === "setup" ? (!ready ? () => swap(card, "hand") : undefined) :
                    (active || g.followup.length > 0) && stage === "hand" ? () => chooseCard(card) : undefined}
                  onDrop={!expanded && active && stage === "hand" ? () => playCardDirect(card) : undefined} />)}
              {!current.handCount && <span className="hand-placeholder">No cards in hand</span>}
            </div>
          </div>
        </div>;
}
