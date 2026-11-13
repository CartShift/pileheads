# PILEHEAD — Physical playtest design specification (v1.1)

Status: **playtest hypothesis**, not an approved commercial ruleset. Lives alongside SPARK and TILT in \`yotamon/spark-card-game\`; does not share their rules or browser storage.

## Design target

Shithead-family shedding game reimagined for a purpose-built deck, with no suits or royal ranks. A physically rewarding four-of-a-kind intervention ("SLAM") is central. Design for 2–5 players, approachable for families and adults, learnable quickly; do not introduce arbitrary tracking of earlier turns or bookkeeping. Keep it playable entirely offline with printed cards.

## Components

52 poker-size cards:
- Number cards: 1–10, **four copies per number**, 40 total. Every number, including 10, is an ordinary rank with no independent effect.
- RESET ×2: cancel the numeric/UNDER restriction. Keep the pile; next number may be any.
- GHOST ×2: transparent. Keep the active restriction; no new numeric rank.
- UNDER ×2: the next number must be 1–4, regardless of previous numeric rank. The condition persists through GHOST and SKIP and is replaced by another UNDER; it ends on the next played number, RESET, BURN, or pickup.
- SKIP ×2: the next active player loses a turn. Requirement stays as it was. With two players, the actor plays again.
- BURN ×2: move the pile (including BURN) to ashes, clear restrictions, actor plays again.
- DUMP ×2: force the next active player to take the entire pile, including DUMP, into their hand. The actor plays again; the pile is not burned and none of its cards leave the game.
All actions are always playable irrespective of the current numeric threshold. Action cards are played singly and never count toward four of a kind.

No suits, face cards, traditional jokers, scoring markers, chips, or extra board. One pile only. DUMP is a distinct action card (sometimes colloquially called a 'joker'), not a numbered rank or a wild joker.

## Setup

1. Shuffle one deck. Deal to each player 3 face-down cards (unseen), 3 face-up cards on top, 3 in hand.
2. Each player may exchange cards between their own hand and face-up cards before the first turn. Do not look at face-down cards.
3. Place the remaining cards into the face-down draw stock.
4. Start at an agreed player and proceed clockwise. The digital playtest uses seat 1 as first player.

Maximum five players with one deck because six would require 54 opening cards. We are intentionally not adding a second deck.

## On a turn

Play **one** legal card or a group of matching numbered cards from the currently available layer.

- When the pile has no active restriction, any number is legal.
- When the active numeric limit is N, you may play N or higher.
- While UNDER is active, only numbers 1–4 are legal.
- Any single action card is legal, at any time, even on an empty pile.
- Multiple number cards may be played simultaneously if they have the same rank and all are in the active layer.
- If you have no legal move, take the entire pile into your hand and end your turn. Taking voluntarily when a legal move exists is not allowed.
- After playing from the hand, draw back up to three cards from the stock if possible. Do not draw just because you had to take the pile.
- Turns may be changed by SKIP, BURN, DUMP, or SLAM. BURN, DUMP and a successful four-of-a-kind or out-of-turn SLAM always grant the actor another turn while the actor remains in play.
- Numeric four-of-a-kind burns the pile, clears the restriction, and grants the actor another turn.

**Layer progression:** Play from hand until both stock and hand are empty. Then play the face-up cards; if blocked, collect the pile into the hand and return to hand play. Once the face-up cards are gone and the hand is empty, play face-down cards blindly, one per turn. If a revealed face-down card is illegal, add it to the pile and take that whole pile into your hand. The player returns to hand play. The original face-down slots are not replenished.

Players whose hand, face-up and face-down cards all disappear finish immediately and sit out. There is no separate win-score. As soon as exactly one player remains, that player is the **PILEHEAD** (the loser).

## SLAM — out-of-turn completion

A run of four consecutive number cards of the **same rank at the top of the pile** burns the pile.

Any player still in the game can interrupt when they can *complete* the top run to four by laying exactly the missing number of matching cards. The cards must come from their current playable layer (hand or face-up, never blind). The player may contribute one, two, or three cards. Winning the interrupt clears the pile and awards that player the next turn.

Examples:
- pile top 7, 7, 7; another player lays one 7 → SLAM
- pile top 4, 4; another player lays two 4s → SLAM
- pile top 5; another player lays three 5s → SLAM
- pile top 5, GHOST, 5, 5; the intervening GHOST breaks the streak; this is **not** a four-of-a-kind.

The interrupted player's planned move does not resolve. A normal multi-card play is atomic, so a SLAM occurs after the played group is complete, not during a player's hand placement. First *physically legal* completed SLAM wins. No penalty for an incorrect verbal call, though it does not burn. This physical speed rule cannot be faithfully represented by serial hotseat on one device; the local app offers an explicit interruption action instead.

For online play, simultaneous response ordering requires server-authoritative timestamps and a defined latency policy. **Online room code exists**, but live use requires the Vercel database connection and real two-device verification (see `docs/pilehead-online.md`).

## Edge cases

- An action is a physical card added to the pile, even when its effect does not change the restriction.
- A GHOST on an empty pile leaves no number restriction.
- A SKIP on an empty pile skips the next player but does not establish any rank requirement.
- UNDER applies to the *next played number*, not necessarily the next physical card.
- RESET after UNDER removes the UNDER effect.
- Taking the pile clears all restrictions.
- A BURN on an empty pile discards itself and grants a repeat turn.
- DUMP on an empty pile gives that single card to the next active player and grants a repeat turn.
- DUMP always targets the next active seat (not necessarily the following numbered seat if a player is already out). The target picks up even when they could have played a legal card.
- A number 10 on any pile acts exactly like any other high rank: playing a single 10 does not burn or repeat the turn; four matching 10s still burn.
- When the actor goes out on BURN, DUMP, a normal four-of-a-kind or SLAM, the next active player takes the next turn instead; if only one player remains, game ends.
- Any last-card finish removes that player immediately; when only one remains, the game is over.
- Four action cards never form a SLAM. There are at most three of each action anyway.
- Normal turns and SLAM must not use face-up or face-down cards before those layers are available.

## Implementation map

- \`dist/pilehead/engine.js\`: pure deterministic authoritative game engine. Seeded Fisher–Yates shuffle, immutable card identity and 52-card conservation check.
- \`dist/pilehead/app.js\` / \`index.html\`: visually physical felt table, turn controls, local setup, local bot play and pass-and-play, persistent local session, replayable seed in exported QA state.
- \`dist/pilehead/print.html\`: 52-card cut-and-play physical prototype; printable backs optional.
- \`dist/pilehead-sim-core.js\`: adapter for existing \`dist/simulation.worker.js\`. Renders results under the **PILEHEAD** tab in main Simulate screen.
- \`dist/pilehead-simulation-results.json\`: deterministic starting bot baseline.
- \`tests/pilehead-engine.cjs\`, \`tests/pilehead-smoke.cjs\`: rules, conservation, UI source, build registration and simulator smoke regression checks.

## Release gates (not yet met)

- Human in-person tests against traditional Shithead: rules comprehension, SLAM frequency, retention and game length.
- No browser/phone device rendering or drag/touch performance assertion should be claimed until verified in a real browser.
- Test ability to discover SLAM on a crowded real tabletop. Assess whether the chance of an out-of-turn slam in 2-player games is too low.
- Validate action distribution and whether UNDER/RESET create satisfying pressure rather than easy escape.
- Verify printed deck feel, legibility and card-back alignment.
- Trademark/legal clearance, language/age compliance and product-safety review before retail printing.

**Do not** interpret a bot win-rate table as an objective assessment of fun or commercial potential. In a simulated batch every bot responds to SLAM perfectly and immediately. The engine and UI are a playtest environment, not a final retail product.
