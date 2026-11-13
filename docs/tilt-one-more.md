# TILT ONE MORE · Simplified physical playtest

## Why this version exists

Direct human feedback on the earlier preview was unmistakable: **Twin Piles felt terrible and not fun**, while **CONTROL / CHAIN's rules were confusing**. These are qualitative observations from a real human, not suggestions to add onboarding to unchanged rules.

**Decision:** Retire Twin Piles from the primary playtest. Archive the previous A/B experiment at `dist/tilt-lab/archive.html`. Replace the chain with a fresh isolated, much smaller ruleset called **ONE MORE**.

**Latest playable preview:** https://spark-exchange-l87gdq1rk-cart-shift.vercel.app/

**Printable physical prototype:** https://spark-exchange-l87gdq1rk-cart-shift.vercel.app/one-more-print.html

## One-minute teach

1. Deal each player 4 cards. Start with an **empty** central pile. The first player may lead any card.
2. The arrow on the current top card constrains the next one: ↑ means equal/higher; ↓ equal/lower. Matching the top card's number removes the entire pile and ends the turn.
3. After one ordinary non-matching card, decide **STOP** (end your turn) or **ONE MORE** (place exactly one additional legal card, different number, shifted right and fully readable).
4. On the next turn, if the next player has the same number as the extra card, they can **BOUNCE** by playing it (either arrow). The entire pile returns to the original attacker; the bounce card leaves play; the bouncing player's turn ends. If they play a different legal card, play proceeds normally, no accept button.
5. If no legal play and no bounce is available, trade a hand card for the pile's top card. The surrendered card leaves play. Refill to four at the end of the turn while the stock remains. When stock is empty, the first person to run out of cards wins, once any final ONE MORE can no longer be bounced.

Only one pile, one optional bonus, one simple matching response. No arrow rotation, 3-card chains, special Joker cards, or separate counter-confirmation step.

## Simple example

Previous pile top: **4 ↑**. You can play **6 ↑**, then safely stop. If you have **7 ↓**, you can play it as ONE MORE. The next player can bounce if they hold **any 7** (regardless of its arrow). Without one, they play normally. The bonus card remains offset and visible during the bounce opportunity.

## Scope and isolation

- Engine: `dist/tilt-lab/one-more-engine.js`, exports `TiltOneMore`.
- UI: `dist/tilt-lab/index.html` with `one-more-app.js`, fresh local-save key `tilt-one-more-local-v1`.
- Print: `dist/tilt-lab/one-more-print.html` (48 cards across six A4 sheets plus one rules page).
- `dist/tilt-lab/archive.html` uses the older experimental engine, frontend and print files.
- No changes to production TILT / SPARK mechanics, other saves, or production aliases.
- Aggregated, opt-in completed-game feedback in browser localStorage through the existing `playtest.js`. No hidden card data in exports.

## Automated observations, not proof of fun

Seeded heuristic game-engine runs, **2,000 each** at 2, 3 and 4 players (6,000 completed total), with exact 48-card conservation checking:

| Players | Average turn count | One More chosen per offered decision | Bonus bounced | Safety draws |
| --- | ---: | ---: | ---: | ---: |
| 2 | 53.0 | 28.4% | 39.0% | 0 |
| 3 | 50.2 | 43.9% | 41.2% | 0 |
| 4 | 47.4 | 43.5% | 39.8% | 0 |

The bots' decisions are heuristic and do not measure strategic depth. No result here establishes that the game is fun or worth a printed retail product. Source includes an offline test suite `tests/tilt-one-more.cjs`, but its full Node execution has not yet been verified in this assistant session due execution timeout. Focused engine simulation and a basic mock-browser lift/place test passed. Real phone/table rendered QA remains outstanding.

## What to look for in next human playtest

- Can you explain how to take your first turn after **20 seconds**, without reading the full rulebook?
- Do you ever voluntarily STOP despite holding a legal bonus? Why?
- Do you understand exactly when a bounce is possible without a tooltip?
- Does a successful bounce feel earned and surprising, or merely lucky and frustrating?
- Is the blocked-turn trade unnecessarily strange?
- Do you **ask to replay** after two games? Would you choose to play again if you had other familiar card games available?

**Kill criterion:** if the simpler variant is still confusing, feels random or generates no genuine repeat-play desire, stop adding rules and rethink the central game. Do not merge into production or print commercially just because a simulator passes.
