"use client";
import type { RoomGame } from "../lib/room";
import { PlayingCard, type DeckTheme } from "./card-view";
export default function CenterBoard({g, theme: deckTheme, canPlay, busy, playSelected, freshBlindMove, rule, onInspect}: {
  g: RoomGame; theme: DeckTheme; canPlay: boolean; busy: boolean;
  playSelected: () => void; freshBlindMove: number | null; rule: string; onInspect: () => void;
}) {
  return <div className="table-center">
          <div className="pile-zone">
            <span className="pile-title">DRAW DECK</span>
            <div className="pile-slot">
              {g.stockCount > 0 ? <PlayingCard hidden theme={deckTheme} /> : <div className="slot-empty">Empty</div>}
              {g.stockCount > 1 && <span className="stack-depth" />}
            </div>
            <span className="pile-counter">{g.stockCount} cards</span>
          </div>
          <div className="pile-zone is-main">
            <span className="pile-title">PLAY PILE</span>
            <div className={"pile-slot played " + (canPlay && !busy ? "is-drop-ready" : "")}
              data-drop-target="pile" role="button" tabIndex={0}
              aria-label="Play selected cards onto the pile"
              aria-disabled={!canPlay || busy}
              onClick={() => { if (canPlay && !busy) playSelected(); }}
              onKeyDown={e => {
                if ((e.key === "Enter" || e.key === " ") && canPlay && !busy && !e.repeat) {
                  e.preventDefault(); playSelected();
                }
              }}>
              {g.pile.slice(-5).map((card, i) => <div key={card.id}
                  className={"pile-layer" + (freshBlindMove === g.moves && g.pile.at(-1)?.id === card.id ? " is-blind-reveal" : "")} style={{ transform: `translate(${(i - 2) * 10}px, ${(i - 2) * -3}px) rotate(${(i - 2) * 3}deg)` }}>
                  <PlayingCard card={card} theme={deckTheme} />
                </div>)}
              {!g.pile.length && <div className="slot-empty">Pile clear</div>}
            </div>
            {g.limit && <span className="pile-rule-marker" data-rule={g.limit.type}
                aria-label={rule}>{g.limit.type === "under" ? "1–4" : "≥ " + g.limit.value}</span>}
              <span className="pile-counter">{g.pile.length} cards{g.limit ? "" : " · Any number can follow"}</span>
             <button type="button" className="react-pile-inspect" disabled={!g.pile.length}
               onClick={() => onInspect()}>Inspect pile</button>
          </div>
          <div className="pile-zone">
            <span className="pile-title">BURNED</span>
            <div className="pile-slot burned"><span className="burn-mark" aria-hidden="true">✕</span></div>
            <span className="pile-counter">{g.ashesCount} removed</span>
          </div>
        </div>;
}
