# SPARK Push & Take experiment (mode D)

**Status: draft playtest variant, not an approved change to the physical game or published Sites site.** Branch: `experiment/push-take-mode-2026-11-09`. Base: A/B/C Simple+ v5.

## Hypothesis

Can a zero-score turn feel more deliberate if a player knows which card they will receive, without changing the one-card-per-turn / three-in-a-row / count-your-captured-cards rules?

**Mode D:**
- Nine shared cards, three colors, three cards in hand, eight turns/player.
- Insert a **single** card *before one of the nine row cards*. The otherwise pointless far-right placement is disabled in D. Keep the classic ten gaps in A/B/C.
- If an ordinary hand placement scores **zero**, the rightmost row card is taken into the acting player's hand, replacing the played card. No random hand draw. The row remains nine cards.
- If a placement scores, collect all 3+ color runs and cascades as usual. Draw a replacement hand card and refill the row normally.
- SWAP can precede an ordinary hand placement. A zero-score swapped move takes the rightmost card.
- WILD does not consume a card from the hand; a zero-score Wild discards the rightmost overflow card instead. This preserves three cards in hand.
- No new suits, bonus points, two-card turns or arithmetic. Score is still the number of captured colored cards.
- Opt-in in solo games and **private human rooms**; existing A/B/C remain unchanged and B stays the default. Friends must have Sites viewer access before a private invitation works.

These semantics preserve the existing 360-card **digital** deck and selective refill. They are **not** physical deck-parity rules.

## Controls for a fairer comparison

The experiment separates:
1. **B-full:** Extended 9 row cards, existing 10 legal gaps (current game).
2. **B-nine:** Extended 9 row cards but allow only nine gaps, to isolate the effect of removing the far-right position.
3. **D-take:** Push & Take, same nine gaps as B-nine.

Seeded starts: 400 games per arm for two players and three players, 8 rounds/player, same seeds 91001–91400, seat-rotated random / greedy / limited-lookahead strategies. **2,400 games total.** Same starts but downstream draws differ as rules diverge. Wild and Swap are included.

Reproduce with:

```sh
node tests/push-take.cjs
node experiments/push-take/compare.cjs --games 400 --seed 91001 --output
```

Outputs: [JSON](../experiments/push-take/results/comparison-400x.json) and [CSV](../experiments/push-take/results/comparison-400x.csv).

## Observed bot results

| Metric | B-full, 3 players | B-nine, 3 players | D-take, 3 players |
| --- | ---: | ---: | ---: |
| Turns scoring zero | 45.1% | 44.5% | 45.7% |
| Chain turns (2+ waves) | 11.0% | 10.7% | 10.1% |
| Scoring move available at next turn after a zero-point turn | 59.2% | 59.2% | **54.1%** |
| Mean distinct positive-scoring options per turn | 4.12 | 3.98 | 3.86 |
| Edge cards taken per complete game | 0 | 0 | **10.1** |

For **two-player** games, D was similarly weaker than the controls on zero-score rate and next-turn opportunity (D: 47.7% zero-score / 54.1% next-turn scoring chance vs B-nine: 44.0% / 62.3%).

**Interpretation:** Push & Take changes a meaningful quantity of cards in a game, but did **not** improve standard bot performance metrics. It often decreases score opportunities after a missed turn. Do not sell this as proven more strategic, exciting, or commercially successful.

Important limitations:
- A fixed rightmost card means the player chooses which card to *trade away*, not which color to receive. This may be less agency than expected.
- B uses at most four lookahead candidates, D at most eighteen; strategy-bot win rates are not an equal-search-budget skill test.
- No humans were observed. More predictability might feel better even with lower average scores, or might feel repetitive.
- The available positive-scoring choices depend on the current bot strategy, ability usage, and draw algorithm.
- The simulator is not a retail deck: fixed 360-card virtual stock with hidden selective refill. Physical take/refill implementation and fair exhaustion need separate validation.
- A draw reduction can reduce physical deck churn but also reduce surprise and tempo. Both effects matter.

## Human playtest plan

**Question to answer:** after playing both variants, do players prefer the tension and meaningful decisions in D despite slightly lower scoring opportunity?

Use a crossover with **at least 12 independent groups**, 2–3 people each, mixed skill levels. Randomize whether B or D is played first. Use an identical initial board/hand seed where possible, followed by free replays. Don't explain which variant you expect to win.

Track:
- Time to learn the one extra consequence of a zero-score turn.
- Time spent studying the row, whether players understand the deterministic edge card.
- Whether a no-score turn feels purposeful; give an example of a specific planned next move.
- Voluntary immediate replay and preference after each group plays both modes.
- Whether more skilled players report planning a move ahead, not merely scoring instantly.
- Whether rightmost card creates tactical blocking, hoarding, or boring exchange cycles.
- Whether players enjoy the lack of random replacement or miss the surprise.

Keep **all scores** as card counts; do not add special points.

### Decision gate

Keep D only if a clear majority of independent playtest groups prefer it, people can explain the edge-card rule unassisted, and no obvious no-op/slowdown loop emerges. If human preference is flat or negative, revert to B and search for a different interaction within the same triple-matching rule. No early publishing or retail commitment based on bots alone.

## Code and QA scope

- `dist/engine-v5.js`: opt-in mode D, deterministic `preview` reducer and no-score take.
- `dist/index.html`: separate setup choice, nine insertion gaps, hand-taking narration/animation and rules; old saves keep their original rules.
- `dist/sim-core.js` and `dist/simulation-results.json`: mode D comparison and capture metrics in the existing simulator.
- `tests/push-take.cjs`: engine, ability, scoring, illegal gaps, bot completion, UI sequence, save/reload, and animation mapping.
- `worker/rooms.mjs` and `dist/online.js`: opt-in mode D is offered in private 2–3-player rooms, with nine legal gaps and a take/discard explanation; server validates all moves and continues hiding opponents’ hands.

Tests performed in this branch: source-based V8 regression parity of 72 complete legacy-mode games (1,440 turns) vs main; independent V8 execution of the new focused tests (50 games / 1,000 turns); 2,400 seeded comparison games; the bundled 120-games-per-mode simulation; two complete 2/3-person experimental D rooms (40 moves) through a mocked in-memory DB adapter, including private hands, invalid far-right rejection, server scoring, and take resolution. **Native Node/npm test, production D1 browser QA, real human matches, and ChatGPT Sites deployment not performed.**

A successful D multiplayer playtest requires at least two separately authenticated ChatGPT users with private Sites viewer access. Run an actual two-account room after a reviewed private preview deploy; the mock database validation alone does not establish browser compatibility.

No changes should be deployed to the existing private Sites URL until a reviewed preview is tested and approved.
