# SPARK physical tabletop prototype: rulebook hypotheses v0.1

**Status:** proposed *playtest* components and rule wording, NOT a finalized consumer rulebook. Keep the current Sites rules stable while testing this separately.

## Physical target

- Audience hypothesis: players 12+ and mixed-language groups; **age claim is provisional and requires compliance assessment**.
- 2–4 players; 10–20 minute goal; nine-card shared row; three colors with shape symbols (accessible without color alone); three hand cards.
- Cards: **Mini Euro approximately 44 × 68 mm**. Nine cards plus eight 2–3 mm gaps take about 412–420 mm; verify table ergonomics with sleeves and human hands.
- Prototype sizes to quote and test: 120, 132, 144 normal colored cards. Do not assume 360 production cards.
- Special-use markers: **one Wild-use marker and one Swap-use marker per player**. Prototype should test whether a rotated Wild card or a colored token can unambiguously indicate the chosen color when physically on the row.
- Printed quick rules, scoring pads or collected-card piles; no app, no numerical score arithmetic beyond counting removed colored cards.

## Provisional rules: normal move

1. Start with nine face-up cards in a straight line. Shuffle the remaining finite deck and deal each player three cards.
2. On your turn, choose **one** card from your hand and insert it at any of the ten gaps around/between the nine row cards. Others shift in order.
3. Find contiguous runs of **three or more** of the same symbol. Remove all qualifying disjoint runs simultaneously, take the removed colored cards as points, and close the gaps.
4. If collapse creates another qualifying run, resolve it, continuing until no run remains. The active player collects all cards removed by that move.
5. If the row is longer than nine **and no match was removed**, use the current tested baseline: discard the rightmost overflow card face up. A choose-left-or-right variant is a separate experiment.
6. Refill the shared row to nine from a finite shuffled deck; draw one replacement hand card when the turn consumed a regular hand card. Complete eight full rounds (all players act eight times).

**Important:** step 6 is not yet a production-ready rule. The current engine silently searches within the deck for a safe fill. A tabletop implementation must pick and test one of these alternatives:

- R1: **Top-card rejection**. Reveal the top card and, if placing it at the right would create a free triple, put it in a face-up rejected-discard pile and try the next top card. Define an exact bounded fallback if no valid color remains.
- R2: **Unrestricted refill**. Always reveal the top card; no rejection. Specify whether automatically resulting triples score, do not score, or wait for the next player; explicitly study fairness and chain frequency.
- R3: **Deterministic neutral divider/reset** if no legal top-card refill exists. This adds a physical component and thus should be disfavored unless R1/R2 fail.

Never ship a rule that says "look ahead in the deck until a valid card is found" while treating the deck as hidden. **Deck shortage, reshuffle, exhaustion, and rejected-discard handling are release blockers.**

## Special markers

- **SWAP**: once per game, exchange two adjacent row cards **before** placing your normal hand card. Then resolve combos after both operations. This does **not** consume the normal placement.
- **WILD**: once per game, substitute a colored Wild placement for the normal hand-card placement; choose the color *when placing*. Does **not** grant another placement. Must be represented physically and returned/discarded correctly after a match. Cannot combine with Swap in the same turn in current engine v0.5.
- Test whether the hand is refilled after Wild; current software does *not* consume/replenish the hand. The rulebook and visual components must match the chosen behavior.

## AABB add-on experiment (not baseline)

Additional match type: four contiguous cards `A A B B` where A ≠ B. The four cards count as one match. Example: 🟣🟣🟠🟠. Count removed colored cards as points.

**Unresolved priority cases that must be decided before coding or testing as retail rules:**
- In a row containing a triple and overlapping AABB pattern, whether triples resolve first, all non-overlapping matches resolve simultaneously, or one pattern has priority.
- Whether `AABB` can be part of a longer 5+ run or has to be exactly two-and-two.
- Whether all 4 cards are always collected for 4 points.
- Whether AABB formed during collapse triggers another wave immediately.
- Whether AABB matches can form during refill; specify behavior consistent with R1/R2.

Recommendation for the **first deterministic experimental engine**: triple priority first; if no triple, scan left-to-right for non-overlapping AABB windows; remove those windows simultaneously; collapse; repeat. Display each wave in replay. Record this as `physical-experiment-aabb-v1`, not as live A/B/C v0.5.

This ordering **may not match** the independent research model, so its numerical results need re-simulation after implementation.

## Non-scoring turn design

The goal is for a no-score move to matter without guaranteeing a scoring move next turn. Candidate `edge-choice`: after insertion with no match and 10 cards, choose whether to discard the leftmost or rightmost card. Compare to forced-right discard as an **isolated** experiment. Measure added seconds per turn and tactical choices, not just score.

## What counts as a playable physical prototype

- Can be played with face-down ordinary shuffled stock; no peeking into deck order.
- After each complete turn the row contains exactly nine cards.
- Physical markers clearly identify spent abilities and Wild's chosen color.
- Match priority and chains are unambiguous across multiple simultaneous runs.
- No more than 30 seconds of card administration outside player deliberation in an ordinary turn (provisional goal).
- No infinite refill loop or game that cannot finish with the physical stock in the box.
- A complete rulebook works without the designer present.
