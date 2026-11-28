'use strict';
// Web-local presentation and scheduler selectors. The engine is injected;
// rules, legal moves and hidden-card decisions still belong to the canonical engine.
function localBotOpportunity(Engine,game) {
  if (game.phase !== "play") return null;
  if (game.pendingDump) return game.pendingDump.seat === 0 ? null :
    { seat: game.pendingDump.seat, kind: "dump", ids: "" };
  const bots = game.people.slice(1).filter(p => !p.out).map(p => p.seat);
  const snap = bots.find(seat => Engine.followUpOptions(game, seat).length > 0);
  if (snap !== undefined) return { seat: snap, kind: "snap",
    ids: Engine.followUpOptions(game, snap)[0].ids?.join(",") || "" };
  const slam = bots.find(seat => Engine.slamOptions(game, seat).length > 0);
  if (slam !== undefined) return { seat: slam, kind: "slam",
    ids: Engine.slamOptions(game, slam)[0].ids?.join(",") || "" };
  return game.turn === 0 || game.people[game.turn]?.out ? null :
    { seat: game.turn, kind: "turn", ids: "" };
}

function asLocalRoom(Engine,game) {
  return {
    phase: game.phase, turn: game.turn, moves: game.moves, round: 1,
    botSeats: game.people.slice(1).map(p => p.seat),
    endgameRule: game.endgameRule === "final-duel" ? "final-duel" : "classic",
    stockCount: game.stock.length, pile: game.pile, ashesCount: game.ashes.length,
    limit: game.limit, pendingDump: game.pendingDump || null,
    pendingCounter: game.pendingCounter ? { seat: game.pendingCounter.seat, attacker: game.pendingCounter.attacker, count: game.pendingCounter.ids.length } : null,
    finishedOrder: game.finishedOrder, loser: game.loser,
    players: game.people.map(p => ({
      seat: p.seat, out: p.out, up: p.up, handCount: p.hand.length, hand: p.hand,
      downCount: p.down.length, blindSlots: p.down.map((_, i) => i),
      pickups: p.pickups
    })),
    events: game.events,
    reactions: [],
    blindReveal: game.blindReveal || null,
    omitSkip: game.omitSkip === true,
    legal: game.phase === "play" && game.turn === 0 ? Engine.options(game, 0) : [],
    slam: game.phase === "play" ? Engine.slamOptions(game, 0) : [],
    followup: game.phase === "play" ? Engine.followUpOptions(game, 0) : [],
    setupReady: game.setupReady || []
  };
}

module.exports={localBotOpportunity,asLocalRoom};
