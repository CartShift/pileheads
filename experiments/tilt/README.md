# TILT Mechanics Lab: original-deck card game experiments

**Status:** two isolated **alpha** candidates inspired by the emotional tension of Shithead, with an original, purpose-designed deck. Neither is retail-ready or approved to merge into SPARK Simple+. The original game, multiplayer rooms and existing saves are untouched.

These are the **next mechanics tests** following [the TILT retail product brief](../../design/tilt/PRODUCT_BRIEF.md), which confirms the owner's Shithead baseline: 2 reset, 3 transparent, 7 next card lower than 7, 8 skip, 10 burn + bonus turn. Those powers are NOT copied one-to-one into the new games.

## The game and the product must be the same thing

Both candidates use the exact same **48-card physical prototype deck**:
- CREST ↑: first value, 1–8, each occurs on 6 cards.
- SHADE ↓: second *independent* value, 1–8, each occurs on 6 cards.
- 12 cards marked LINK ↔, which influences CROSS.
- Identical opaque backs; nonstandard paired-value fronts, no four standard suits, 2–A ranks, or regular-card deck substitute.

If neither concept wins real human testing, the physical card distribution is **not** a sunk cost; it can be redesigned rather than forcing a weak rule to fit an arbitrary 48-card constraint.

### Candidate CROSS: two linked piles

SUN accepts an incoming **CREST** ≥ its top SHADE; MOON accepts an incoming **SHADE** ≤ its top CREST. A LINK card played on either forces the next player to the opposite pile. If stuck, take an eligible pile. A pile of three cards shatters to ashes, reducing repeated giant pickups. The objective is to be first to empty your hand after the stock runs out.

**Differentiation challenge:** two rising/falling piles alone already exist in games such as *The Game*. The independent value pairs and LINK decisions must demonstrate a distinctive player experience, not just more arithmetic. The Game is primarily cooperative; CROSS is competitive, but that fact alone does not prove a new gameplay category.

### Candidate FORGE: one pile, one prepared escape

Normal STRIKE compares an incoming CREST ≥ the current top SHADE. A player may spend a turn PREPARING one visible card in a private *ownership* slot (the face is public) instead of immediately playing it. Later they may RELEASE the prepared card if its SHADE reaches the top SHADE minus three. When stuck, CRACK: take the top card into hand, and discard the rest of the pile. An automatically six-card pile also clears to ashes. The win condition requires empty hand, empty prepared slot and depleted stock.

**Differentiation challenge:** preparing a rescue cannot simply become an obvious routine or a disguised 10-card burn. We deliberately tested unconditional release and rejected it because it eliminated nearly all punishment.

## Verified isolated previews

- **Play CROSS:** https://spark-exchange-1rwfnfme2-cart-shift.vercel.app/?concept=cross&new=1
- **Play FORGE:** https://spark-exchange-1rwfnfme2-cart-shift.vercel.app/?concept=forge&new=1
- **Print the original 48-card deck:** https://spark-exchange-1rwfnfme2-cart-shift.vercel.app/print.html

Deployment `dpl_jnfKY7vqdkBXYmzboGRHBkjUNZqf` reached **READY** with an unset production target. Both game query routes, JS assets, print pack, rules and playtest documents returned HTTP 200. The clean preview has **no temporary verification API** and did not alter the original SPARK site or production alias. Browser-on-Android interaction and real paper print alignment remain unverified.

## How to play

- Mobile web playtest: static files in this directory (index.html, app.js, engine.js).
- Switch between CROSS and FORGE tabs. Each has its own independent browser save.
- Choose a card, then choose a legal action. Supports a bot, private-handed 2-player hotseat, new seed and JSON export.
- Printable physical decks: [print.html](print.html). Six A4 sheets of cards (six copies of each CREST value 1–8), plus a one-page rules reference. Print at 100% and use same-backed sleeves.
- Full paper rules and edge cases: [RULES.md](RULES.md).
- Human vs reference-game test procedure: [PLAYTEST.md](PLAYTEST.md).

There are **no server-side runtime dependencies**. The HTML and JS can be served statically. Browser/local UI storage is not cloud synced.

## Focused validation (no expensive CI required per iteration)

    npm run test:tilt
    npm run simulate:tilt

The focused tests cover:
- Entire proprietary deck distribution and IDs
- 2-, 3- and 4-player hand/card conservation
- CROSS legal targets, LINK forced target, pile shatter
- FORGE preparing and releasing public rescue, crack pickup
- Illegal action rejection, seeded repeatability, hidden enemy-hand isolation
- 150 seeded complete simulations (some may end at the safety cap, correctly classified as draws)
- DOM-stub interface tests: choose/act, bot continuation, mode isolation, private hotseat, reloading
- A4 print deck count, six sheets, 12 LINK cards, printed reference

A temporary Vercel Node validation runner passed engine tests, the DOM-stub UI suite (33 checks) and print-generator checks on 2026-11-11. This verifies **programmatic behavior**, not actual Android touch input, actual physical printing or first-time rule comprehension.

## Initial paired heuristic results (not market or skill validation)

220 seeds in both seat orders per concept, 440 matches per concept:

| Diagnostic | CROSS | FORGE |
|---|---:|---:|
| Completed within 320-turn safety limit | 436 / 440 | 440 / 440 |
| Median / P90 turns | 69 / 92 | 69 / 90 |
| Planner vs greedy heuristic, win share | 42.3% | 33.0% |
| First-player share (draws counted half) | 51.1% | 48.4% |
| Average pickup actions | 12.4 | 10.5 |
| Average pile clears | 14.0 | 11.8 |
| Average preparations/releases | n/a | 7.1 / 6.3 |

**Caution:** the handmade "planner" bot is *weaker* than greedy in these head-to-head runs, so it is absolutely **not** evidence that strategic players have an advantage. The data can't distinguish poor bot strategy from a shallow game. CROSS still shows a small percentage of extremely long matches and must improve before considered viable. Human games might end much earlier or later.

**Additional exploratory decision-density scan:** across 150 bot matches per concept, CROSS offered a choice of two playable piles on ~34.8% of turns; LINK constrained the target on ~20.2% of turns. FORGE offered both strike and prepare on ~23% of turns, and a choice between strike and release on ~39.3%. Pickup actions still occupied ~19% of the final ten turns in both. Legal alternatives are **not evidence** that alternatives are strategically distinct or engaging.

We have not observed any real person play the games or verified that they're fun.

## Commercial guardrails

The eventual product is a **single original illustrated physical card deck**, sold primarily in **our own online store** with a branded box and physical-first rulebook. The 48-card paper mockup is a functional prototype, not print-ready retail artwork or final deck count.

Before manufacturing: independent blind tests against the actual preferred Shithead house variant; strong repeat-play evidence; originality checks; trademark/name clearance; EU/Germany consumer/product compliance and real manufacturer/fulfillment quotes. Only after a tested concept wins do we invest in art or store implementation.

**Production separation:** do not merge CROSS or FORGE into the deployed SPARK Simple+ game, replace its URL, or mutate its room/save format. These experiments belong in the same repository in their own folder, and ship only through isolated Vercel preview URLs.
