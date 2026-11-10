# SPARK Exchange: independent game-design exploration

**Research date:** 2026-11-10
**Status:** exploratory rules and bot simulations; **NOT** a new recommended production mode, and **NOT** deployed. Existing SPARK Simple+ Sites URL, engine, online rooms, saves and `main` remain unchanged.

## Why investigate?

Simple+ can feel repetitive: insert a card, immediately score a triple if possible, otherwise make an arbitrary setup. More scoring options alone do not equal strategic depth. We therefore tested whether exchanging a hand card for a visible row card creates genuine trade-offs: scoring now vs future hand composition vs opportunities for the opponent.

## Precisely one new core action

**Exchange rule:** Each player holds 3 colored cards. On their turn, choose 1 card from hand and exchange it with 1 **different-color** card in a shared face-up row. Keep the removed row card in your hand. Any contiguous run of 3+ equal cards disappears into the active player's captured pile. Close gaps and repeat until no run remains. Refill the row from the hidden deck. After eight turns per player, whoever captured the most cards wins. Each captured card is one point; no calculation, extra effects, abilities or bonuses.

**No-op swaps are illegal.** This is not the previous Push & Take proposal: the removed card can come from any chosen position, including on a scoring move. The player has agency over which card is exchanged.

For a physical-friendly baseline we use a single finite balanced deck, deal hands and row from the same deck, and check the new top refill card before placing it. If it would form an immediate triple on the right end, reject it face-up and draw again. This is not a final consumer refill rule: **stock exhaustion and no-safe-draw cases require an unambiguous physical fallback before any product printing**. A separate cascade-refill variant was measured as well.

## The most useful finding: original Exchange was TOO easy

### Identical condition: three players, safe refill, 144 ordinary cards, 8 turns/player, 140 seeded games per arm

| Configuration | Pre-move opportunity to score | Actual zero-point turns* | Multi-wave chains | Distinct positive-scoring outcomes/turn | Trade-off proxy† |
| --- | ---: | ---: | ---: | ---: | ---: |
| Physical-style Insert: 9 row / 3 hand / 3 colors | 61.5% | 55.4% | 7.0% | 0.92 | 6.5% |
| Exchange: 9 / 3 / 3 | **93.7%** | 29.3% | 19.7% | 2.65 | 54.4% |
| Exchange: 7 / 2 / 3 | 80.9% | 37.3% | 8.3% | 1.54 | 23.5% |
| Exchange: 7 / 2 / 4 | 57.0% | 57.4% | 2.8% | 0.93 | 9.1% |
| Exchange: 8 / 2 / 4 | 62.7% | 54.5% | 3.9% | 1.11 | 11.6% |
| Exchange: 7 / 3 / 4 | 69.9% | 49.1% | 3.9% | 1.25 | 15.6% |
| Exchange: 9 / 3 / 4 | **79.4%** | 42.6% | 7.4% | **1.75** | **25.8%** |

\* A rotating mixture of random / greedy / planner bots produced actual zero-point turns. These are **not** optimal human play rates. A high scoring opportunity percentage with a much lower actual scoring rate is expected when a random bot is included.

† The heuristic counts turns with 2+ nondominated scored options under an approximate combination of immediate points, known post-exchange hand opportunity and worst-case possible opponent color. It is **not a validated metric for human meaningful choice**. It may systematically favor some mechanics.

**Interpretation:** Original 3-color Exchange lets a skilled player score almost every turn. It may feel like a conveyor belt of easy triples. Increasing to **four plain colors** does *not* introduce a new rule or card type, and reduces the excessive available-score rate, but also reduces chain reactions. The best candidate for human study is currently **9-row / 3-hand / 4-color Exchange**, with **7-row / 3-hand / 4-color** as a faster lower-scoring challenger.

Do not equate increased choice proxy with fun, product differentiation or financial viability.

## A stronger "does thinking matter?" probe

Separate 260 seeded, seat-rotated **2-player games per matchup**, 8 turns/player, safe refill. Planner is one particular heuristic using visible board and own hand only; greedy maximizes immediate captured cards. Tie wins are split.

| Configuration | Planner win share vs greedy |
| --- | ---: |
| Insert 9 / 3 / 3 | 73.8% |
| Exchange 9 / 3 / 3 | **57.7%** |
| Exchange 7 / 3 / 4 | 73.3% |
| Exchange 9 / 3 / 4 | 69.0% |

These numbers are conditional on our **specific bot policies**, whose quality is not proven equal across rulesets. The 3-color Exchange gave the planner much less advantage over greed than physical-style Insert, despite more scoring. The four-color versions recover a difference, but still do not prove richer human strategy.

## What refill does to luck

150 seeded games per arm/refill rule, 3 players:

| Variant | Safe-refill chain turns | Cascade-refill chain turns | Cascade points attributable only to random refill |
| --- | ---: | ---: | ---: |
| Exchange 9 / 3 / 3 | 20.4% | 32.8% | 26.9% |
| Exchange 9 / 3 / 4 | 7.1% | 15.2% | **15.4%** |
| Exchange 7 / 3 / 4 | 3.6% | 10.6% | 15.1% |
| Insert 9 / 3 / 3 | 7.9% | 10.5% | 18.4% |

**Recommendation:** don't use automatic refill explosions as a quick fix for boredom. They manufacture chains but can shift a significant fraction of points to hidden draws, contrary to the product's low-luck aspiration.

## Physical deck sanity check

140 four-player games per variant/stock size, eight turns/player, same seed set and strategies, safe refill:

| Variant | Complete with 108 cards | Complete with 120 cards | Complete with 144 cards |
| --- | ---: | ---: | ---: |
| Exchange 9 / 3 / 4 | 122/140 | 136/140 | **140/140** |
| Exchange 7 / 3 / 4 | 140/140 | 140/140 | **140/140** |
| Insert 9 / 3 / 3 | 133/140 | 139/140 | **140/140** |

A zero-failure sample is **NOT** proof of guaranteed stock adequacy. A retail game must specify deterministic stock-exhaustion behavior. For the four-color, 144-card test deck, that means 36 ordinary cards of each color before dealing. At Mini Euro dimensions (roughly 44×68 mm), a nine-card row plus small gaps occupies about 42 cm.

## Behavioral hypotheses for **real players**

Positive:
- Taking a row card into hand may make zero-score moves useful without a new scoring rule.
- Two exchanges can score the same number but leave the player with different future hands.
- A more experienced player might proactively change a row to deny the opponent.

Risks:
- With 3 colors / 9 row, "there's always a triple" destroys tension.
- A row shared by all players and an easily manipulable hand might devolve into repetitive pattern spotting.
- The opponent's hidden hand makes long-range planning noisy despite the apparent additional options.
- Slow physical refill and repeatedly sorting nine small cards could hurt flow.
- Four colors could reduce the distinct visual identity of SPARK or make it feel like generic set-collection.
- We have not assessed the suitability of the **SPARK** name or differentiated these rules from existing retail games.

## Real-world test sequence

1. **Play the offline prototype:** [playtest.html](playtest.html). Use the same seed to compare Insert vs Exchange. Support hot-seat human play. The HTML is self-contained and can be saved/opened without hosting. It is not the existing Sites website.
2. **First contrast:** Insert 9/3/3 vs Exchange 9/3/4. The four-color mode is the first candidate, not the 3-color "demo" which was too generous.
3. **Second contrast:** Exchange 9/3/4 vs Exchange 7/3/4. Evaluate if the longer row creates useful trade-offs or just search time.
4. Test 12+ independent groups, rotate mode order, and have participants teach the rules themselves. Record actual time per turn, optional immediate replay, spontaneous "I could have done ..." comments, specific next-turn plans, score pile counts, and preference without telling the group our theory.
5. Ask players what they **sacrificed** on each decision. If they can't explain a trade-off more often than in Insert, Exchange is not yet deeper.
6. If no candidate gives sustained replay interest after five games, stop tuning board size/color count and consider a new core interaction.

### Suggested go/no-go criterion (hypothesis, not industry norm)

Advance a version only if most independently recruited groups prefer it *after both versions*, can play without designer intervention, and show voluntary replay. Measured skill gaps and simulator tradeoffs can support that decision but **cannot substitute for human fun**. Do not pitch a mass-market launch from this evidence.

## Reproduce

```bash
node experiments/exchange/test.cjs
node experiments/exchange/simulate.cjs --games 140 --seed 752001 --players 3 --output
node experiments/exchange/simulate.cjs --games 140 --seed 752001 --players 3 --all-refills --output
```

Results: [7-arm seed snapshot](results/experiment-140x-3players-752001.csv), [full JSON](results/experiment-140x-3players-752001.json).

**Limitations:** Simulators include modeled heuristic bots, finite and potentially blocked stock, and specific refill procedures. No independent human playtesting, browser-on-device QA, manufacturing quote, trademark clearance or actual purchase intent has occurred.

## Deployment / compatibility

This branch is a standalone experiment only: `experiments/exchange/`. It does **not** import the production `dist/engine-v5.js` and modifies **no** production Worker, D1 schema, Sites asset, saved game or private online room. The standalone HTML supports bots and pass-and-play on one device, not hosted multiplayer. No deploy has been initiated.
