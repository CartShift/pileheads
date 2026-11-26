"use strict";

// Explicitly opted-in, in-memory observation only. The identity key is used
// solely to deduplicate snapshots; it never becomes part of an export.
function createLog() { return { rounds: new Map(), truncated: false }; }
function observe(log, { key, mode, phase, drill = false }) {
  if (drill || !key || !["local", "online"].includes(mode) ||
      !["setup", "play", "over"].includes(phase)) return false;
  let round = log.rounds.get(key);
  if (!round) {
    // A resumed or already-running round is not an observed start.
    if (phase !== "setup") return false;
    if (log.rounds.size >= 100) {
      if (log.truncated) return false;
      log.truncated = true;
      return true;
    }
    round = { mode, started: false, completed: false };
    log.rounds.set(key, round);
    return false;
  }
  if (round.mode !== mode) return false;
  if (phase === "play" && !round.started && !round.completed) {
    round.started = true;
    return true;
  }
  if (phase === "over" && round.started && !round.completed) {
    round.completed = true;
    return true;
  }
  return false;
}
function summarize(log) {
  const local = { started: 0, completed: 0 };
  const online = { started: 0, completed: 0 };
  for (const round of log.rounds.values()) {
    const target = round.mode === "local" ? local : online;
    if (round.started) target.started++;
    if (round.completed) target.completed++;
  }
  return { local, online, truncated: log.truncated };
}
function exportReport(log, ratings = {}) {
  const rating = v => Number.isInteger(v) && v >= 1 && v <= 5 ? v : null;
  return {
    schema: "pileheads-voluntary-playtest-v1",
    scope: "one-browser-page-opt-in-observation",
    ...summarize(log),
    feedback: {
      fun: rating(ratings.fun),
      clarity: rating(ratings.clarity),
      wouldReplay: ["yes", "no", "unsure"].includes(ratings.wouldReplay) ? ratings.wouldReplay : null
    }
  };
}
module.exports = { createLog, observe, summarize, exportReport };
