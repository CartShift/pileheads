# TILT ZIGZAG · a new core mechanic, not another match format

**Status:** experimental custom-deck game, deliberately isolated from the existing ONE and released SPARK versions. This is a playtest candidate, not a commercial-ready game or a claim of originality.

## The product-design problem

The player liked the low-friction number-and-arrow rule but rightly rejected the previous response of adding best-of-three: a tournament format does not make a single turn more strategic.

ONE was often "choose which legally playable card to shed." A better core must generate **meaningful optional actions while staying teachable in under a minute**. Adding layers of badges, modes or powers is not the answer.

## New mechanic: one card, or a deliberate two-card Zigzag

- Two players, **32 balanced CORE cards**, 4 in hand; 16 EXTRA physical cards from the 48-card custom pack set aside.
- Every card has one number (1–8) and one arrow (UP/DOWN).
- First play: obey the top pile arrow. ↑ means same number or higher; ↓ means same number or lower.
- **Optional second card in the SAME turn**: it must obey the first card's arrow **AND point the opposite direction**. Maximum two cards per turn.
- You may stop after one, even when you could legally play a second. That decision may leave your opponent a harder rule.
- **Same number** as the card directly beneath clears the entire pile and **immediately ends the turn**, whether first or second card.
- After successful play, refill to 4 while the stock lasts. If no first card is playable, take the pile's top card, clear everything beneath, and end your turn. When stock is empty, first to play their last card wins.

### First-person turn example

The current top card is **6 ↓**. You play **4 ↑**.

At this point you have a *choice*:

1. **Stop**. Leave 4 ↑ for the opponent, forcing same or higher.
2. **Continue** with **7 ↓** (which follows 4 ↑ and reverses the arrow). You shed another card, but the opponent now faces 7 ↓, a much more permissive rule.

A *single* extra rule now makes "play more cards" versus "set a harder trap" a recurring strategic dilemma. The UI does not require an extra step when no second card is available.

## Explored and rejected mechanics

We actually mutated the engine in separate temporary simulations, keeping the previous rules untouched:

- "Take the top card and swap it for your matching card": rewarded tactical timing against a weak opponent but, when both policies exploited it, hundreds of matches hit the safety cap. **Reject.**
- One-use arrow reversal as a paid token: provided an advantage mainly by exploiting bots that did not spend their tokens correctly. Its value was inconsistent and raised some first-seat biases. **Do not add yet.**
- A reserved public final card: one setup policy ("save a restrictive card") tended to dominate in simple bot tests; limited evidence of subtle choices. **Unselected.**
- Unlimited sequences: playing the longest sequence became an overwhelming heuristic; hands emptied in ~14 turns for four-card chains, leaving less room for tension. **Reject.**
- Two-card chains with no arrow alternation: combos were available on ~60–70% of turns and the longest-chain heuristic was often superior; less meaningful stop/continue tension. **Reject this version.**
- **Two-card chain with mandatory arrow alternation:** combos are available on roughly 30–35% of turns and the tested "strategic" bot outperforms a purely longest-chain bot. **Selected only for human playtesting.**

## Repeatable metrics

Two disjoint held-out cohorts, **850 seeds each**, played twice with policies exchanging seats (1,700 matches per comparison/cohort).

| Metric | Cohort A | Cohort B |
|---|---:|---:|
| Strategic Zigzag policy win share vs Greedy-longest | **64.6%** | **63.2%** |
| Strategic Zigzag win share vs Random | 66.3% | 65.5% |
| Draws at 240-turn limit in those comparisons | 0 | 0 |
| Median Zigzag turns vs Greedy-longest | 29 | 29 |
| Zigzag opportunity on all turns vs Greedy-longest | 32.7% | 32.6% |
| First-seat win share (symmetric Strategic policy, separate 900-game cohorts) | 49.1% | 47.4% |

In one additional 250-game identical-seed validation cohort, the original 32-card ONE with its Strategic bot had about **60.4% first-seat wins**, whereas the Zigzag version with its Strategic bot had **48.0%**. Different rules produce different game histories, so these are descriptive comparisons, not controlled human fairness experiments.

A separate 3,600-game sanity sweep using multiple policies finished **3,600/3,600** matches, with no forced safety draw and exact 48-card conservation including 16 EXTRA cards set aside.

### A genuine consequence is not automatically an informed choice

A deterministic counterfactual test at 901 possible two-card decisions compared two games with **the same entire hidden deck**: stopping after the first card versus adding the second, followed by the same deterministic opponent policies.

- **43.1%** of these stop/continue choices changed who eventually won.
- In **22.4%**, stopping won when continuing did not.
- In **20.6%**, continuing won when stopping did not.

**Crucial qualification:** Players normally cannot know the opponent's full hand or the draw-stock order. We repeated the analysis by resampling unseen hands/stock in 40 physically consistent possible worlds per state. For 90 early-game decision states, average absolute difference in expected win rate between stopping and continuing was only **9.4 percentage points**, and only ~8.9% of states showed a 20+ point gap. For 90 later states with four or fewer stock cards, mean gap rose to **21 points** and ~34.4% of states had a 20+ point gap.

**Interpretation:** the stop/continue choice has a real causal effect under an exact game state, but *early strategic predictability remains limited*. This candidate has promising late-game tactics and a better first-seat sample, but it is not "solved" or fully skill-driven. This report intentionally does not call the 43% number proof of strategic mastery.

### Prior-art and commercial caution

- [The Game: Quick & Easy](https://www.nsv.de/wp-content/uploads/2024/04/TheGame_QE_GB.pdf) allows playing one or two cards in ascending/descending stacks.
- [Up or Down?](https://boardgamegeek.com/boardgame/428058/up-or-down) also uses ascending/descending number sequences, with different set-building mechanics.
- [Shithead](https://sites.google.com/sheffield.ac.uk/cardgamingsociety/games/shithead) is the familiar shedding reference with a staged final hand.

These are **related mechanics, not a conclusion of infringement**. Nothing here establishes that an arrow-alternating two-card run is legally protectable, distinctive enough to sell, or free from unlocated precedents. Before brand/art/manufacture, do broad comparable-game research and appropriate professional IP review. The custom 48-card deck format is only one aspect of differentiation.

## The actual playable product test

Standalone first-person table:
- **Tap a playable card.**
- If no opposite-arrow second card is possible, the play commits immediately and the opponent takes their turn.
- Otherwise the first card is shown on the pile *as a preview*. You can tap an allowed second card, **end the turn with one card**, or choose a different first card.
- The game state changes only when the turn commits. Reloading during an uncommitted preview restores the previously saved real turn.
- Greedy and Single-card-only bots are included to expose whether players can exploit their predictable approaches. Strategic uses only its own hand, public pile and stock count.
- Same first-person felt, face-down opponent cards, touch/click and hotseat handoff.
- Separate local save key \`tilt-zigzag-core-v01\`; production SPARK and older ONE saves are not touched.
- Printable A4 deck includes the original 48-card custom pack labeled CORE/EXTRA, plus a one-page Zigzag-specific rule sheet.

### What must be learned from independent humans

Test at least 12 independent two-player groups, showing first **the original ONE** and then **Zigzag**, counterbalancing order and first-player seats. Record these observable results:

1. Can a new player explain "opposite-arrow second card" after watching a single turn, with no coaching?
2. When offered a Zigzag, does the player **sometimes stop voluntarily**, and can they say why?
3. Does the second-card option trigger satisfying "I made that happen!" moments or only make play slower?
4. Does the last third remain tense after the deck is gone?
5. Is the actual match duration pleasant in minutes, not just bot turns?
6. Which game does the player **choose to replay**: original ONE, Zigzag, familiar Shithead, or none?
7. How does the true first-player advantage look when humans choose their own strategies?

A clear kill criterion: if people nearly always play the second card just because it is available, or cannot explain why stopping can be smart, this mechanism may still be only extra complexity. Don't rescue it with special numbered cards or best-of-three series.

## Reproduction

From the repository root:

    npm run test:zigzag
    npm run simulate:zigzag

Standalone examples:

    node experiments/zigzag/test.cjs
    node experiments/zigzag/ui-test.cjs
    node experiments/zigzag/print-test.cjs
    node experiments/zigzag/simulate.cjs --seeds 1000 --seed 20261111

## Release boundary

Experiment branch only. No production deployment, store integration, trademark application, bulk print order, or changes to older SPARK/ONE URLs. Real mobile touch and rendered screenshot QA are **not** verified by DOM stubs and automated HTTP checks.
