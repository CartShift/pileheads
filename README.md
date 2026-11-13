# SPARK Simple+

Mobile-first Hebrew/English card-game playtesting prototype, hosted privately on ChatGPT Sites. Vanilla HTML, CSS and JavaScript, served by a dependency-free Cloudflare Worker with persistent D1 human rooms.

**Private playable site:** https://spark-simple-plus-yotam.yotamonf.chatgpt.site

## Run locally

Use Node.js 24 or newer for the tests and local SQLite-backed preview. No dependency installation is required.

```sh
npm test
```

Build and start the local preview:

```sh
npm run build
npm run dev
```

Open http://localhost:4173. The preview provides three clearly labeled local QA identities for testing separate player seats; those identity overrides are excluded from production.

## Rules and modes

| Mode | Shared row | Extra rule |
| --- | --- | --- |
| A: Classic+ | 8 | None |
| B: Extended | 9 | Recommended starting configuration |
| C: Experimental | 9 | One neutral SHIFT board card |

Every player has three hand cards, eight turns, one Wild and one Swap. There are three colors. A run of three or more identical colors scores one point per removed colored card; collapsing the row can trigger further runs. All insertion gaps, including both ends, are legal. At turn completion the row returns to its mode length. Nonmatching overflow discards the rightmost card; refill avoids automatic triples.

- **Swap:** swap an adjacent pair, then place one regular hand card in the same turn. Resolve only after both actions. Once per player per game; cannot be combined with Wild.
- **Wild:** replaces the regular placement and requires an explicit color choice. It does not draw or consume a regular hand card or grant another placement.
- **SHIFT, mode C only:** when a removed colored run touches SHIFT, remove SHIFT for zero points after collapse, move the leftmost surviving card to the right, then check combos again. SHIFT is never replenished. Ordinary rightmost discard can remove it without activation.

Existing v4 saves continue under the original seven-card rules. The local storage key remains `spark-simple-v04`. Progress, notes and archived games are browser-local, not cloud-synced. JSON export provides a separate backup.

## Physical tabletop playtesting UI

The default **Physical table** presentation is designed for evaluating a future printed card game, not for maximizing digital-game convenience. It puts opponents across the felt, the shared row at table center, and the player's three cards nearest the viewer. Insert points live **between** cards. The interface does not suggest optimal moves, and the underlying v4/v5 rules and game saves remain unchanged.

- **Touch / mouse:** tap a hand card to lift it, then tap the seam where you want to insert it. The placement is immediate, as with a real card. Alternatively drag a hand card over the row, inspect the highlighted insertion seam, and release to play; release away from the row to cancel.
- **Wild:** select Wild, choose its color, then tap an insertion seam.
- **Swap:** select Swap, tap the seam between the adjacent pair, then lift and insert a regular hand card in the same turn.
- **Focus:** use the Focus control to remove site chrome and use more of the screen as a table, especially in landscape.
- **Guided mode:** switch from Physical table to Guided mode for the original choose-position-and-confirm interaction. All gaps and both ends remain accessible with keyboard buttons in both modes.

The surface includes tighter landscape phone styling, reduced-motion support, explicit readable button labels, and a single deterministic state machine for tap and drag. `tests/tabletop.cjs` covers all placement seams, direct moves, the two special abilities and guided fallback. Card motion and real hardware responsiveness still need browser / touch QA; do not interpret a convincing animation as evidence that the printed game is enjoyable.

**Publishing:** GitHub changes do not update the private ChatGPT Sites deployment. Rebuild/republish the **existing** Sites project rather than create a new URL. The new `dist/tabletop.css` must accompany `dist/index.html`; the Worker build now includes this asset.

## Source map

- `dist/index.html` and `dist/tabletop.css`: tabletop interaction, responsive felt surface, legacy engine, persistence, narration, physical animations, replay and setup.
- `dist/engine-v5.js`: deterministic mode engine, move validation and bot policies.
- `dist/sim-core.js`, `dist/simulation.worker.js`: comparison simulator running off the UI thread.
- `dist/simulation-results.json`: reproducible bundled comparison, 120 games per mode.
- `tests/`: dependency-free rules, UI state, replay and regression checks. `original-v04.html` is the imported legacy parity fixture.
- `.openai/hosting.json`: existing ChatGPT Sites project and static directory.
- `docs/development-history.md`: prior implementation and QA notes.

## TILT Joker Lab inside the advanced simulator

**TILT is now a second game in this repository, with a separate physical-card engine and no changes to SPARK Simple+ rules or saved progress.** In the **Simulate** tab, select **TILT · Joker Lab** to compare three versions of the two-Joker full-pile mechanic. The existing SPARK A/B/C simulator remains one click away.

- **Play the physical first-person table:** \`/tilt/index.html?rule=match\` (recommended), \`?rule=joker\` (Joker reply), \`?rule=plain\` (uncounterable attack).
- **Print the prototype custom deck:** \`/tilt/print.html\`: 32 CORE cards, including 2 Jokers, plus 16 EXTRA cards not used in this experiment. A normal poker deck will not substitute for the rank-and-arrow cards.
- **Advanced comparison:** \`dist/tilt-sim-core.js\` runs the actual \`dist/tilt/engine.js\` through the existing \`dist/simulation.worker.js\`, sampling paired seeds and swapping the Timing bot's seat against Greedy, Hoard and Random policies. The reports show attacks, reversals, cards collected, large penalties, neutral Joker discards, actions to finish, and seat-sensitive win rates.
- **Instant report and reruns:** \`dist/tilt-simulation-results.json\` is the checked-in reproducible starting dataset; clicking Run uses the same off-main-thread Worker. Results can be exported as JSON.
- **Game UI and local saves:** \`dist/tilt/{index.html,app.js,engine.js,print.html}\`. Separate local save keys per Joker variant; the SPARK localStorage key and online multiplayer rooms are untouched.
- **Both supported packages:** \`scripts/build.mjs\` includes all TILT assets in the existing Sites/Cloudflare Worker output; \`scripts/build-vercel.mjs\` includes them in the static Vercel solo preview. Neither publish action is automatic from a GitHub commit.

Run \`npm run test:tilt\` for the engine, physical UI, printable deck and shared simulator regression suite. The regular \`npm test\` now includes a small simulator compatibility test alongside the original SPARK and room tests. The game engine's own seeded test covers 2,550 complete matches with exact 48-card conservation.

**Important scope:** This is a working integrated simulator, **not** a proven original game, commercially viable physical product, human skill study or Android device approval. Do not interpret win rates against basic bots as evidence of human enjoyment or a balanced retail deck. There is no online TILT room feature; its 2-player mode is local hotseat only.

## Validation and limits

`npm test` covers 100 complete games against the imported legacy engine, 90 complete new-mode games, six complete UI-state games, every insertion position, ability use, scoring, row and hand sizes, reloads, export payloads, replay and hidden-information isolation. A three-wave fixture scores ten points.

Local Chrome QA completed A against one bot and B against two bots. It exercised staged Swap, explicit Wild color, refresh, language switching, a two-wave six-point SHIFT move, the simulator Worker, and a 360px frame without page overflow.

Hosted Chrome QA completed on 2026-11-09 after owner sign-in: full B vs one bot (0–18), A vs two bots (0–24–30), and C vs one bot (9–24); restart, staged Swap surviving refresh, explicit Wild color, every gap for both board lengths, language switching, save/resume, and the two-wave six-point SHIFT scenario passed. Automatic playback returned to the next human turn with zero leftover flying-card elements. The hosted Worker completed another 30 games per mode (seed 1794232368). Browser download events confirmed both session JSON and simulation JSON exports. Downloaded file bytes were not independently re-parsed during this browser session. Android hardware touch/performance remains unverified. Simulations are bot evidence, not human enjoyment or commercial-readiness evidence. B offers more distinct scoring choices in the bundled sample without an extra rule; it is a playtesting hypothesis, not a proven winner.

## Deployment

The imported source matches the private Sites deployment identified in `docs/provenance.md`. This GitHub repository is a source copy, not an automatic deployment connection. GitHub pushes do not publish the site. Keep the existing Sites project, preserve its URL and private audience, and save a rollback version when deploying changes. Never commit authentication credentials or local browser data.

## Online human rooms, v0.8

The Friends tab creates a 2- or 3-player room in modes A/B/C and produces a private invitation link. ChatGPT identity owns each seat; only that player's hand is sent to their browser. The exact v5 engine runs on the server, with optimistic revisions and idempotent commands preventing double moves. Polling synchronizes participants approximately every two seconds while visible. Reconnect/refresh resumes the same seat. Rooms expire after 24 hours. Solo progress remains under its existing local-storage key.

The site is still private. An invitation does not bypass the Sites access policy: the owner must grant each friend's ChatGPT email viewer access through Sites. No public access was enabled. Sharing the room link gives a permitted visitor a seat while the lobby has space. The host starts only when all 2/3 seats have joined. There is no bot substitution or seat transfer in online rooms.

The static site is now served by a dependency-free Worker with a D1 `DB` binding. Source: `worker/`; bounded schema migration: `drizzle/0000_spark_rooms.sql`. `npm run build` embeds the existing assets in `dist/server/index.js`; generated Worker output is ignored in Git. Node 24 is needed for the local SQLite test adapter and preview. `npm test` runs the original regression suite and six complete 2/3-player room games, including hidden-hand responses, all modes, abilities, score totals, concurrency, retries, origin rejection and room expiry.

`npm run dev` is a LOCAL-ONLY preview harness. The `/qa/one/`, `/qa/two/`, `/qa/three/` pages simulate distinct identities for browser QA. These routes, header interpretation and SQLite adapter are never included in the deployed Worker. Production uses only Sites-provided authenticated identity headers. Do not expose the development server as production.

Hosted room creation, persisted lobby after refresh and invite copying were verified through the actual signed-in private site. Browser QA with two simulated local identities completed an entire 16-move B game (final scores 0 / 3), exercising joining, independent hands, Swap, explicit Wild, reconnect and identical final results in both windows. A real second-account hosted game is pending friend access; do not treat local identity simulation as that test.

## Vercel physical solo preview

A separate Vercel deployment can be built from the same repository with `npm run build:vercel`. Its output is `vercel-static/`, which contains only the solo table, replay, simulations and supporting assets. It does **not** bundle `dist/server/` or the Cloudflare Worker code, and it intentionally hides the Friends tab and online code because those rooms depend on ChatGPT Sites authenticated identity headers and the D1 `DB` binding.

Use the repository's `vercel.json` in Vercel with Node.js 24 and the team project's default protection. The original private Sites app remains the place to test actual human rooms until a new secure identity/database backend is designed for Vercel. This separation prevents a misleading or insecure partial multiplayer port.

To validate: `npm test`, `npm run build:vercel`, inspect `vercel-static/index.html`, and check Vercel's protected preview URL on desktop and mobile. Git changes and Vercel deployments do not modify the private Sites URL.

## TILT Mechanics Lab — two printable experiments

A separate, **non-production** print-and-play design test lives in `dist/tilt-lab/`. [Play preview](https://spark-exchange-q8xf57gm3-cart-shift.vercel.app/) and [print the deck](https://spark-exchange-q8xf57gm3-cart-shift.vercel.app/print.html). It compares **CONTROL / CHAIN** (safe arrow control versus risky multi-card press) and **TWIN PILES** (two directional piles that collide). Both run 2–4 seats with bot or local hotseat and independent saves, using the same 48 numbered arrow cards.

Design rules, limitations, observed simulation evidence and a blinded human playtest protocol: `docs/tilt-mechanics-lab.md`. Offline regression: `node tests/tilt-mechanics-lab.cjs`. This experiment does not change existing SPARK or TILT mechanics; this URL is a preview, not an automatic production update.
