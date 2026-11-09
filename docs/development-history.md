# SPARK Simple+ Playtest Studio

Private, buildless HTML/CSS/JS game hosted on ChatGPT Sites. Rules: imported Simple+ v0.4. Interface: v0.5.

## What changed

The table resolves one player's move at a time. Card and numbered position selection require confirmation. Each placement, matching wave, collapse and refill can be inspected before continuing. A shortcut finishes the current move without skipping another player's turn. Pending moves survive reload without rerolling bots or applying points twice.

The Moves tab records before/after rows, scoring waves and arithmetic. The Playtest tab stores notes and up to 20 local sessions, supports read-only inspection of archived games, and exports a versioned JSON bundle. Data stays in the current browser; no cloud sync is implied.

## Rules retained

Three hand cards, seven shared cards, runs of three or more, one point per removed card, cascading collapse, one Wild and one adjacent Swap per player, eight turns per player. No extra chain bonus. Nonmatching insertion drops the rightmost card. Refill avoids immediate triples. One or two bots use the original tactical policy.

## Verification

Run `node tests/game.cjs`. The dependency-free suite compares 100 complete sequential games against the imported original engine, including cards, deck, scores, ability depletion and bot choices. It verifies 157 naturally occurring chain moves, point arithmetic, reload at every resolution step, duplicate commit prevention, illegal move rejection, language switching, notes, archive, export payload and ties.

Browser QA completed full games with one and two bots, using Wild and Swap, guided and quick resolution, a reload mid-move, history inspection, notes persistence and archived-game viewing. The two-bot game was completed in a 360px-wide Chrome frame. Physical Android touch/browser behavior and actual JSON download completion still require device validation. JSON payload generation and parsing pass automatically.

This is a testing system, not evidence that the physical game is ready for commercial release. Human comprehension, enjoyment and balance need observed playtests. Rule changes should receive a separate version so results remain comparable.

## Physical table, interface v0.6

The game now has an automatic presentation clock, with pause, single-step and slow/normal/fast playback. Card placement, adjacent swaps, collection to each player's pile, row collapse, rightmost discard and deck refill use measured DOM positions and the native Web Animations API. Row cards keep a consistent size during insertion. Dragging a hand card onto a gap commits the same legal move as the tap controls. Keyboard and tap controls remain available.

The player's hand stays visible while watching opponents. Scores display collected waves immediately and reconcile with the unchanged engine at move completion. Native reduced-motion preference suppresses travel animations; explanations and stage controls remain. Hiding the page pauses playback rather than silently finishing turns.

Read-only replay reconstructs the row before a move, then placement, waves, collapse and refill. Archived games replay with their own participants, even if the active game has a different bot count. Replays never change the live state or random generator and return paused.

`node tests/game.cjs` now runs both the full original-engine parity suite and motion-plan/replay regression checks. Browser v0.6 QA: native pointer drag in a 393px Chrome frame, automatic bot progression, pause/single-step, Wild, Swap, mid-move reload, a complete two-bot game and English/Hebrew switching. Replay finished with identical DOM score counters (18 / 15 / 6) and zero leftover flying-card elements. Android hardware touch/performance and JSON download completion remain device checks.

## Rules v0.5, interface v0.7 (2026-11-09)

New games offer A Classic+ (8 cards), B Extended (9, default), and C Experimental (9 with one neutral SHIFT). All retain three colors, three hand cards, eight turns, and one point per matched colored card. SWAP is now a once-per-game adjacent swap followed by one regular placement; resolution starts only after both. Wild replaces placement, requires an explicit color, and leaves the regular hand intact. Old v4 saved games continue with their original rules and seven-card board under the unchanged storage key.

SHIFT: if a removed colored run touches SHIFT, remove SHIFT for zero points after collapse, move the leftmost surviving card to the right, then check combos again. There is one SHIFT, it never refills, and may leave through ordinary rightmost discard without activating. It cannot loop.

The Web Worker simulator reports matched-seed comparisons of random, greedy and limited-lookahead bots, seat-rotated across two- and three-player games. Lookahead uses a synthetic unknown refill, not the actual deck or hidden hands. Reports include raw scoring move count, deduplicated scoring choices, zero-point/combo/chain rates, points, conditional special impact, win shares, and game length. These are simulations, not human playtest results. The bundled report contains 120 games per mode. B has 4.46 distinct scoring choices per turn versus A 3.52 and C 3.91, making B a promising hypothesis without an extra rule, not a proven balance winner.

Current QA: `node tests/game.cjs` passes the original 100-game parity suite, 90 complete new-mode games, six complete sequential UI-state games with refresh at every turn, three-wave ten-point fixture, SHIFT and special semantics, all insertion positions, row/hand counts, and reproducible simulation/hidden-information checks. Local Chrome UI: complete A vs one bot and B vs two bots; explicit Wild color; staged Swap with refresh; C seed 23 SHIFT activation, two waves and six points; language and resume; 360px frame has equal root scroll/client width, final insertion gap reachable. Background simulation ran in the browser. Hosted browser QA remains blocked by unsuccessful Google sign-in; this must not be represented as completed. Android hardware touch/performance and actual JSON download completion remain unverified. Export payload validation passes.
