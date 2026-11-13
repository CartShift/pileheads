# TILT Mechanics Lab: printable A/B game-design experiment

Status: **playable experimental branch, not validated retail rules**.
Preview: https://spark-exchange-g33ei67ee-cart-shift.vercel.app/
Print 48-card deck and rules: https://spark-exchange-g33ei67ee-cart-shift.vercel.app/print.html

## Product question

Can a directional rank-and-arrow deck sustain an original, emotionally compelling physical card game for 2–4 players, with meaningful decisions **most turns** rather than occasional Joker surprises?

Do **not** interpret the quality of the web UI, a winning bot strategy, or zero engine stalls as product–market validation.

## Implementation isolation

All gameplay in this experiment is under `dist/tilt-lab/`, with `engine.js` exported as `TiltMechanics`. The standalone mode switch offers two genuinely separate state machines sharing physical cards, bot turns, local pass-and-play and persistence. The experiments do NOT change `dist/tilt/engine.js`, SPARK rules, production hosting, or existing saves. The new local keys are `tilt-mechanics-lab-chain-v1` and `tilt-mechanics-lab-twin-v1`. The earlier physical UI PR #21 remains independent.

Source files:
- `index.html`: physical-table presentation and responsive screen
- `app.js`: human lift/place, opponent hands, turn handoff, browser-local saves
- `engine.js`: deterministic state machine, legal moves, bots, seeded simulation and 48-card conservation
- `print.html`: six A4 sheets for the 48 cards plus one A4 rules sheet
- `tests/tilt-mechanics-lab.cjs`: offline regression suite, manual invocation; no new CI workflows

## Shared printed pack

Exactly 48 numbered cards: ranks 1–8, three copies each of ↑ and ↓ at every rank. 4 cards per player. One visible card initially on each active pile. The arrow on the last played card regulates the next play in that lane: ↑ means equal or higher; ↓ equal or lower. Matching a rank in the same lane clears that pile. Removed cards go to a public discard ("burn") area; they are never reshuffled. At the end of a completed turn, refill to four from stock while stock remains. Once stock is empty, the first player to empty their hand wins, after resolving any pending counter.

## Prototype A: CONTROL / CHAIN

**Every turn provides a basic risk trade.**

- Lay one legal card upright. On a match with the previous top, burn the whole pile and finish your turn.
- Otherwise choose:
  - **CONTROL:** stop and choose the direction (↑ / ↓) for the card you just played, physically rotating that card if needed. The number is unchanged.
  - **CHAIN:** add one or two more cards, laid sideways, each of which must be legal relative to the previous arrow and must change rank from the preceding card. You may stop after adding the first sideways card. You cannot rotate the final arrow once you pressed.
- The next player gets a single counter window before normal play. A counter uses one card matching the rank of *any* sideways card; the counter card burns; the challenger takes the top two or three cards from the pile, according to the length of the chain; all earlier cards in that pile burn. The counter consumes the responder's turn. If declined or unavailable, the responder continues with a normal turn from the last sideways card.
- A player with no legal card exchanges a chosen card from hand for the pile top; their surrendered hand card burns. This guarantees eventual card removal.
- Crucial win rule: a player ending on their final card with a chain must survive the next player's response before being awarded the win.

Open design tension: Is CONTROL strong enough to make passing on an available CHAIN strategically sensible? Does selecting an arrow genuinely alter the future or create a deterministic trap at extreme values?

## Prototype B: TWIN PILES / CROSS-CLEAR

**Every ordinary card has a spatial decision.**

- Two separate piles begin with one face-up card each. Play one legal card to either pile.
- If it matches the chosen pile's own prior top, burn that pile.
- If it matches the *other* pile's top, the two piles collide, both burn, and the player may choose any additional card from hand to burn as a reward.
- If no legal card exists on either pile, choose a hand card and a pile. Exchange that card for that pile's top card; burn the surrendered card **and** any other cards in that chosen pile. This guarantees a card leaves active circulation, avoiding a forced-pickup recycling deadlock discovered in early simulations.
- No memory of previous turns, timers, board or tokens are required.

Open design tension: Is a collision an interesting setup-and-trap maneuver, or an obvious always-take bonus? Would a no-bonus collision produce more trade-offs?

## Automated stress testing (NOT human UX or commercial validation)

Deterministic heuristic bots exercise legal actions, not human choice quality. **1,500 seeded games per combination** (2 mechanics x 2/3/4 players = 9,000 complete games) on isolated prototype engines, with a 240-turn safety cap:

| Variant | Players | Mean turns | Maximum observed | Draws | Signature mechanic rate |
| --- | --- | ---: | ---: | ---: | ---: |
| CONTROL / CHAIN | 2 | 55.5 | 71 | 0 | 17.2% of turns include a press |
| CONTROL / CHAIN | 3 | 59.7 | 82 | 0 | 9.5% press |
| CONTROL / CHAIN | 4 | 52.6 | 68 | 0 | 9.7% press |
| TWIN PILES | 2 | 38.2 | 51 | 0 | 19.0% collision |
| TWIN PILES | 3 | 36.3 | 57 | 0 | 21.4% collision |
| TWIN PILES | 4 | 34.1 | 50 | 0 | 22.3% collision |

These statistics include staged engine actions and are **not playtime estimates**. Both bot policies and design choices can significantly change the numbers. No fair-skill or preference study has been performed.

Notably, the very first TWIN PILES version's pickup mechanic had 25/1,200 time-limit draws in the 3-player test. The forced exchange-and-burn revision eliminated all observed stalls in the subsequent 9,000 runs. Do not revert this without a replacement that guarantees progress.

## Blind human test protocol (5+ independent tables)

Print one identical deck, use opaque sleeves or properly backed cards, and do not discuss which variant is the favorite. Randomize which variant each group learns first.

For each group:
1. Explain one game's rules from the printed sheet, without strategy tips. Time the explanation.
2. Play once. Observe without prompting. Time the match, count clarifying questions, reactions, and stopped/risky turns. Record any temporary rule disputes.
3. Offer a second game with no pressure. Record whether players volunteer to replay or switch.
4. Play the competing variant. Ask participants which they would genuinely choose for a spontaneous rematch.
5. Follow up individually: "What was your smartest move?", "What made you feel lucky/unlucky?", "What frustrated you?", "Would you buy it?" Avoid leading questions.

### Spreadsheet-compatible scorecard columns
`group_id,players,mode,order,teach_seconds,game_minutes,rounds,spontaneous_rematch,requested_same_variant,hard_decisions_count,tension_moments,confusing_rules,dominant_action_notes,would_buy_without_price_prompt,verbatim_quote`

### Release gates
- Explain in approximately 60 seconds with no off-table memory burden.
- 2–4-player duration target 10–15 minutes once real timed games exist.
- Neither "always chain" nor "always stop" is overwhelmingly dominant in human play.
- Important decisions are comprehensible and perceived as earned.
- No stalls, unreasonable hand sizes or forgotten rule windows.
- Multiple groups request to play again unprompted.
- Establish market differentiation and name/trademark clearance *before* commercial printing.

## What's intentionally out of scope

Online multiplayer, monetization, statistics dashboards, new Jokers, animations designed to rescue weak rules, production merge or mass printing. The present system is deliberately a cheap, testable **game-design laboratory**.
