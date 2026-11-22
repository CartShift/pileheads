"use strict";
/**
 * Bounded deterministic simulation stress for the canonical engine.
 * These are actual games using the same bot strategy as the React table.
 * The test fails on invariant violations, stalled transitions and excessive
 * non-terminating games; it does not change game rules or reshuffle loops.
 */
const assert = require("node:assert/strict");
const Engine = require("../dist/pilehead/engine.js");

const profiles = ["greedy", "saver", "random"];
let total = 0, maxMoves = 0, sumMoves = 0, maxDuel = 0, wins = 0;
const failures = [];
for (let players = 2; players <= 5; players++) {
  for (let seed = 1; seed <= 36; seed++) {
    const gameSeed = (players * 345001 + seed * 6911) >>> 0;
    const game = Engine.create({ players, seed: gameSeed });
    for (let seat = 0; seat < players; seat++) Engine.autoSetup(game, seat);
    Engine.start(game);
    let previousMove = -1;
    let duelMoves = 0;
    let loopCount = 0;
    const seen = new Map();
    try {
      for (let i = 0; i < 3000 && game.phase === "play"; i++) {
        const seat = game.pendingDump?.seat ?? game.turn;
        const old = game.moves;
        if (game.pendingDump) {
          Engine.resolveDump(game, seat, Engine.botDumpTarget(game, seat));
        } else {
          // BOT SNAP is an interrupt, never a source of artificially delayed
          // turns. Do not look into another player's hidden cards.
          const slam = Engine.slamOptions(game, seat)[0];
          const snap = Engine.followUpOptions(game, seat)[0];
          const chosen = snap || slam || Engine.choose(game, seat, profiles[seat % profiles.length]);
          Engine.move(game, seat, chosen);
        }
        Engine.invariant(game);
        if (game.moves === old) {
          assert.ok(game.pendingDump && !loopCount,
            "only a pending DUMP may leave move count unchanged");
          loopCount++;
        } else loopCount = 0;
        if (game.stock.length === 0 && game.people.filter(p => !p.out).length === 2)
          duelMoves++;
        // Use only public state here: it is an early-warning signal for
        // recurrent hand/pile cycles, not proof that a game is impossible.
        const fingerprint = [game.turn, game.stock.length, game.pile.map(c => c.id).join(","),
          ...game.people.map(p => p.hand.length + ":" + p.up.length + ":" + p.down.length)].join("|");
        seen.set(fingerprint, (seen.get(fingerprint) || 0) + 1);
        if (seen.get(fingerprint) > 40)
          throw Error("repeated coarse public game state over 40 times");
        previousMove = game.moves;
      }
      assert.equal(game.phase, "over", "game exceeded 3000 moves without finishing");
      assert.equal(game.finishedOrder.length, players - 1, "all but the loser should finish");
      assert.ok(game.loser !== null, "the last player must be the PILEHEAD");
      assert.ok(!game.finishedOrder.includes(game.loser), "loser cannot finish early");
      assert.ok(previousMove >= 0);
      maxMoves = Math.max(maxMoves, game.moves);
      maxDuel = Math.max(maxDuel, duelMoves);
      sumMoves += game.moves;
      wins++;
    } catch (error) {
      failures.push({ players, seed, moves:game.moves, stock:game.stock.length,
        active:game.people.filter(p=>!p.out).length, message:error.message });
    }
    total++;
  }
}
const summary = { version: Engine.VERSION, simulations: total,
  finished: wins, maxMoves, avgMoves: Math.round(sumMoves / Math.max(wins,1)),
  maxFinalDuelMoves:maxDuel, failures:failures.slice(0,12) };
console.log("STACK tournament stress:", JSON.stringify(summary));
assert.equal(failures.length, 0, "some seeded matches failed engine integrity or termination");
