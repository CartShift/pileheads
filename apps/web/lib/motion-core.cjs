"use strict";

/**
 * Pure presentation contract for a committed STACK engine event.
 *
 * Never infer a hidden card, invent a transfer count, replay the event queue,
 * or modify a game turn. All scenes are advisory: current table state wins.
 *
 * Intentionally CommonJS so the Next/React client and the repo's Node 24
 * regression suite execute the *same* classification code.
 */
const EFFECTS = Object.freeze({
  burn:   { label: "BURN",  symbol: "✹",  duration: 560, accent: "ember" },
  dump:   { label: "DUMP",  symbol: "➜",  duration: 620, accent: "pink" },
  pickup: { label: "TAKE",  symbol: "↑",  duration: 500, accent: "gold" },
  reject: { label: "NO",    symbol: "×",  duration: 1330, accent: "red" },
  reset:  { label: "RESET", symbol: "↺",  duration: 460, accent: "blue" },
  ghost:  { label: "GHOST", symbol: "◌",  duration: 430, accent: "violet" },
  under:  { label: "1–4",   symbol: "1–4",duration: 480, accent: "mint" },
  skip:   { label: "SKIP",  symbol: "»",  duration: 440, accent: "yellow" },
  snap:   { label: "SNAP",  symbol: "✦",  duration: 460, accent: "lime" },
  slam:   { label: "SLAM",  symbol: "✹",  duration: 620, accent: "ember" },
  combo:  { label: "COMBO", symbol: "✦",  duration: 410, accent: "lime" }
});

function validCount(value) {
  return Number.isSafeInteger(value) && value >= 0 ? value : null;
}

function chooseKind(event) {
  if (!event || event.type === "dump-pending") return null;
  if (event.type === "blind-fail") return "reject";
  if (event.type === "take") return "pickup";
  if (event.action === "dump" || event.reason === "dump") return "dump";
  if (event.type === "slam" || event.reason === "slam") return "slam";
  if (event.type === "followup" || event.reason === "snap") return "snap";
  if (event.burned || event.action === "burn" || event.reason === "four") return "burn";
  if (event.action === "reset") return "reset";
  if (event.action === "under") return "under";
  if (event.action === "ghost") return "ghost";
  if (event.action === "skip") return "skip";
  if (validCount(event.bridgeCount) > 0) return "combo";
  return null;
}

function fromCommittedEvent(event) {
  if (!event || !Number.isSafeInteger(event.move) || event.move < 0 ||
      !Number.isSafeInteger(event.seat) || event.seat < 0) return null;
  const kind = chooseKind(event);
  if (!kind) return null;
  const spec = EFFECTS[kind];

  // An actual burn takes precedence over the name of an interrupt.
  // A SNAP can complete four and burn; it should remain recognizably SNAP.
  const burned = kind === "burn" || kind === "slam" ||
    (kind === "snap" && event.burned === true);
  let destination = burned ? "ashes" :
    (kind === "dump" || kind === "pickup" || kind === "reject") ? "hand" : null;

  const recipient = kind === "dump" ? event.target :
    destination === "hand" ? event.seat : null;
  // Never show a flight toward an unknown player.
  if (destination === "hand" && (!Number.isSafeInteger(recipient) || recipient < 0))
    destination = null;
  const transferCount = burned ? validCount(event.burnedCount) :
    destination === "hand" ? (validCount(event.takenCount) ??
      validCount(event.count)) : null;

  const erodedCount = (kind === "dump" || kind === "pickup" || kind === "reject")
    ? (validCount(event.erodedCount) ?? 0) : 0;

  return Object.freeze({
    kind, label: spec.label, symbol: spec.symbol, duration: spec.duration,
    accent: spec.accent, actor: event.seat,
    recipient: Number.isSafeInteger(recipient) ? recipient : null,
    // event.target for SKIP is the seat *being skipped*, not the new turn.
    skippedSeat: kind === "skip" && Number.isSafeInteger(event.target)
      ? event.target : null,
    destination, transferCount,
    hasTransfer: destination !== null && transferCount !== null && transferCount > 0,
    erodedCount,
    move: event.move,
    // Public reveal is separately matched by move + seat in React.
    reveal: kind === "reject"
  });
}

/**
 * A pure, testable version of the event cursor used by the React director.
 * The newest *committed* move wins. We never display historical scenes after
 * reconnect/refresh, even if the full server event log arrived at once.
 */
function advanceCursor(previous, input) {
  const old = previous || { key: "", move: 0 };
  const key = String(input.gameKey || "");
  const move = Number.isSafeInteger(input.moveNo) ? input.moveNo : 0;
  if (old.key !== key || input.phase !== "play")
    return { cursor: { key, move }, cue: null, clear: true };

  if (move <= old.move) return {
    cursor: move < old.move ? { key, move } : old,
    cue: null,
    clear: move < old.move
  };
  const event = input.events?.findLast?.(e => e?.move === move);
  const cue = input.visible === false ? null : fromCommittedEvent(event);
  return { cursor: { key, move }, cue, clear: true };
}

module.exports = { EFFECTS, chooseKind, fromCommittedEvent, advanceCursor };
