"use client";
import type { ReactNode } from "react";
import type { Card, Move } from "../lib/engine";
import type { Room, RoomGame, Reaction } from "../lib/room";
import { ACTION_DESCRIPTIONS, cardLabel } from "./card-view";

export default function ActionDock({g, mode, room, ready, allReady, joined, busy, undoAvailable, undo, onRematch, onCancelRematch, resultShare, me, nameForSeat, playMove, liveSeats, chooseDumpSeat, needsTarget, playSelected, onCancelTarget, selectedCards, selectedAction, active, reactionsOpen, onToggleReactions, reactionSymbols, sendReaction, canTake, canPlay, onAutoArrange, onStart, onReady}: {
  g: RoomGame; mode: "home" | "local" | "online"; room: Room | null; ready: boolean; allReady: boolean;
  joined: boolean; busy: boolean; undoAvailable: boolean; undo: () => void; onRematch: () => void; onCancelRematch:()=>void; resultShare?: ReactNode;
  me: number; nameForSeat: (seat: number) => string; playMove: (move: Move) => void;
  liveSeats: number[]; chooseDumpSeat: (seat: number) => void; needsTarget: boolean;
  playSelected: (target?: number) => void; onCancelTarget: () => void; selectedCards: Card[];
  selectedAction?: string; active: boolean; reactionsOpen: boolean; onToggleReactions: () => void;
  reactionSymbols: Record<Reaction["kind"], string>; sendReaction: (kind: Reaction["kind"]) => void | Promise<void>;
  canTake: boolean; canPlay: boolean; onAutoArrange: () => void; onStart: () => void; onReady: () => void;
}) {
  const announcement = g.phase === "setup" ? (ready ? "Ready. Waiting for the round to start." : "Choose three face-up cards.") :
    g.phase === "over" ? `Round complete. ${nameForSeat(g.finishedOrder[0] ?? -1)} finished first.` :
    g.pendingCounter ? (g.pendingCounter.seat === me ? `Counter DUMP available. Return ${g.pendingCounter.count} cards or keep them.` : `Waiting for ${nameForSeat(g.pendingCounter.seat)} to resolve DUMP.`) :
    g.pendingDump ? (g.pendingDump.seat === me ? "Choose who takes the pile." : `Waiting for ${nameForSeat(g.pendingDump.seat)} to choose a DUMP target.`) :
    needsTarget ? "Choose an opponent to receive the pile." :
    `${active ? "Your turn." : `${nameForSeat(g.turn)} is playing.`}${g.followup.length ? " SNAP available." : ""}${g.slam.length ? " SLAM available." : ""}${active ? (g.limit?.type === "under" ? " Next number 1 to 4." : g.limit?.type === "min" ? ` Next number ${g.limit.value} or higher.` : " Any number can follow.") : ""}`;
  return <div className="control-panel" aria-label="Game actions">
        <span className="tabletop-announcement" role="status" aria-live="polite" aria-atomic="true">{announcement}</span>
        {g.phase === "setup" ? (
          <div className="setup-controls">
            <div><strong>{mode === "online" ? `${room?.members.length || 0} joined · ${g.players.length - g.botSeats.length} humans required` : "Set up your cards"}</strong>
              <p>{mode === "online" && !joined ? "Invite the remaining players." : ready ?
                allReady ? room?.host ? "Everyone is ready." : "Waiting for the host." : "Waiting for other players." :
                "Choose the three cards to leave face-up."}</p></div>
            {mode === "local" ? <div className="button-group">
              <button className="secondary-button" onClick={onAutoArrange}>Auto arrange</button>
              <button className="primary-button" onClick={onStart}>Start round</button></div> :
              <div className="button-group">
                <button className="secondary-button" disabled={busy}
                  onClick={onReady}>{ready ? "Change cards" : "I'm ready"}</button>
                {room?.host && <button className="primary-button" disabled={busy || !allReady || !joined}
                  onClick={onStart}>Start round</button>}
              </div>}
          </div>
        ) : g.phase === "over" ? <div className="setup-controls">
          <div><strong>Game over</strong><p>First out: {nameForSeat(g.finishedOrder[0] ?? -1)}</p>{g.roundLimit&&g.round<g.roundLimit&&<p role="status">{g.rematchReady?.filter(Boolean).length??0}/{g.humanCount??g.players.length-g.botSeats.length} humans ready for round {g.round+1}</p>}</div>
          <div className="button-group">
            {mode === "local" && undoAvailable &&
              <button className="secondary-button" data-hotkey="undo" onClick={undo}>Undo last move</button>}
            {resultShare}
            {!(g.roundLimit && g.round>=g.roundLimit) && (g.roundLimit&&g.rematchReady?.[me]?<button className="secondary-button" disabled={busy} onClick={onCancelRematch}>Cancel ready</button>:<button className="primary-button" disabled={busy}
              onClick={onRematch}>Play another round</button>)}
          </div>

        </div> : g.pendingCounter ? <div className="setup-controls">
          {g.pendingCounter.seat === me ? <>
            <div><strong>COUNTER DUMP</strong><p>Return {g.pendingCounter.count} cards to {nameForSeat(g.pendingCounter.attacker)} and take the next turn.</p></div>
            <div className="button-group">
              <button className="primary-button" disabled={busy || !g.legal.some(m => m.type === "counter-dump")} onClick={() => { const m = g.legal.find(m => m.type === "counter-dump"); if (m) playMove(m); }}>Counter DUMP</button>
              <button className="secondary-button" disabled={busy} onClick={() => playMove({type:"counter-pass"})}>Keep cards</button>
            </div>
          </> : <div><strong>Waiting for {nameForSeat(g.pendingCounter.seat)}</strong><p>Resolving the DUMP.</p></div>}
        </div> : g.pendingDump?.seat === me ? <div className="setup-controls">
          <div><strong>Choose who takes the pile</strong><p>DUMP can target any active opponent.</p></div>
          <div className="button-group">{liveSeats.map(seat =>
            <button className="primary-button" key={seat} disabled={busy} onClick={() => chooseDumpSeat(seat)
            }>{nameForSeat(seat)}</button>)}</div>
        </div> : g.pendingDump ? <div className="setup-controls"><div role="status"><strong>Waiting for {nameForSeat(g.pendingDump.seat)}</strong><p>Choosing who takes the pile.</p></div></div> : needsTarget ? <div className="setup-controls">
          <div><strong>Choose a DUMP target</strong><p>Who should pick up the pile?</p></div>
          <div className="button-group">
            {liveSeats.map(seat => <button key={seat} className="primary-button" disabled={busy}
              onClick={() => playSelected(seat)}>{nameForSeat(seat)}</button>)}
            <button className="secondary-button" disabled={busy} onClick={onCancelTarget}>Cancel</button>
          </div>
        </div> : (
          <div className="play-controls">
            <div className="selection-note">{selectedCards.length ?
              <><strong>{selectedCards.length} selected</strong><span>{selectedAction ? ACTION_DESCRIPTIONS[selectedAction] : cardLabel(selectedCards[0])}</span></> :
              <><strong>{active ? "Your turn" : `Waiting for ${nameForSeat(g.turn)}`}</strong>
                <span>{active ? "Select one or more matching cards." : "Watch for a SNAP or SLAM opportunity."}</span></>}</div>
            <div className="button-group">
              {mode === "online" && <div className="reaction-menu">
                <button className="secondary-button reaction-trigger"
                  aria-expanded={reactionsOpen} aria-label="Send a reaction"
                  onClick={onToggleReactions}>React</button>
                {reactionsOpen && <div className="reaction-picker" role="group" aria-label="Choose a reaction">
                  {(Object.keys(reactionSymbols) as Reaction["kind"][]).map(kind =>
                    <button key={kind} title={kind} aria-label={"React " + kind}
                      onClick={() => void sendReaction(kind)}>{reactionSymbols[kind]}</button>)}
                </div>}
              </div>}
              {mode === "local" && undoAvailable && <button className="secondary-button" data-hotkey="undo" onClick={undo}>Undo</button>}
              {!!g.followup.length && <button className="snap-button" data-hotkey="snap" disabled={busy}
                onClick={() => playMove(g.followup[0])}>SNAP</button>}
              {!!g.slam.length && <button className="slam-button" data-hotkey="slam" disabled={busy}
                onClick={() => playMove(g.slam[0])}>SLAM</button>}
              <button className="secondary-button" data-hotkey="take" disabled={busy || !canTake}
                onClick={() => playMove({ type: "take" })}>Take pile</button>
              <button className="primary-button" data-hotkey="play" disabled={busy || !active || !canPlay}
                onClick={() => playSelected()}>Play cards{selectedCards.length ? ` (${selectedCards.length})` : ""} <span aria-hidden>→</span></button>
            </div>
          </div>
        )}
      </div>;
}
