# SPARK experiment roadmap and test matrix

No auto deployment. Start from `main` Simple+ v0.5; create a rules-versioned opt-in branch/flag for all new experiments. Existing A/B/C modes, historical saves/replays, online rooms and the Sites URL must be preserved.

## Decision sequence

### Gate 0: verify the real baseline (no rule changes)

- Freeze seed set, game count and bot-policy mix from `dist/sim-core.js`.
- Collect `zeroRate`, `distinctScoringPerTurn`, `comboRate`, `chainRate`, voluntary Wild/Swap use, score by seat and game duration **in player turns only**.
- Instrument whether a no-score turn changed the *next-turn* best opportunity, not just current score.
- Capture explicit v5 `fill()` behavior and its physical incompatibility.
- Test with 2 and 3 players as the current engine supports. **4-player engine support would be a separate implementation**.
- Verify hidden-hand isolation and prevent lookahead from peeking at true deck order.

### Gate 1: physical-rule fidelity

Implement a finite shuffled deck and deterministic refill rule as an **experimental version**. Seeded tests: tiny deck, exhausted colors, all-safe-candidates-exhausted, refill that creates triple, simultaneous matches, edge placement, empty board, and ability tokens.

Compare R1 top-card rejection with R2 unrestricted refill using matched seeds and *fully specified* outcomes; never select based only on ease of code.

### Gate 2: structural improvements (one variable at a time)

| Arm | Rules | Isolated question |
| --- | --- | --- |
| Control | 9/3, triples only, current forced-right overflow | How much agency exists already? |
| AABB | Control + deterministic AABB matching | Does a second easy-to-teach pattern improve meaningful choice? |
| EDGE | Control + player chooses overflow end | Are no-score turns more purposeful without slowing turns? |
| Combined (only if individually useful) | AABB + EDGE | Do benefits survive interaction? |

Do not conflate this matrix with current public A/B/C mode labels, especially C's SHIFT.

Run >=1,000 seeded simulated games per arm per applicable player count with three bot policies (random, immediate greedy, limited lookahead), rotating seats. The exact threshold is an experiment size convention, not a statistical power guarantee.

Recommended metrics:
- % turns with no legal positive-scoring move **before** choice
- % turns actually scoring under the chosen strategy
- mean **distinct future states** available, not just number of duplicate placement buttons
- % turns with >=2 different positive-score or future-setup outcomes
- multi-wave chain incidence and waves distribution
- unused/used Wild and Swap by turn, marginal/counterfactual impact
- points/turn and score variance; win rate by bot policy **and seat**
- mean physical refill reject count and probability of reshuffle/exhaustion
- end insertion value, left/right discard bias
- computational CPU time is **not** player turn duration

When interpreting: a 60% combo rate might still be dull if one obvious move dominates; a 20% zero-point rate can be enjoyable if those moves set up threats. Prioritize decision diversity and human enjoyment.

### Gate 3: human blind playtests

- At least 12 groups for exploration: 4 new-to-card-games, 4 casual, 4 enthusiasts; include mixed-language groups.
- Rotate order across rulesets; compare **within groups** and across skill levels, recording any repeat exposure/learning effects.
- Each group: unassisted rules read, one warm-up, two scored games where feasible, optional immediate replay, and a follow-up request a week later.
- Record consent for videos before capture. Do not record personal identifiers by default.
- Track time to first legal move, rules interventions, per-turn thinking time, card handling, confusion, longest idle stretch, voluntary replay request, teach-to-friend performance, purchase intent at a real price and willingness to actually pre-order.
- Compare at least 1–2 existing competitor games with analogous player counts to avoid testing only against our own prototypes.

Provisional product targets (not industry statistics): >=60% of groups ask to replay unaided; most groups teach rules in <=3 minutes; ordinary physical games <=20 minutes, with <30 seconds administration/turn; >=70% participants say their choices felt consequential. If targets fail, revise mechanics before visual polish.

### Gate 4: real purchasing signal

Use honest prototype pricing and disclosure; test landing page and optional refundable preorder at €16.90/€19.90/€22.90. Track denominator, traffic source, purchase conversion, refund, CAC and gross margin. Do not assume an email signup is equivalent to paying. No production print run without demonstrated demand and a positive contribution margin by channel.

## Work items (implementation order)

1. **P0** Document physical matching, refill and overflow choices as deterministic test fixtures.
2. **P0** Add new rules-version metadata and ensure old saves/replays/rooms remain byte-compatible.
3. **P1** Implement a finite-deck/physical-refill simulator mode, not deployed to existing game types.
4. **P1** Instrument experimental AABB and EDGE flags, each independently testable.
5. **P1** Produce paired-seed batch report (CSV/JSON) with clear simulator version and conditions.
6. **P1** Create a printable prototype and blind-playtest score sheet.
7. **P2** Prototype physical Wild markers and row card width; test 120/132/144 card stock.
8. **P2** Run small actual-group validation, update the design decision log.
9. **P3** Source supplier quotes and start pre-sales validation only after gameplay gates.

## No-go conditions

Reject a candidate if physical refill loops/deadlocks, any pattern priority is ambiguous, controls no longer agree with engine/replays, more than one rule can silently alter final scores, or a marginal gain in combo frequency requires a large increase in time/rules confusion.

## Reviewer checklist for an eventual gameplay PR

- [ ] Adds a new rules version instead of changing v0.5 silently
- [ ] Stable seed reproducibility and control/variant tests
- [ ] Supports smallest legal deck and exhaustion recovery
- [ ] Score equals physically removed cards (no phantom points)
- [ ] Insertion at every gap incl. both ends
- [ ] Human/AI/online-room pathways use the same reducer
- [ ] Old saves, replays and online rooms are unaffected
- [ ] Browser mobile UI clear in Hebrew and English
- [ ] Physical blind rulebook verified
- [ ] No public Sites publishing, unnecessary Actions or expensive repeated CI
