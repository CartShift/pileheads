# TILT LAB: Comparative physical playtest plan

## Primary decision

Which mechanic, if either, makes people prefer an **original proprietary-deck shedding game** over the Shithead house variant they already love?

The competitors are:
- **CROSS:** two linked dangers, paired-value threshold decisions, forced-opposite LINK symbol.
- **FORGE:** one danger pile, one prepared rescue slot and a delayed alternate-value release.
- **Reference:** actual Shithead house variant with confirmed 2 reset, 3 transparent, 7 requires a lower card next, 8 skip, 10 burn + extra turn. Minor interaction/stacking exceptions can be documented by the experienced test group.

Use the exact same 48-card physical deck for both experimental games, but **do not** describe either as just Shithead with a new card face.

## Stage 0: software sanity

- All 48 cards conserved across hands, prepared slot, draw stock, both piles and ashes.
- Exactly 6 copies each of CREST 1–8 and SHADE 1–8 and 12 LINK symbols.
- No illegal move accepted, no unannounced information shared between players.
- FULL MATCH sampling for 2, 3 and 4 players using seeded bots, with special attention to stuck or high-turn games.
- Automated DOM-stub validation of both play modes, replay, saved state, hotseat hand privacy, and rules printing.
- Do not call a 320-turn limit a win. **Every turn-limit draw is a failed pacing test.**

Current paired-bot diagnostics were produced on 2026-11-11 with 220 seeds and both player orders (440 matches per concept):

| Metric | CROSS | FORGE |
|---|---:|---:|
| Completed / games | 436 / 440 | 440 / 440 |
| Median turns | 69 | 69 |
| 90th-percentile turns | 92 | 90 |
| Planner heuristic vs greedy, win share | 42.3% | 33.0% |
| First-player win share (draws counted half) | 51.1% | 48.4% |
| Average pickups / match | 12.4 | 10.5 |
| Average pile cracks / match | 14.0 | 11.8 |
| Average prepared actions / match | n/a | 7.1 |
| Average releases / match | n/a | 6.3 |

**Important:** This does not demonstrate strategic depth. The "planner" algorithm is a handmade, relatively weak heuristic and lost more often than an immediately-greedy policy. The finding could indicate bot weakness or a design failure. We need controlled human behavior and stronger balanced policies before drawing conclusions.

## Stage 1: creator first-person experience

Play each prototype **three times**, with the bot, then play **two hotseat matches** with real people, on the same phone if needed. Write a note *immediately after each match* without changing rules mid-session:

- Could the other player understand the first move without the designer explaining it?
- Did a LINK constrain an opponent in a memorable way, or was it irrelevant?
- Was preparing a rescue an inspired plan, or the only obvious move?
- Did taking cards feel unfair, satisfying, humiliating, or simply slow?
- Would you voluntarily restart immediately? What decision would you change?

## Stage 2: small physical tests

Print the 48-card deck at actual size, sleeve with opaque backs, and try **six complete matches of each candidate** with familiar players. Compare also against the existing Shithead house version in an independent session.

Keep timing in actual minutes. A simulated turn count is NOT a play-time estimate. Verify handling of pile shatter, personal prepared slots, forced targets, visible numbers and the hand refill rule without an app.

## Stage 3: blind comparative tests

Target at least **12 independent two-person groups** unfamiliar with the new game's design. Randomize presentation order (half CROSS first, half FORGE first). After the initial two rounds, require them to play without help. Rotate who starts.

For each group, privately record:
- Time to first legal independent move and number of rule interruptions
- Exact number of rounds and actual total minutes
- How many times players had at least **two choices with different consequences**
- At least one consequential action they *rejected* and why
- Voluntary rematch, not a polite 1–5 satisfaction answer alone
- First-player advantage, any repeating score/pickup loop, understandable card symbols
- Comparison to Shithead: **which would they willingly pick for their next game?**
- Qualitative emotional peak in the last third: win, comeback, panic or boredom

The 12 groups are an exploratory sample, not a statistically precise estimate of the broader population.

## Proposed stop/go criteria (internal, not external benchmarks)

- **Teaching:** ≥80% of testers play their first move without intervention after a two-minute written explanation.
- **Replay:** roughly two-thirds of groups voluntarily choose another game of the winning concept.
- **Agency:** most players can name a real sacrifice and a plausible opponent response.
- **Pacing:** the last third should retain decisions; no repeated pickup loops and no unresolved 320-turn simulations.
- **Identity:** at least a meaningful share choose our concept over the familiar reference, not merely because it is new.
- **Physical design:** the unique card attributes must be legible and necessary to the game. The first retail artwork must not look like a standard 52-card deck.
- **Differentiation:** professionally review overlap with existing pile/climbing games. CROSS uses two piles reminiscent of The Game; unique double values and LINK are *hypotheses*, not proof of originality.

Kill or radically rethink a concept after two evidence-backed iterations if it still fails teaching, replay and agency. Do not keep stacking new special-card powers to save it.

## Final product gate (after one human-tested winner)

- One exact written ruleset, stable deck distribution and verified 2–4-player configuration
- Multiple designer-free blind tests
- Original brand, illustrations and trademark/originality checks
- Print-safe art and print proofs, actual packaging options and manufacturing quotes
- Direct-to-consumer online-store unit economics: ex-VAT selling price, landed unit cost, picking/packing/shipping, processing, returns, ads/acquisition cost and contribution margin
- Appropriate Germany/EU product compliance, consumer rights and packaging/WEEE checks as applicable (do not assume WEEE applies to plain cards)
- No inventory production, paid ads or Shopify live sales before the gameplay and cost gates

## Manual result note template

    Date, group ID:
    Concept and version:
    Players, start seat, seed:
    Time to teach / first move:
    Minutes / turns / winner:
    Exact moment of clever choice:
    Exact moment of frustration:
    What rule was forgotten:
    Would either person play again right now?:
    Preferred next game: Shithead / CROSS / FORGE / none
    Changes proposed (one at a time):
