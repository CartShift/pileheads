# TILT ONE · Strategy and Rule-Economy Lab
**Evidence review:** 2026-11-11  
**Status:** experimental A/B, not a finished game, balanced retail product or proven human preference.

## Decision

The current ONE game is easy to learn and provides interesting shedding pressure, but the existing computer opponent incorrectly rewarded same-number clears and immediate extreme arrows. The central strategic opportunity is to **manage cards differently before and after the draw deck empties**.

**Do not add special powers or a second pile yet.** Keep the currently liked classic mode unchanged. Test a second version that keeps the exact SAME turn rules but gives players **four cards from a deliberately balanced 32-card CORE deck**. Test it head to head against regular 48 cards / three-card hands.

A more challenging bot is now selectable as **Strategic**. It sees only its own hand, the public pile top and the number of stock cards. It never reads the opponent's hidden hand or unrevealed stock order.

## Why this matters

In the classic 2-player game, ~42 of the 48 cards begin in the draw stock. Replenishing to three cards dominates play; the **post-stock endgame occupies only ~11–13% of simulated turns**. There are legal card choices on around 65% of turns, but legal alternatives are not automatically meaningful strategic choices.

The new Strategic heuristic works as follows:
- **While the draw stock remains:** use flexible arrows first, saving harder-to-follow cards for later.
- **After the stock is empty:** prefer cards that restrict the next player's legal numbers.
- Matching the top rank clears the pile but also gives the next player a free lead, so it is not always valuable.
- Flexibility after a card: UP 1 has 8 possible rank values that follow it; UP 8 has only one. DOWN 8 similarly has 8; DOWN 1 only one. This heuristic uses printed attributes and public information only.

This is deliberately a simple, interpretable policy. It is NOT guaranteed optimal play and must not be described as such.

## Rigorous comparisons

**Method:** Seeded, finite 48-card engine with card conservation checked after every turn. For policy head-to-head comparisons, each seed is played twice with policies in reversed seats. Bots see only legally available information. A draw at the 240-turn safety cap counts as a pacing failure, not a win. Comparisons of *different rulesets* share seed values but can have different deck permutations and trajectories, so do not interpret per-game differences as perfectly paired counterfactuals.

Two independent, disjoint held-out seed cohorts each supplied 600 seeds × 2 orientations = **1,200 matches per ruleset per cohort**, comparing Strategic against Random.

| Metric | Classic 48 / 3 hand | Balanced Quick 32 / 4 hand |
|---|---:|---:|
| Strategic wins vs Random, cohort A | 71.7% | **75.2%** |
| Strategic wins vs Random, cohort B | 71.3% | **74.4%** |
| Median turns | 64 | **38** |
| Post-stock share of turns | ~11.5–11.6% | **~24.3–24.4%** |
| Forced turns (one legal move) | ~34.4–34.8% | **~30.2%** |
| Two-player completions in these samples | 1,200 / 1,200 per cohort | 1,200 / 1,200 per cohort |

In an independent small runtime-verification cohort of 180 seeds (360 seat-rotated matches), Strategic vs Random recorded 73.6% in Classic and 77.8% in Quick. The same cohort found different-arrow alternatives on 45.8% of Classic turns versus 53.6% of Quick turns. These numbers are supportive but not a human-fun metric.

**One important control:** Simply setting 16 randomly chosen cards aside (leaving an imbalanced 32-card sample) produced Strategic wins of only ~71.0–71.7% against Random in independent held-out cohorts, close to Classic. The **purposefully balanced CORE** matters, not just the smaller stock.

### Mode definitions and physical deck

- **Classic:** all 48 cards, three copies of each (1–8, UP/DOWN) combination; deal 3.
- **Quick:** only the 32 cards marked CORE, exactly two of each (1–8, UP/DOWN) combination; deal 4; set 16 cards marked EXTRA aside.
- One physical 48-card custom deck supports both. CORE/EXTRA labels are on the faces, not the identical hidden backs.
- Quick is currently for **2 people only**. No new turn rule, power, score, second pile, extra component or subscription is required.

**Physical convenience:** Sort CORE/EXTRA once during setup, then shuffle only CORE for Quick. Do not randomly remove 16 cards if you want the distribution tested above.

## Experiments not recommended

These were exploratory simulation probes, not human trials. The corresponding mechanic changes were **not** merged into the main ONE engine.

| Hypothesis | Observed problem | Decision |
|---|---|---|
| Give a bonus turn after matching the pile number | Reduces the advantage of careful hand conservation in paired bot comparisons; can turn matches into obvious play priorities | Do not add yet |
| Choose a visible replacement card versus a blind draw | Adds a decision nearly every turn, but the tested simple information-aware draw policy had ~50% wins against always taking the blind draw | Not worth the extra tap yet |
| Take two or three pile cards when stuck | More dramatic penalty but ~4–5% of runs hit the 240-turn limit in a small bot sample; ~70–80-turn median instead of ~64 | Reject until pacing is solved |
| Optional match: clear pile versus keep a trap | Keeping the pile was so consistently powerful that it largely became the preferred move, not a balanced trade-off | Reject this implementation |
| Play a pair of matching numbers together | Playing pairs immediately often costs win probability compared with conserving cards; more combinations do not necessarily mean more strategy | Keep as unselected hypothesis |
| One-use arrow reversal | Tested heuristic gained only a few percentage points, not compelling relative to an extra marker and interaction | Do not add yet |
| More very restrictive cards | Raises forced turns and pickups but tends to reduce skill advantage and increase drag | Keep balanced distribution |

Values from quick rule probes are directional. Different custom heuristics and seed samples were used; do not rank unlike variants by one raw win rate. Reproduce the **selected** Classic/Quick and bot comparisons using the checked-in simulation programs.

## Structural risks to resolve before a product

### 1. Significant first-player advantage

Across simulations with the **same Strategic policy on both seats**, the first player sometimes won ~60–65% of 2-player matches in larger seed cohorts, including ~62.5% in one 800-match Classic sample. Quick fell closer to ~59.3% in that sample but **did not eliminate the problem**. One small runtime cohort showed an even higher Classic share; the value varies by cohort and policy. We must rotate first player in physical tests and consider an uncomplicated fair-start rule.

Do not treat a simulated asymmetric agent matchup as proof of turn-order fairness.

### 2. Pathological three-player cycles

With three identical highly restrictive bot policies, numerous matches hit the 240-turn cap. Example deterministic seed **20261182** repeatedly circulated extreme **8 UP** and **1 DOWN** cards while the stock was empty, without progress. Random-playing agents typically escaped these loops.

This shows that highly myopic "restrict the next player" behavior can create self-defeating cycles, especially for three players. It does not establish that actual human players will always stall, but it **does** block any claim that the current rules are proven reliable for 3–4 players. Do not simply raise the turn cap or conceal timeout draws. Resolve the incentive structure and test independent, strong, adaptive policies.

### 3. Unproven real-world experience

Simulations do not measure:
- Fun, humor, social pressure, emotional reversals or desire for a rematch
- How quickly first-time players understand arrows and matching
- Actual minutes per match and tolerable table duration
- Whether a player can explain the reason for the move they rejected
- Whether a short game ends too soon to feel satisfying

These are the decisive product criteria. There is no commercial manufacturing recommendation yet.

## Human A/B: recommended next test

Use the same physical printed 48-card deck, sorting CORE/EXTRA before Quick.

- Start with 6–12 independent groups of two people, preferably unfamiliar with the prototypes; each group plays both Classic and Quick, half in each order.
- Randomize or alternate the first player. A/B game order should not be confounded with the first-to-play seat.
- Record **real match minutes**, rule interventions, dangerous/clever turns, forced pickups, surprises, and the entire last third.
- Ask each player separately: **"If we play one more round right now, which version do you choose?"** Actual spontaneous rematches are more informative than a polite rating.
- Ask: **"What move did you seriously consider and reject, and why?"** If most players cannot answer, extra legal options are not meaningful agency.
- Kill the Quick hypothesis if it becomes too predictable, if matches end before tension develops, or if it does not outperform Classic for repeat play.

The primary success criteria are **understanding, voluntary rematch, meaningful choices and a satisfying final third**. A higher bot advantage or shorter simulation cannot replace those observations.

## Reproduce and modify

From the repository root:

    npm run test:one
    npm run simulate:one-strategy
    npm run simulate:one-quick

For shorter samples:

    node experiments/one/strategy-simulate.cjs --seeds 200 --seed 20261111
    node experiments/one/quick-simulate.cjs --seeds 200 --seed 20261111

Inspectable output includes seed count, policy matchups, 2–4-player symmetry for Classic, two-player fairness for Quick, turn quantiles, endgame proportions, and completion/draw rates. Do not modify the core release or production deployment until actual playtests establish a preferred mode.

## Current scope and guardrails

- **Changed:** optional fair-information Strategic bot, classic/quick experimental mode selection, separate local saves, physical CORE/EXTRA card labels, reproducible tests and simulations.
- **Unchanged:** number+arrow semantics, matching clears, one-card pickup on failure, per-turn action, custom original 48-card deck, game win condition.
- **Not approved:** changing the production SPARK site, replacing the currently liked Classic rules, manufacturing inventory, or claiming gameplay is solved.
