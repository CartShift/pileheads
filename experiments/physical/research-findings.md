# SPARK physical-mechanics experiment v1: results and next decision

Prepared 2026-11-09 from the **standalone** finite-deck experiment in this folder.
This does **not** change or validate the production Sites game, the v5 360-card virtual engine, or online rooms.

## Experimental rules modeled

- 2, 3 or 4 simulated players, nine face-up cards, three-card hands, three colors.
- Eight turns per player, one hand card inserted per turn.
- Triple rule: remove contiguous 3+ matching cards and collapse; repeat.
- Optional AABB: if *no triple* remains, remove exact non-overlapping A A B B windows (A != B), scanning left to right; collapse and repeat.
- Optional left/right choice: if a move did not score and the row exceeds nine, choose which end card to discard; otherwise rightmost is removed.
- Draw from a **finite hidden** stock of 144 cards. Refill tries the visible top card; if placing it would create a free pattern, reject it face-up to discard and draw again. Rejection attempts are bounded; after exhausting candidates the next card is force-placed. Exhausted discard may be reshuffled.
- Scored cards remain permanently in their owner's captured pile. No app/device or hidden-deck peeking.
- Wild and Swap are **not** in this model. Any claim of full parity with current Simple+ is false.

## Headline comparison (300 games per arm/player count; 3-player games)

| Rule | No-score moves | 2+ distinct positive-score outcomes | Chains | Average refill rejects / game |
| --- | ---: | ---: | ---: | ---: |
| Triples, forced-right | 37.7% | 34.3% | 11.3% | 5.66 |
| AABB, forced-right | 29.5% | **63.1%** | 9.5% | 11.49 |
| Triples, choose end | 38.6% | 36.2% | 12.5% | 5.86 |
| AABB, choose end | 31.4% | 62.1% | 9.7% | 11.35 |

Full table: [results/physical-144-300x.csv](results/physical-144-300x.csv). Run again with:

    node experiments/physical/simulate.cjs --games 300 --seed 620000 --deck 144 --turns 8 --output

No special-card policy, human psychology, timed turns, physical handling or monetization was modeled. 3-player games all completed in these samples.

### Interpretation

**AABB appears to enlarge scoring choices**, not necessarily increase excitement. In this experiment, its chains became slightly *less* common and refill required roughly twice as many rejections.

**Edge-choice showed no compelling isolated improvement in scoring diversity**, while it mechanically increases the available action count. It may add board-control agency, or it may merely make non-scoring turns slower. We should not adopt it automatically.

**Four-player AABB stock exhaustion is a real blocker.** With 144 cards and eight turns, 3.7% of 300 forced-right simulated games ended early and 1% of edge-choice games ended early. This is one policy/deck combination, not a population estimate or proof of retail safety.

## Deck-capacity follow-up

Separate capacity sweep: 125 seeded games per deck-size × turn-count combination, four simulated players, AABB, forced-right discard. Bot policies used fixed seats. Reproduce with `node experiments/physical/capacity.cjs --games 125 --seed 811000 --output`. Details: [results/capacity-125x.csv](results/capacity-125x.csv).

| Cards | Complete of 125, 6 turns/player | Complete of 125, 8 turns/player |
| ---: | ---: | ---: |
| 120 | 123 | 81 |
| 132 | 125 | 110 |
| 144 | 125 | 121 |
| 156 | 125 | 124 |
| 168 | 125 | 125 |
| 180 | 125 | 125 |

Candidate physical questions:
- **132–144 cards / 6 turns at four players** vs **168 cards / 8 turns at four players**.
- Is rejecting top cards actually pleasant, or is it tedious to physically manipulate the deck and discard?
- Is the 4-card AABB pattern intuitive enough to explain in under 3 minutes?
- Is a zero-point turn still strategically satisfying when it changes future threats?

Zero failures in a small finite sample is **not proof of guaranteed completion**. Before physical-production approval, define a universally safe stock-exhaustion rule rather than relying on deck size alone.

## Major caveats and methodological risks

- Bot strategies are simple (random, immediate greedy and one-ply lookahead). They do not model negotiation, group skill gaps or long-term fun.
- Seeded initial decks are comparable, but draws and subsequent states diverge between variants. Differences are exploratory, not statistical causal identification.
- Distinct-scoring outcomes collapse identical resulting rows; this is a crude approximation of meaningful choices. Two outcomes may feel identical to humans.
- Edge choice produces many duplicate action paths; raw action counts should **never** be interpreted as deeper strategy.
- Physical refill procedure is experimental. Forced placement can leave an existing match on the row, which may then score during the next turn. Fairness must be separately tested.
- Refilling the hand happens after row refill. Physical order is explicitly modeled but not finalized as a consumer rule.
- Mixed policy/seat simulation is not equivalent to a competitive tournament or player preference survey.

## Decision: do not change the live game's rules yet

1. Keep current Sites A/B/C and multiplayer rooms unchanged.
2. Start a *separately versioned* experiment for physical stock and scoring; the present engine is a standalone test harness.
3. Favor **AABB-only** over edge-choice as the first new pattern to test with humans, as it has a clearer measurable benefit.
4. Prototype on paper with 9 × 44mm cards, 3-symbol color coding, 2–4 seats, and documented setup times.
5. Observe 12 mixed-skill groups, including blind rule learning and voluntary replay; measure physical refill rejects per game.
6. Decide whether 6 or 8 rounds and what deck count can guarantee a complete fair game, then ask suppliers to quote the exact chosen bill of materials.

**Rollout condition:** no release until the physical refill rule is bounded and fair under all stock states; user-experience evidence must support added rules.
