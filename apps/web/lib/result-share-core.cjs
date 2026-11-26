"use strict";

const PUBLIC_PLAY_URL = "https://pileheads.com/play?utm_source=player_share&utm_medium=referral&utm_campaign=round_result";

// Construct a small allowlisted payload. Never serialize the room or game,
// display names, hidden cards, seed, round identifier or current location.
function resultShare({phase, kind, players, drill = false}) {
  if (drill || phase !== "over" || !Number.isInteger(players) || players < 2 || players > 5) return null;
  const lines = {
    first: "First out! The pile didn't get me.",
    escaped: "I escaped the pile!",
    loss: "I'm the PILEHEAD. Rematch, anyone?"
  };
  if (!Object.hasOwn(lines,kind)) return null;
  return {title:"PILEHEADS",text:lines[kind]+" Good friends. Bad moves. Play PILEHEADS.",url:PUBLIC_PLAY_URL};
}
module.exports = {resultShare,PUBLIC_PLAY_URL};
