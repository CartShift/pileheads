# SPARK Duel: strategic core experiment

**Status:** Isolated exploratory ruleset. It does **not** modify the existing SPARK Simple+ game, Cloudflare rooms, player saves, the earlier Momentum previews, or the main branch. The playable Vercel deployment is a separate preview.

## Why this exists

After adding more scoring opportunities to Momentum, the game still felt repetitive: a nine-card hand covering four colors almost always gave each player what they needed, scoring was usually the obvious choice, and a free bonus placement rarely involved sacrifice. Merely making more legal moves is not the same as making the choices more consequential.

We therefore test a fundamentally different **small-hand exchange and fixed-round scoring loop**. It reuses a proven isolated Exchange engine rather than inserting more special powers into the Momentum variant.

## Rules: no special cards or attacks

- **Players:** exactly 2.
- **Deck:** 144 ordinary cards, 36 each of four colors. Entirely finite; visible discards can be reshuffled when needed.
- **Table:** a shared face-up row of nine cards. Both players hold exactly three cards.
- **Turn:** exchange one hand card with a **different-colored** card anywhere in the row. Keep the displaced row card in your hand. Same-color exchanges and no-ops are illegal.
- **Score:** any resulting contiguous runs of 3+ identical colors are removed to your captured pile; collapse the row and resolve any resulting chain reactions. Score 1 point per captured card.
- **Refill:** draw from the hidden top of the deck and append on the right to restore nine cards. If a candidate top card would create a free triple, put it face-up into the discard and try the next. Draws and discards are counted. The engine has explicit, bounded blocked-stock states rather than inventing cards.
- **Win condition:** after ten turns for each player, the most captured cards wins. Equal scores are a tie.

**Information experiment:** in `Open Hands` mode, both hands are visible to both players. The bot can plan against the opponent's *public* hand but never reads the hidden stock when deciding a move. In `Hidden Hands` mode, an opponent's hand remains concealed and the bot uses an information-limited planner. Hotseat passes the device privately only in hidden mode.

## Strategy hypothesis

Meaningful skill should come from:
1. **Hand scarcity:** keeping the row card you displace changes what you can do next.
2. **Blocking:** an attractive exchange can also open a much stronger reply for the opponent.
3. **Planning under visible information:** when hands are face-up, an opponent's opportunities are observable and can be denied.
4. **Timing:** immediate captured points compete with building a future sequence and positioning for later rounds.
5. **Finite horizon:** players know exactly how many turns remain and can choose between short-term points and longer-term setups.

These are hypotheses, not validated human behavior. Public opponent information may also make the game too deterministic or encourage analysis paralysis. That is precisely what the experiment should test.

## How to run

Use the standalone `index.html` with sibling `engine.js` and `app.js`. It supports responsive mobile layouts, tap-to-exchange actions, bots, two-player same-device play, open/hidden hands, independent `spark-duel-lab-v01` browser saves, replay-by-seed, and JSON exports.

```bash
node experiments/duel/test.cjs
node experiments/duel/ui-test.cjs
node experiments/duel/simulate.cjs --seeds 120 --seed 210000
```

The default bot is tactical when hands are open; select Basic to compare against an immediate-scoring bot. Source: `experiments/duel/`. `npm run test:duel` runs the focused engine and UI checks.

## Validation evidence

A deployed Vercel runtime executed both focused test suites successfully: engine checks passed and DOM-stub UI integration passed all 18 checks, including hotseat privacy and persistence. A separate 120-game seat-rotated policy probe per information mode found:

| Information | Games completed | Stronger bot vs basic bot, win share | Approx. turns with multiple scoring tradeoffs |
| --- | ---: | ---: | ---: |
| Open Hands (counter bot) | 120/120 | 84.6% | 23.1% |
| Hidden Hands (unknown-hand planner) | 120/120 | 74.6% | 26.5% |

**Do not overinterpret:** these bots use different heuristics; their win shares are not a controlled human skill-gap estimate, and the apparent tradeoff-rate reduction in Open Hands could be a warning. These values do not demonstrate that open play is intrinsically more strategic, fair, challenging or fun. The engine does not peek into the hidden deck in either mode.

The preview contains no long-distance multiplayer; two humans can play by sharing one device. Browser/mobile touch tests, first-time players, actual minutes per session, and physical tabletop trials remain unverified.

## Test with human players before adding rules

Play one match with open hands and one with hidden hands, alternating starting player and using the same initial seed when possible. Afterward, independently ask:

- What was a move you seriously considered but rejected, and what did you sacrifice?
- Did seeing the other hand make a useful block possible, or merely make turns slower?
- Could you plan a reply before the opponent moved?
- How often did you feel there was an obvious best move?
- Would you voluntarily replay immediately, without being asked?

Record scores, duration, first player, rounds requiring thought, spontaneous rematches, and confusion about refills. A useful next step is 12+ independent groups with randomized mode order, not declaring the game finished based on bots.

## Boundaries

Do not merge this experiment into the original ChatGPT Sites game, overwrite existing saves, or change production aliases without further review and real human playtests. No mass-market claims, physical-product readiness, or rules originality is established.

## Verified clean preview

- **Open-hand strategic duel:** https://spark-exchange-ctk214b37-cart-shift.vercel.app/duel/?information=open
- **Hidden-hand comparison:** https://spark-exchange-ctk214b37-cart-shift.vercel.app/duel/?information=hidden&new=1

The clean preview is **READY**, with HTTP 200 verified for `/duel/`, `/duel/app.js`, `/duel/engine.js`, the older `/attack/` comparison route and the Exchange root. It deliberately contains no temporary verification API. The production Vercel aliases and ChatGPT Sites URL remain unchanged.

**Browser caveat:** The preview works as static frontend assets and passed a Node DOM-stub integration test, but it has not been exercised with real phone touch gestures or two human players. The `&new=1` query starts a fresh match and replaces that preview's local in-browser saved game.
