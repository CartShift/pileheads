# STACK: Endgame attrition rule experiment

Status: **experimental design, NOT enabled in live games**. Tested against the current 1.6 rules engine on 21 November 2026.

## Observed defect

The endgame currently lacks a monotonic progress guarantee. Once the draw deck reaches zero, all played cards can eventually return to players' hands through `take`, and a player's public/hidden cards need not decrease. In two-player games a deterministic bot policy can return to the **exact same full game state** every 15 or 18 moves, with no BURN or DUMP required.

A separate existing multiplayer log completed after 192 moves, with substantial recycling between two survivors. Its late-game sequence included pile pickups of 10, 8, 14, 3 and 13 cards, and eventually ended after a BURN. The 15/18-move exact repeat was reproduced in the engine simulator, not verified as an identical multiplayer match.

## Proposed physical-card rule

> **Once the draw stock is empty, every pile pickup burns the bottommost card of that pile. The rest of the pile is picked up normally.**

The rule is inactive while any cards remain in stock. It applies to voluntary `take`, unsuccessful blind flips, and (in the full design) forced DUMP pickups. If a pickup contains one card, that card is burned and no cards are added to the hand; the pickup still uses the turn as usual.

Why: With the stock empty, every pickup now permanently increases the burned-card count by at least one. Between pickups, a finite number of cards can be played without replenishment. As long as the finite 54-card game's other transitions remain unchanged, cycles that indefinitely recirculate the same unburned cards cannot persist.

The rule should use the physical **bottom card**, not a random card, and should visibly move that card to the burnt pile at the right of the table. The UI should show the effect in the event log.

## Reproducible evidence

Run:

```sh
node scripts/bench-endgame-attrition.cjs
```

This benchmarks an **in-memory source modification**. It does not change the shipped game engine.

Known pathological two-player seeds:
- `20263535`: full state repeats after moves 82–97 (15 moves). Without fix still playing at 2,000 moves. Candidate finishes at move 81.
- `20264844`: full state repeats after moves 68–86 (18 moves). Without fix still playing at 2,000 moves. Candidate finishes at move 50.

All results below come from 250 identical seeds **per players/rule combination**, with the same deterministic bot styles. They are simulations, not controlled human playtests.

| Players | Rules | Finished before 1,800 moves | Median moves | p95 moves | Maximum observed |
| --- | --- | ---: | ---: | ---: | ---: |
| 2 | Current | 248/250 | 91 | 138 | 1,800 (censored) |
| 2 | Burn bottom card on stock-empty pickup | 250/250 | 89 | 126 | 188 |
| 4 | Current | 250/250 | 136 | 265 | 1,292 |
| 4 | Burn bottom card on stock-empty pickup | 250/250 | 116 | 177 | 221 |

Additional 4-player measurement: the number of games exceeding 200 moves fell from **41/250 to 4/250**.

These data support trialing the change. They do **not** prove optimal fun, fairness, human-game duration or a full implementation's correctness. Bot styles, setup and seat count affect distributions.

## Why not change the bot alone?

The bot scores `take` at -1000 and downranks recently played values. It has no structural objective that guarantees permanent progress. Smarter choices would reduce loops but cannot rule out **human-vs-human** cyclic legal play. A game rule is needed to ensure termination independent of AI.

## Implementation checklist (requires product approval)

- [ ] Introduce a **versioned** post-stock erosion rule for new games; keep previously started rooms on their prior rules version.
- [ ] Centralize pickup/transfer handling so normal take, blind-fail pickup and forced DUMP pickup apply the same erosion policy. Ensure a DUMP card remains burned exactly once.
- [ ] Update event schema to explicitly record `burnedCount` or `eroded` and `takenCount`, so move history and game animation are unambiguous.
- [ ] Run `finish` after erosion if an otherwise empty-handed player takes a one-card pile and ends up holding zero cards.
- [ ] Preserve invariants (all physical card IDs accounted for across deck, hands, piles and ashes).
- [ ] Display the main pile in the center and the **burned card pile on the right** so players can perceive irreversible progress.
- [ ] Verify no change before stock exhaustion, that a 1-card pickup and a blind-fail pickup work, and that remote clients use the same authoritative ruleset.
- [ ] Reproduce the two pathological seeds using production transition paths, including DUMP resolution, and run bot benchmarks at 2–5 player counts and multiple styles.
- [ ] Playtest with humans for balancing and any incentive to take a one-card pile deliberately; monitor duration distribution and dropout.

**Do not merge this rule straight into live multiplayer without versioning and interaction tests.**
