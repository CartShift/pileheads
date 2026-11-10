# SPARK Attack: Merge Momentum playtest

This is a separate experiment in the existing Vercel Exchange lab. It does not change the original SPARK Sites game, its online rooms or saved-game formats.

## Previous experiment links (v0.1 until a v0.2 preview is published)

- [Standard Attack](https://spark-exchange-lab.vercel.app/attack/?mode=attack)
- [Attack + Chains](https://spark-exchange-lab.vercel.app/attack/?mode=chains)
- [Attack without penalties](https://spark-exchange-lab.vercel.app/attack/?mode=no-penalty)
- [Two people, same device](https://spark-exchange-lab.vercel.app/attack/?mode=attack&opponents=hotseat)
- [Existing Exchange comparison](https://spark-exchange-lab.vercel.app/?mode=ex934)

Deep link parameters: mode, hand (7/9/11/13), opponents (bots/hotseat) and seed (nonnegative integer). No long-distance online multiplayer in Attack.

## Actual rules

Two players. Four colors. Nine cards in the shared row. Nine cards in each hand at the start (configurable 7–13), from a finite balanced 144-card deck.

1. Insert exactly one card from your hand before one of the nine row cards.
2. Any contiguous group of three or more equal cards is removed; the row collapses and new consecutive groups are also removed in successive waves.
3. If nothing matched, take the rightmost card from the row into your hand, replacing the card you just placed. Your hand size stays constant. A move that changes neither the row nor your hand is prohibited.
4. If any match occurred, the placed card leaves your hand. Then:
   - Attack: send the first captured card to the opponent; discard remaining captured cards.
   - Chains: send one captured card from EACH matching wave; discard remaining captured cards.
   - No Penalties: opponent receives no captured cards; discard all captured cards.
   - **All modes:** a successful first placement earns ONE optional additional placement. The extra placement can make another Merge and attack the opponent, but **never earns another bonus**. You may instead end your bonus to preserve the board.
5. Refill the row from the top of the shuffled deck. Any newly drawn top card that would create a free three-card match goes into the visible discard pile. Discard may be reshuffled into the draw stock; refill retries are bounded.
6. The first player with NO CARDS in hand after a placement wins instantly. One full turn consists of one placement and up to one optional bonus placement. No point tracking or special cards. Safety cap: 240 full turns.

## Experiment identity and save compatibility

This is an experimental v0.2 rules revision on a separate GitHub feature branch, not an update to Simple+ or to its online rooms. Browser storage now uses `spark-attack-lab-v02` so the earlier discard-phase game cannot be misinterpreted as a bonus phase; the v0.1 save remains untouched. One turn's log stores up to two actions and records bonus usage. Penalty cards are drawn from captured groups, never conjured from a separate deck.

## Reproducible tests

- node experiments/attack/test.cjs
- node experiments/attack/ui-test.cjs
- node experiments/attack/simulate.cjs --games 24 --seed 171000 --output

The simulator stores results in results/attack-24x-171000.json and .csv. Full playtest UI: playtest.html, app.js, engine.js. Source files are served as attack/index.html, attack/app.js and attack/engine.js on Vercel.

## Historic v0.1 bot findings (24 seeded games per mode and opening-hand size; **not valid v0.2 results**)

| Starting cards | Attack median turns | Chains median | No-penalty median |
|---|---:|---:|---:|
| 7 | 15 | 15 | 13 |
| 9 | 24 | 23 | 18 |
| 11 | 27 | 28 | 20 |
| 13 | 33 | 33 | 24 |

In this sample, 288/288 games ended with a winner. These numbers are bot turns, NOT human play minutes. They do not establish whether the game is enjoyable or commercially viable. Bot decisions use a fixed limited heuristic and don't inspect the opponent's hidden hand or shuffled stock.

## Human questions to test

- Does the optional second placement produce more meaningful two-move planning than the old mandatory discard?
- Does receiving an attack card feel threatening or sometimes helpful?
- Are late-game comebacks possible when one player is close to zero cards?
- Does a chain attack remain exciting without punishing the opponent excessively?
- Is an initial hand of 9, 11, or 13 cards better for a game longer than two minutes?
- Are some non-scoring turns ineffective and repetitive?

Test with people in varied orders, including players unfamiliar with our work. Record session time, how often players hesitate between real alternatives, voluntary replay, perceived fairness and reasons for choosing a variant. Compare 12 or more independent groups as an exploratory playtest, not a statistically powered study.

## Safeguards and limitations

- The standalone Attack code is isolated from dist/ and real Friends rooms. The v0.2 bonus rule has NOT been validated with human players.
- Human playtests, Android touch QA, and proof of guaranteed deck completion are pending. Code changes alone cannot establish a perfect game.
- This Vercel lab uses a manual static snapshot deployment. Publish BOTH the original Exchange files and the Attack assets on each update to preserve the original root URL.

## Next evidence gates

1. Run `npm test` or both Attack test scripts; verify two-action cap, conservation, skip/restore, and hotseat hand privacy.
2. Compare equal seeded bot runs of v0.1 and v0.2 for completion, median and P90 full turns, penalty swings, bonus-attack frequency, and no-score stalls.
3. Run at least 12 independent first-time human playtest groups with randomized variant order. Collect average session minutes, clarity, perceived fairness, rematches, and genuine decisions.
4. Keep nine-card hand and nine-card row as baseline until evidence favors another length; avoid adding new special cards or more rules yet.
