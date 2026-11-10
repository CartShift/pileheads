# SPARK Attack: shedding-rules lab

This is a separate experiment in the existing Vercel Exchange lab. It does not change the original SPARK Sites game, its online rooms or saved-game formats.

## Live test links

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
   - Attack: send the first captured card to the opponent, discard the remaining matched cards, and choose ONE extra card from your hand to discard.
   - Chains: send one captured card from EACH matching wave to the opponent; discard one extra hand card for EACH wave, capped by remaining hand size.
   - No Penalties: opponent receives no captured cards; discard one extra card from your own hand.
5. Refill the row from the top of the shuffled deck. Any newly drawn top card that would create a free three-card match goes into the visible discard pile. Discard may be reshuffled into the draw stock; refill retries are bounded.
6. The first player with NO CARDS in hand after placement or required discards wins. No point tracking, special cards, or bonuses. Safety cap: 240 turns.

## Reproducible tests

- node experiments/attack/test.cjs
- node experiments/attack/ui-test.cjs
- node experiments/attack/simulate.cjs --games 24 --seed 171000 --output

The simulator stores results in results/attack-24x-171000.json and .csv. Full playtest UI: playtest.html, app.js, engine.js. Source files are served as attack/index.html, attack/app.js and attack/engine.js on Vercel.

## Bot findings (24 seeded games per mode and opening-hand size)

| Starting cards | Attack median turns | Chains median | No-penalty median |
|---|---:|---:|---:|
| 7 | 15 | 15 | 13 |
| 9 | 24 | 23 | 18 |
| 11 | 27 | 28 | 20 |
| 13 | 33 | 33 | 24 |

In this sample, 288/288 games ended with a winner. These numbers are bot turns, NOT human play minutes. They do not establish whether the game is enjoyable or commercially viable. Bot decisions use a fixed limited heuristic and don't inspect the opponent's hidden hand or shuffled stock.

## Human questions to test

- Is the additional discard after an attack enjoyable or a chore?
- Does receiving an attack card feel threatening or sometimes helpful?
- Are late-game comebacks possible when one player is close to zero cards?
- Is a chain attack exciting or too punishing?
- Is an initial hand of 9, 11, or 13 cards better for a game longer than two minutes?
- Are some non-scoring turns ineffective and repetitive?

Test with people in varied orders, including players unfamiliar with our work. Record session time, how often players hesitate between real alternatives, voluntary replay, perceived fairness and reasons for choosing a variant. Compare 12 or more independent groups as an exploratory playtest, not a statistically powered study.

## Safeguards and limitations

- The standalone Attack code is isolated from dist/ and real Friends rooms.
- Human playtests, Android touch QA and proof of guaranteed deck completion are pending.
- This Vercel lab uses a manual static snapshot deployment. Publish BOTH the original Exchange files and the Attack assets on each update to preserve the original root URL.
