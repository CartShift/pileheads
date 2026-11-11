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
