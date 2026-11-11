# SPARK Game Design Lab · Two competing core games

**Status:** v0.1 playable **experimental prototypes**, not production-ready and not an approved retail product. This lab is intentionally isolated in experiments/game-lab and changes no existing SPARK Simple+, Momentum, Duel, online-room or saved-game code. Built on a separate GitHub branch and deployed to a unique Vercel **preview**, not a production alias.

## Why build these?

The earlier SPARK variants were too procedural: many apparent options, few meaningful trade-offs, too many turns without interesting scoring, and endgames that grew flatter. Improving the UI or increasing the row length did not solve the underlying game-design issue. This experiment compares **two distinct kinds of interaction** and makes physical viability part of the test from the first version.

### CLAiM (open contested lanes)

- 2–4 people physically, prototype browser supports 2; 72 ranked ordinary cards, three colors
- 4 private cards per player, three public color lanes
- Play one card every turn, then optionally bank one lane where you have strict strength majority and there are 3+ cards
- Bank 3–4 cards for their count, 5+ for double; 7-card overload awards the current unique strength leader
- Player decision: safe small score vs waiting for a bigger payout while opponents can seize the lead
- 14 turns each for 2 players; 12 for 3; 10 for 4

### SIGNAL (simultaneous secret bids)

- 2 people for this prototype; 60 ranked ordinary cards, four colors, plus six small secret target markers
- 5-card private hands, three public ranked prizes every round
- Each player secretly chooses one hand card and one public prize; reveal simultaneously
- Different targets: both win their prizes; same target: highest bid value wins, +2 strength if card color matches the prize; tied strength: neither wins it
- Ten rounds, sum ranks of captured prizes
- Player decision: contest a high prize, take a lower safe prize, or conserve a strong card for later

The mechanisms have different possible strengths and weaknesses, and both can fail. **SIGNAL's simultaneous public-prize selection overlaps the existing game Go Nuts for Donuts**, so it must face an additional differentiation review. A new numerical bid dimension is not sufficient by itself to claim originality.

## Play and print

- Play CLAIM: Open the live preview URL with ?game=claim.
- Play SIGNAL: Open the same live preview with ?game=signal.
- Print the physical decks: Open print.html in the same live preview. It generates 72 CLAIM cards, 60 SIGNAL cards, secret bid target markers, and a score sheet on A4 print pages.
- Read [RULES.md](RULES.md) and [PLAYTEST.md](PLAYTEST.md) to run independent physical tests.

No special code, game rules engine or UI depends on a cloud service at runtime. The standalone files index.html, app.js, engine.js and print.html can be served statically.

## Scripts

    npm run test:game-lab
    npm run simulate:game-lab

The focused test suite comprises pure engine invariants, an interaction/privacy DOM-stub suite and printable-card counting. The existing production npm test and game build remain unchanged; no GitHub Actions run is needed to iterate on this lab.

## Preliminary quantitative diagnostics

A paired seeded sample of 200 seeds per ruleset (400 matches each, reversing planner/greedy player order for every seed) produced:

| Diagnostic | CLAIM | SIGNAL |
|---|---:|---:|
| Completed / simulated | 400/400 | 400/400 |
| Planner vs greedy, win share | 65.1% | 71.4% |
| Seat 1 win share | 50.4% | 47.6% |
| Draw rate | 11.3% | 1.8% |
| Additional behavior | 27.5% of turns scored; 7.69 banks/game; 0.42 banks of 5+ cards/game | 5.91 contested prizes/game; 8.18 uncontested prizes awarded/game |

These are *not controlled skill measurements*. Greedy and planner policies are different, and their relative strength cannot be assumed equal between concepts. Neither figure estimates human win probability or enjoyment.

In CLAIM, the planner sometimes declined an available bank in hope of more points, roughly 1.84 such decisions per match in that sample. This is promising to inspect, not proof that those decisions were good. Many actions still scored no immediate points, which may feel dull if their consequence isn't obvious.

The physical and DOM-stub automated tests were executed in an isolated Vercel preview using Node runtime. Engine tests and all 41 UI assertions passed. The print generator's output counts, A4 page structure, and secret target markers also passed a stub check: 72 + 60 cards, 16 print pages for both decks plus a score sheet.

**Not yet verified:** first-time human understanding, real Android touchscreen, print alignment on a physical printer, actual game duration in minutes, independent comparative enjoyment, originality/rights, manufacturability or profitability.

## The actual product milestone

**Do not pick a winner by developer preference or bot scores.** Ask at least 12 independent two-person groups to play both physical variants in randomized order, record specific sacrifices, confusions, replay requests and perceived agency. Kill weak designs rather than endlessly polishing them. A concept moves to product work only after independent preference, teachability, replay interest, physical feasibility, originality and quote-backed economics meet their decision gates.

**Production rule:** No source changes or deployments to the existing SPARK Sites game, public rooms, saved data or production aliases from this branch.
