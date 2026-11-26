"use strict";
// Pure dispatch policy: no browser, timer or engine mutation.
function volumeValue(value) {
  const n = Number(value);
  return value === null || value === "" || !Number.isFinite(n) ? 70 : Math.max(0, Math.min(100, Math.round(n)));
}
function committedFeedback(event, cue, phase, me, loser) {
  if (phase === "over") return loser === me ? "loss" : "win";
  if (event?.type === "counter-dump") return "counter";
  if (cue?.kind === "reject") return "reject";
  if (cue?.kind === "slam" || (event?.type === "followup" && event.burned)) return "slam";
  const kind = cue?.kind;
  return kind === "pickup" ? "take" :
    ["burn","snap","dump","reset","ghost","under","skip"].includes(kind) ? kind : "play";
}
const HAPTICS = Object.freeze({
  select: 8, play: 12, take: 22, reject: [22,40,22],
  burn: [20,28,35], slam: [25,25,35], snap: [10,22,10],
  dump: [18,30,18], counter: [12,25,24], win: [12,30,12,30,25], loss: 30
});
module.exports = {volumeValue, committedFeedback, HAPTICS};
