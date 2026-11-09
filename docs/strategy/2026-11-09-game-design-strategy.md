# SPARK: game-design strategy, positioning and evidence

**Decision:** which mechanical additions increase agency, replayability and social interaction *without adding a rules-learning or physical-admin burden*?

**Product thesis:** 2–4 player, language-light, fast physical card game; shared changing line; players insert a card, seek patterns and chains, and interrupt opponents' plans. No companion app required.

## 1. Current game: what is real today

The repository currently implements `dist/engine-v5.js`: 3 colors (O/B/P), shared row length 8/9 (A/B/C), 3 cards in hand, run of 3+ identical contiguous cards removed for one point each, consecutive collapse chains, 8 turns/player, one Wild and Swap per player. Mode C includes a neutral SHIFT in the row. Scoring and bot choices are tested digitally. Online rooms support 2–3 players.

Specific engine behavior **not suitable for a retail rules booklet as-is**:

- `deck()` creates **360** cards, not a compact physically sourced deck.
- `fill()` uses `findLastIndex` to search the hidden deck for the next non-matching color. A normal physical shuffle-and-draw cannot inspect and choose future hidden cards.
- On overflow without a match the row is truncated with `slice(0, n)`: the last/rightmost card disappears. An insertion at the far right can effectively disappear immediately.
- WILD materializes a player-declared color without consuming a normal hand card. Physical pieces must represent and track this.
- Current tests cover the software engine, not objective enjoyment, physical setup time, real-human play time or willingness to buy.

These are **design blockers**, not proof that the digital code is broken.

## 2. What players should experience

- **Spot** a tempting pattern with 2+ viable moves, not only search for an immediate triple.
- **Commit** to one card and one position; don't require choosing from another market every turn.
- **React** when an opponent disrupts a plan; preserve meaningful future options.
- **Celebrate** occasional deliberately set-up double chains, not automatic payout almost every turn.
- **Replay** because the shared row keeps changing and each game presents fresh tactical tradeoffs.

Core pitch to validate: *"One card can start a chain reaction. Your opponents are planning on the same row."*

Guardrail: <3 minutes rules explanation, no arithmetic beyond removed cards, <20 minutes observed 2–4-player play, no smartphone at the table.

## 3. Competitive landscape and differentiation

- **SCOUT**: constraints create decision depth rather than many card powers. Official source: https://oinkgames.com/en/games/analog/scout/
- **Potion Explosion**: physical chain reaction as a gratifying centerpiece; requires careful component handling. Overview: https://www.tabletopgaming.co.uk/reviews/potion-explosion-review/
- **Sea Salt & Paper**: combos and timing create interesting tradeoffs with few components. Official source: https://studiobombyx.com/en/jeu/sea-salt-paper/
- **Schicht im Schacht**: precedent for removing matches and collapsing cards into further matches. Read publisher rules: https://www.moses-verlag.de/media/0f/e7/35/1599117496/90292_Schicht_im_Schacht_rules_english_web.pdf

**No claim of novelty** is justified by a theme or by chain reactions alone. Competitive audit must compare exact turn structure, pattern detection, shared row, special cards, scoring, packaging, customer target, and price. Check trade names separately before marketing.

## 4. Quantitative hypotheses from independent simulations

See `data/secondary_patterns.csv`; each row covers **1,400 synthetic games under one independent model**. These results **do not use** the production `dist/engine-v5.js` rules verbatim. They are directional.

| 9-card hypothesis | Turns without scoring opportunity | Turns actually scoring | Chains | Turns with differing scoring outcomes |
| --- | ---: | ---: | ---: | ---: |
| Three colors, triple only | 28.5% | 49.2% | 7.8% | 7.8% |
| Add `AABB` pattern | **19.8%** | **57.4%** | 7.8% | **52.3%** |
| Add `ABAB` pattern | 1.2% | 72.8% | 34.5% | 83.2% |
| Four colors, triple only | 50.1% | 33.3% | 2.5% | 1.8% |

`AABB` = exactly two adjacent same-color cards immediately followed by two adjacent cards of a **different** color, e.g. 🟣🟣🟠🟠. This is an **experiment**, not an adopted rule. It may increase distinct tradeoffs without a separate resource or turn stage.

`ABAB` is **not recommended yet**: scoring opportunities were so common that chain payouts risk losing meaning, and refill became more cumbersome. Four colors without other changes also lowered scoring opportunities substantially.

**Caveats:** heuristic bots, simulated draws, fixed horizon, nonidentical resolving/refill assumptions, and no measurement of pleasure, difficulty, skill gap, or real retail demand. An increased rate of scoring is not automatically an improved game.

## 5. Candidate interventions, ordered by value-to-complexity

| Priority | Candidate | Why | Risk / test |
| --- | --- | --- | --- |
| P0 | Physical-rules parity | Real product must be played with a finite hidden deck | Refill, overflow, Wild representation |
| P1 | Baseline **9 cards / 3 colors** | More row choices without a new rule | 9 small cards must fit a home table |
| P1 | `AABB` as a second pattern | More tactical outcomes with only one extra visual rule | Ambiguous overlaps, more scoring, refill |
| P2 | Choose overflow end on non-scoring placement | Makes a zero-point turn a deliberate setup | May increase per-turn time |
| P2 | Simplify special power interaction | Wild should be meaningful, Swap shouldn't waste a turn | Dominant lines / analysis paralysis |
| Hold | Fourth color, global tasks, currencies, arbitrary random abilities | Increased teach cost and fewer combos | Revisit only with playtest evidence |

## 6. Explicit non-goals for this iteration

- No immediate redesign, additional colors, permanent deckbuilding or more than two special abilities.
- No new website, forced replatform, public Sites publish or modifications to the existing live rooms.
- No claim that 1,400 bot games imply commercial success.

## 7. Decision principle

Select the smallest rule change that improves **(a) proportion of turns with ≥2 meaningfully different options**, **(b) human voluntary replays**, and **(c) physical turn throughput**, while not making chains automatic. Optimize *choices*, not just scoring frequency.

See [experiment roadmap](experiment-roadmap.md) for paired tests and acceptance gates.
