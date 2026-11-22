# PILEHEAD — Official external playtest rules (v1.7 Final Duel, revised 2026-11-22)

Status: **v1.7 versioned digital playtest rules**, not a retail-approved ruleset. Rule changes require a documented variant and a new playtest cohort. See `docs/pilehead-playtest-kit.md` and the printable `/pilehead/playtest.html` for facilitators. STACK is now the only maintained game in `yotamon/spark-card-game`; the internal PILEHEAD name and existing browser storage keys remain for compatibility.

## Design target

Shithead-family shedding game reimagined for a purpose-built deck, with no suits or royal ranks. A physically rewarding four-of-a-kind intervention ("SLAM") is central. Design for 2–5 players, approachable for families and adults, learnable quickly; do not introduce arbitrary tracking of earlier turns or bookkeeping. Keep it playable entirely offline with printed cards.

## Components

54 poker-size cards:
- Number cards: 1–10, **four copies per number**, 40 total. Every number, including 10, is an ordinary rank with no independent effect.
- RESET ×2: cancel the numeric/UNDER restriction. Keep the pile; next number may be any.
- GHOST ×2: transparent. Keep the active restriction; no new numeric rank.
- UNDER ×2: the next number must be 1–4, regardless of previous numeric rank. The condition persists through GHOST and SKIP and is replaced by another UNDER; it ends on the next played number, RESET, BURN, or pickup.
- SKIP ×2: the next active player loses a turn. Requirement stays as it was. With two players, the actor plays again.
- BURN ×4: move the pile (including BURN) to ashes, clear restrictions, actor plays again.
- DUMP ×2: **burn DUMP itself** (including both copies if grouped). Choose **any other active player** to collect **only the cards already in the pile**, even if they could have played. The actor immediately plays again. DUMP never moves into the target's hand.
All actions are always playable irrespective of the current numeric threshold. The two new BURN cards have unique IDs 52 and 53, preserving all original 52 card IDs for existing active rooms. **Two or more identical action cards may be played together as one move**, just like matching numbers. Only identical action types may be grouped; different types cannot be combined. The action's effect resolves **exactly once per group** (two SKIP cards skip only one player; two BURN cards burn once and give one extra turn; two DUMP cards are burned together, and the chosen active opponent takes only the preexisting pile; the actor receives one extra turn). Actions never count toward four of a kind.

No suits, face cards, traditional jokers, scoring markers, chips, or extra board. One pile only. DUMP is a distinct action card (sometimes colloquially called a 'joker'), not a numbered rank or a wild joker.

## Setup

1. Shuffle one deck. Deal to each player 3 face-down cards (unseen), 3 face-up cards on top, 3 in hand.
2. Each player may exchange cards between their own hand and face-up cards before the first turn. Do not look at face-down cards.
3. Place the remaining cards into the face-down draw stock.
4. The first player is chosen by a visible random draw. In later rounds, the first player to finish in the previous round starts; play proceeds clockwise.

Maximum five players. Six would consume all 54 cards in the opening deal, leaving no draw stock, so six-player games are intentionally not supported.

## On a turn

Play **one** legal card or a group of matching numbered cards **or identical special cards** from the currently available layer.

- When the pile has no active restriction, any number is legal.
- When the active numeric limit is N, you may play N or higher.
- While UNDER is active, only numbers 1–4 are legal.
- Any action card is legal, at any time, even on an empty pile. Any two or more identical action cards may be played together; resolve the effect once.
- Multiple number cards may be played simultaneously if they have the same rank and all are in the active layer. Matching action cards follow the same grouping rule.
- **Strategic pickup:** on your turn, you may take the pile into your hand whenever it is nonempty, even when you have a legal play. In Final Duel, burn the visible top card first and take the rest. Taking ends your turn and clears the active number restriction. This remains available in the hand, face-up and blind layers. You cannot take an empty pile, interrupt someone else's turn with pickup, or bypass an unresolved DUMP target.
- After playing from the hand, draw back up to three cards from the stock if possible. Do not draw just because you had to take the pile.
- Turns may be changed by SKIP, BURN, DUMP, or SLAM. BURN, DUMP and a successful four-of-a-kind or out-of-turn SLAM always grant the actor another turn while the actor remains in play.
- Numeric four-of-a-kind burns the pile, clears the restriction, and grants the actor another turn.

**Layer progression:** Play from hand until both stock and hand are empty. **Exception:** if the stock is empty and all remaining hand cards (one to three) share the same face, play them with identical face-up cards in one move (LAST-HAND COMBO), including matching action cards or a four-of-a-kind numeric SLAM. All remaining hand cards must be included first, and the combined group cannot exceed four. This documents the established v1.6 engine behavior. Otherwise, play from face-up only after the hand is empty. If blocked, collect the pile into the hand and return to hand play. Once the face-up cards are gone and the hand is empty, play face-down cards blindly, one per turn. If a revealed face-down card is illegal, add it to the pile and take that whole pile into your hand. The player returns to hand play. The original face-down slots are not replenished.

Players whose hand, face-up and face-down cards all disappear finish immediately and sit out. There is no separate win-score. As soon as exactly one player remains, that player is the **PILEHEAD** (the loser).

## SLAM — out-of-turn completion (including a complete independent four)

A run of four consecutive number cards of the **same rank at the top of the pile** burns the pile.

Any player still in the game can interrupt when they can *complete* the top run to four by laying exactly the missing number of matching cards. Alternatively, on any **nonempty pile**, the player may SLAM all four copies of one number from their current playable layer, **even if they do not match the top rank**. The cards must come from the currently playable layer (hand or face-up, never blind). A successful SLAM burns the whole pile and awards that player the next turn. Matching special cards cannot SLAM. BURN has four copies but grouping them still resolves the effect exactly once.

Examples:
- pile top 7, 7, 7; another player lays one 7 → SLAM
- pile top 4, 4; another player lays two 4s → SLAM
- pile top 5; another player lays three 5s → SLAM
- pile top 5, GHOST, 5, 5; the intervening GHOST breaks the streak; this is **not** a four-of-a-kind.

A successful SLAM overrides the next planned move. A SLAM cannot be declared when the pile is empty. A normal multi-card play is atomic, so a SLAM occurs after the played group is complete, not during a player's hand placement. First *physically legal* completed SLAM wins. No penalty for an incorrect verbal call, though it does not burn. This physical speed rule cannot be faithfully represented by serial hotseat on one device; the local app offers an explicit interruption action instead.

For online play, simultaneous response ordering requires server-authoritative timestamps and a defined latency policy. **Online room code exists**, but live use requires the Render database connection and real two-device verification (see `docs/pilehead-online.md`).

## Edge cases

- An action is a physical card added to the pile, even when its effect does not change the restriction.
- A GHOST on an empty pile leaves no number restriction.
- A SKIP on an empty pile skips the next player but does not establish any rank requirement.
- UNDER applies to the *next played number*, not necessarily the next physical card.
- RESET after UNDER removes the UNDER effect.
- Taking the pile clears all restrictions.
- A BURN on an empty pile discards itself and grants a repeat turn. A group of two, three, or four BURN cards burns them all as a single action and grants only one extra turn.
- DUMP on an empty pile **burns its own card(s)**, transfers zero cards to the chosen opponent, and grants one repeat turn; DUMP is not given to its target.
- DUMP can target **any other player who has not finished**, including someone across the table. The chosen target must pick up even if they have a legal move. You cannot choose yourself or a finished player. With only one eligible opponent, the choice is automatic. If a face-down card reveals DUMP, choose the target **after revealing it**, before the pile moves; no other move can happen while the choice is pending.
- A number 10 on any pile acts exactly like any other high rank: playing a single 10 does not burn or repeat the turn; four matching 10s still burn.
- When the actor goes out on BURN, DUMP, a normal four-of-a-kind or SLAM, the next active player takes the next turn instead; if only one player remains, game ends. Choosing a DUMP recipient does not change clockwise turn order; the actor plays again if still in the game.
- Any last-card finish removes that player immediately; when only one remains, the game is over.
- Action cards never contribute to a SLAM. There are four BURN cards and two copies of every other action in this 54-card deck.
- Normal turns and SLAM must not use face-up or face-down cards before those layers are available, except the explicit LAST-HAND COMBO bridge from the complete matching final hand. Face-up pairs may be grouped when their layer is active, but blind cards remain one-per-turn.

## SNAP and LAST-HAND COMBO — additional frozen rules

- **SNAP:** After playing a number from the hand, newly replenished cards from the stock matching that played number can be thrown immediately, before the next player's move. Only cards drawn in **that same move** are eligible; old matching cards in the hand do not count. This does not steal the next turn unless a group of four burns the pile. Online there is no time-based priority or delay: the next player can act immediately. The SNAP button remains available only while the opportunity exists; the first move committed by the server wins. Once another action resolves, the previous player's SNAP opportunity ends.
- **LAST-HAND COMBO:** With empty stock and a homogeneous hand containing one to three cards, play the complete remaining hand together with identical face-up cards as one atomic group (up to four). Matching action cards can also bridge, resolving their effect once. Numbers obey the pile restriction; no bridge is allowed while stock remains.
- **Final Duel (v1.7):** Once the draw stock is **empty** and exactly **two active players remain**, any pile pickup permanently burns the **visible top card** before transferring the rest to the recipient. This includes voluntary pickups, failed blind flips (where the revealed card becomes topmost), and DUMP. If the top card is the last card in the pile, the recipient takes none. Before the trigger there is no erosion. A player whose last blind card burns immediately finishes. No counters or tracked repeated states are required.
- **Legacy compatibility:** Existing v1.6 54-card games and v1.2–1.5 52-card games retain their original pickup rules for the entire ongoing round. New rooms and rematches use v1.7. Keep all playtest outcomes version-labeled.
- **Separate experiment:** The three-of-a-kind final-duel SLAM variant remains optional and is not enabled in v1.7.

## Implementation map

- \`dist/pilehead/engine.js\`: pure deterministic authoritative game engine. Seeded Fisher–Yates shuffle, immutable card identity and version-aware 54-card (legacy 52-card) conservation check.
- \`dist/pilehead/app.js\` / \`index.html\`: visually physical felt table, turn controls, local setup, local bot play and pass-and-play, persistent local session, replayable seed in exported QA state.
- \`dist/pilehead/print.html\`: 54-card cut-and-play physical prototype; printable backs optional.
- \`dist/pilehead-sim-core.js\`: standalone diagnostic simulator, invoked with \`npm run simulate\`.
- \`dist/pilehead-simulation-results.json\`: deterministic starting bot baseline.
- \`tests/pilehead-engine.cjs\`, \`tests/pilehead-smoke.cjs\`: rules, conservation, UI source, build registration and simulator smoke regression checks.

## Release gates (not yet met)

- Human in-person tests against traditional Shithead: rules comprehension, SLAM frequency, retention and game length.
- No browser/phone device rendering or drag/touch performance assertion should be claimed until verified in a real browser.
- Test ability to discover SLAM on a crowded real tabletop. Assess whether the chance of an out-of-turn slam in 2-player games is too low.
- Validate action distribution and whether UNDER/RESET create satisfying pressure rather than easy escape.
- Verify arbitrary DUMP targeting in 3–5 player games, after a blind reveal, and against eliminated-player edge cases.
- Verify printed deck feel, legibility and card-back alignment.
- Trademark/legal clearance, language/age compliance and product-safety review before retail printing.

**Do not** interpret a bot win-rate table as an objective assessment of fun or commercial potential. In a simulated batch every bot responds to SLAM perfectly and immediately. The engine and UI are a playtest environment, not a final retail product.
