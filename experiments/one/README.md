# TILT ONE: simpler, one-tap, physical-first prototype

**Status: isolated experimental card-game concept. Not production-ready. Not a released product, brand, or ruleset.** This folder was created because the earlier CROSS and FORGE prototypes were consistently perceived as **confusing, complicated and unfriendly**.

## User feedback is our design constraint

> "שני המשחקים מבלבלים ונראים מסובכים ולא ידידותיים"

We should not try to salvage two attributes per card or two simultaneous game rules just because the code exists. The new player must be able to look at the screen and play their first card in seconds, without a rulebook.

### The one-screen answer

- **One shared pile**
- **One large number (1–8) and one large arrow (↑ or ↓) on each card**
- **One tap plays any legal card; illegal cards are visibly dimmed**
- **The top card sets the next rule:** ↑ means the next card must be the same number or higher, ↓ means the same number or lower.
- **Same number clears the entire pile**, no extra turn.
- **No legal card?** Take exactly the top card, discard the rest of the pile, continue play.
- Deal **three cards** to each player. After a play, refill to three while the 48-card draw deck lasts. Once the stock is empty, the first to shed all hand cards wins.

There is no score to calculate, no second number, no separate action menu, no forced other pile, no prepared-card inventory, no five special-card abilities, and no quiz before playing.

We preserve the emotional kernel of Shithead: shedding cards, controlling what the next player can do, relief when the pile clears, and nervousness when no card fits.

### Why the deck is original in the prototype

48 physical cards: each number 1–8 appears three times with an UP arrow and three times with a DOWN arrow. Every card carries a number AND a direction, designed and balanced as a single object. This isn't a standard 52-card deck or a 2–A four-suit reskin.

**Important commercial caveat:** The number+direction mechanism might still resemble existing commercial climbing/shedding games. A nonstandard deck is a product-format goal, NOT proof of originality. We must evaluate similar games and refine the central experience before calling it distinctive enough to manufacture.

The name TILT ONE is a working internal label; trademark clearance has not happened.

## Verified browser preview

- **Play TILT ONE:** https://spark-exchange-38a2lb4k0-cart-shift.vercel.app/?new=1
- **Print the 48-card deck:** https://spark-exchange-38a2lb4k0-cart-shift.vercel.app/print.html

Vercel clean preview `dpl_AYdy9eyuiMyV5DRMKGLZoQaZ5yKU` reached **READY** with `target: null` (non-production). HTML, engine, app and print pack returned HTTP 200. A separate temporary Node validation preview confirmed the rules-engine suite, **23 UI-stub assertions** and the print generator passed. The clean preview does not include any temporary verification endpoint.

**Still unverified:** actual mobile-browser touch interaction and rendered screenshot QA, card-print alignment, and first-time human comprehension. These cannot be inferred from HTTP and stub test success.

## Latest playable first-person preview

- **Play the first-person table:** https://spark-exchange-9ddvy0dey-cart-shift.vercel.app/
- **Print the original 48-card deck:** https://spark-exchange-9ddvy0dey-cart-shift.vercel.app/print.html

Clean Vercel preview `dpl_57dhSTXrECEy5rc46Rz4r25ctRLw` is **READY** with no production target. HTTP 200 verified for the game HTML, application JS, unchanged engine JS, and printable cards. The preview contains no temporary QA endpoints.

Isolated Node validation preview `dpl_FzpcCo9sHxnMTAQ3AHCgpR4eXE2d` verified the **engine suite**, original **23 UI checks**, expanded **36 first-person tabletop checks**, and print-deck tests. Verified touch-pointer capture, cancel-to-abort, reduced-motion bypass, opt-in audio state, large opponent-hand compactness, opponent hand privacy, and automatic bot continuation through DOM-stub tests.

**Unverified:** real Android touch and audio on the user's device, actual rendered screenshot consistency at 360 / 768 / 1440px, and real-player subjective experience. Automated DOM stubs are not a replacement for manual device testing.

## First-person tabletop simulator enhancement

The positive first human feedback was for ONE's **simple rules**. This update keeps the engine and physical deck *unchanged* and makes the browser simulator look and behave more like sitting at a table:

- **Opposite seat:** opponent's cards shown as identical face-down backs; private IDs/values are never exposed by the DOM or ARIA labels.
- **Near seat:** your own real hand stays at the bottom and remains visible while the bot chooses (disabled during their turn). In two-player hotseat, a full-screen handoff curtain hides the next player's hand until ready.
- **Physical table:** felt surface with a wooden border, visible stock and discard stacks, a readable shared pile in the center and the current comparison rule directly on the table.
- **Play a card:** one tap still plays instantly. Pointer drag-and-drop onto the central pile is optional, with capture to support long touch drags from the lower hand. Dropping outside cancels.
- **Motion:** the played card travels from the hand to the pile or discard; pickups travel toward the hand, and opponent turns animate from the far seat. Reduced-motion preference disables movement.
- **Optional sound:** soft synthesized card taps, OFF by default, only enabled from the settings. No external samples or network calls.
- **Real deck:** rank and arrow have the same look and information semantics as the printable physical cards.
- **Save contract:** existing localStorage key and serialized engine state are preserved, with an optional backward-compatible sound setting.

There are no new rules, no extra turns, no card mechanics, no network services and no new progression concepts. Keep first-person enhancements subordinate to the next playable action.

**QA:** engine invariants, original UI suite, new first-person tabletop DOM-stub integration tests and exact print-deck counts. Automated DOM checks are *not* a substitute for inspecting the site on Android or in real browser screenshots. When shipping a clean Vercel preview, never include temporary verification endpoints in that user-facing deployment.

## Play and physical proof

- Browser: index.html, app.js, engine.js (all static, no runtime network requirement).
- Pass-and-play: one phone can be handed between two people, with private hands covered between turns.
- Bot: Basic, Thoughtful and Random. The Thoughtful policy is **not** an expert; in early pairings, it actually lost more frequently than Basic.
- Save and replay: stored in an independent localStorage key; the original SPARK/CROSS/FORGE save state is not altered.
- Paper: [print.html](print.html) prints 48 custom card faces across six A4 sheets, plus one rules page. Use 100% scale and identical opaque sleeves.
- Export: JSON game transcript for inspection.

## What was cut from CROSS and FORGE

| Earlier friction | ONE simplification |
|---|---|
| CREST and SHADE values | One large number |
| Two piles, each with a different comparison | One pile, one visible rule |
| LINK and simultaneous strategic restrictions | One arrow, controlling the next player |
| Preparing a visible card, then releasing later | Tap a legal card and immediately play |
| Two separately explained games | One focused prototype |
| Multi-step selection UI | Bright cards are playable directly; the only alternate action appears when stuck |

The goal is not to make the game less strategic on purpose. It is to discover whether meaningful timing and opponent pressure can come from a **small rule set**. If it cannot, add *one evidence-backed rule at a time* or abandon the candidate.

## Preliminary simulation results

250 seeds with reversed seat order, **500 complete two-player matches**, Thoughtful versus Basic policy:

| Diagnostic | Result |
|---|---:|
| Completed before 240-turn limit | 500/500 |
| Median / 90th percentile | 66 / 75 turns |
| Longest match | 90 turns |
| First-seat win share | 55.0% |
| Thoughtful heuristic win share vs Basic | 41.0% |
| Turns with at least two legal moves | 65.3% |
| Turns with different-arrow alternatives | 45.0% |
| Average pickup actions per match | 10.3 |
| Average same-number clears per match | 12.3 |

The weak performance of our Thoughtful heuristic is a warning: **the engine still has not demonstrated strategic depth**. Having multiple legal cards is not the same as having meaningful decisions. Also, these are simulations, not actual human turns or minutes.

## Verification and scope

Run from the repository root:

    node experiments/one/test.cjs
    node experiments/one/ui-test.cjs
    node experiments/one/print-test.cjs
    node experiments/one/simulate.cjs --pairs 250

Do not enable expensive CI for quick iteration. A pure Node validation endpoint can run these in an isolated Vercel preview.

**Do not merge this into the user's existing SPARK Simple+ website, overwrite any release, alter saved rooms, or place production orders.** Preserve prior experiments for comparison; they are not evidence this new concept is worse or better without human tests.

## Human validation gate

This prototype should be discarded or rethought if a first-time player cannot make their initial move without verbal help; if they cannot describe why one arrow was better than another; or if the last third feels like waiting for the deck to finish.

A fast reality test:
1. Give someone the phone, say only "tap a bright card."
2. Observe whether they understand the top number and arrow by the second move.
3. Ask what they hoped would happen to the next player when they selected an arrow.
4. Watch their final third: actual traps or autopilot?
5. Offer a voluntary rematch, not a leading "did you like it?"
6. Compare the next-game choice against **their actual Shithead variant** (2, 3, 7, 8, 10 specials).

Only after independent replay demand do we revisit the direct-to-consumer retail deck, artwork, packaging and own-store economics.
