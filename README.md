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
| D: Push & Take (solo experiment) | 9 | A regular zero-point placement takes the rightmost row card into your hand |

Every player has three hand cards, eight turns, one Wild and one Swap. There are three colors. A run of three or more identical colors scores one point per removed colored card; collapsing the row can trigger further runs. All insertion gaps, including both ends, are legal. At turn completion the row returns to its mode length. Nonmatching overflow discards the rightmost card; refill avoids automatic triples.

- **Swap:** swap an adjacent pair, then place one regular hand card in the same turn. Resolve only after both actions. Once per player per game; cannot be combined with Wild.
- **Wild:** replaces the regular placement and requires an explicit color choice. It does not draw or consume a regular hand card or grant another placement.
- **Push & Take, mode D only (experimental):** Only nine gaps, immediately before each row card (never after the far-right card). If a normal hand-card placement scores nothing, the rightmost card becomes the replacement hand card instead of drawing from the deck. If a regular card scores, draw as normal. Wild still never consumes a hand card: its non-scoring move discards the rightmost card. Swap may precede a regular card. The hand stays at three cards. No extra scoring rules, colors or two-card turns.
- **SHIFT, mode C only:** when a removed colored run touches SHIFT, remove SHIFT for zero points after collapse, move the leftmost surviving card to the right, then check combos again. SHIFT is never replenished. Ordinary rightmost discard can remove it without activation.

Existing v4 saves continue under the original seven-card rules. The local storage key remains `spark-simple-v04`. Progress, notes and archived games are browser-local, not cloud-synced. JSON export provides a separate backup.

## Source map

- `dist/index.html`: table UI, legacy engine, persistence, narration, physical animations, replay and setup.
- `dist/engine-v5.js`: deterministic mode engine, move validation and bot policies.
- `dist/sim-core.js`, `dist/simulation.worker.js`: comparison simulator running off the UI thread, including opt-in D.
- `dist/simulation-results.json`: reproducible bundled comparison, 120 games per mode.
- `tests/`: dependency-free rules, UI state, replay and regression checks. `original-v04.html` is the imported legacy parity fixture.
- `.openai/hosting.json`: existing ChatGPT Sites project and static directory.
- `docs/development-history.md`: prior implementation and QA notes.

## Validation and limits

`npm test` covers 100 complete games against the imported legacy engine, 90 complete new-mode games, six complete UI-state games, every insertion position, ability use, scoring, row and hand sizes, reloads, export payloads, replay and hidden-information isolation. A three-wave fixture scores ten points.

Local Chrome QA completed A against one bot and B against two bots. It exercised staged Swap, explicit Wild color, refresh, language switching, a two-wave six-point SHIFT move, the simulator Worker, and a 360px frame without page overflow.

Hosted Chrome QA completed on 2026-11-09 after owner sign-in: full B vs one bot (0–18), A vs two bots (0–24–30), and C vs one bot (9–24); restart, staged Swap surviving refresh, explicit Wild color, every gap for both board lengths, language switching, save/resume, and the two-wave six-point SHIFT scenario passed. Automatic playback returned to the next human turn with zero leftover flying-card elements. The hosted Worker completed another 30 games per mode (seed 1794232368). Browser download events confirmed both session JSON and simulation JSON exports. Downloaded file bytes were not independently re-parsed during this browser session. Android hardware touch/performance remains unverified. Simulations are bot evidence, not human enjoyment or commercial-readiness evidence. B offers more distinct scoring choices in the bundled sample without an extra rule; it is a playtesting hypothesis, not a proven winner.

## Push & Take experiment and limits

The implementation, reproducible bot comparisons, score reports, and blind-playtest gate are documented in [Push & Take experiment](docs/push-take-experiment.md). An additional 2,400 game matched-seed study found no decisive bot advantage for D; it slightly reduced next-turn scoring chances after zero-point turns. This is an **experiment to test with people**, not a validated improvement.

Run `node tests/push-take.cjs` and `node experiments/push-take/compare.cjs --games 400 --seed 91001 --output` for focused validation. This mode still uses the **virtual 360-card digital deck**, not physical printed-card stock. It is not automatically deployed with GitHub pushes and is not available in human online rooms.

## Deployment

The imported source matches the private Sites deployment identified in `docs/provenance.md`. This GitHub repository is a source copy, not an automatic deployment connection. GitHub pushes do not publish the site. Keep the existing Sites project, preserve its URL and private audience, and save a rollback version when deploying changes. Never commit authentication credentials or local browser data.

## Online human rooms, v0.8

The Friends tab creates a 2- or 3-player room in modes A/B/C (D is deliberately not enabled online) and produces a private invitation link. ChatGPT identity owns each seat; only that player's hand is sent to their browser. The exact v5 engine runs on the server, with optimistic revisions and idempotent commands preventing double moves. Polling synchronizes participants approximately every two seconds while visible. Reconnect/refresh resumes the same seat. Rooms expire after 24 hours. Solo progress remains under its existing local-storage key.

The site is still private. An invitation does not bypass the Sites access policy: the owner must grant each friend's ChatGPT email viewer access through Sites. No public access was enabled. Sharing the room link gives a permitted visitor a seat while the lobby has space. The host starts only when all 2/3 seats have joined. There is no bot substitution or seat transfer in online rooms.

The static site is now served by a dependency-free Worker with a D1 `DB` binding. Source: `worker/`; bounded schema migration: `drizzle/0000_spark_rooms.sql`. `npm run build` embeds the existing assets in `dist/server/index.js`; generated Worker output is ignored in Git. Node 24 is needed for the local SQLite test adapter and preview. `npm test` runs the original regression suite and six complete 2/3-player room games, including hidden-hand responses, all modes, abilities, score totals, concurrency, retries, origin rejection and room expiry.

`npm run dev` is a LOCAL-ONLY preview harness. The `/qa/one/`, `/qa/two/`, `/qa/three/` pages simulate distinct identities for browser QA. These routes, header interpretation and SQLite adapter are never included in the deployed Worker. Production uses only Sites-provided authenticated identity headers. Do not expose the development server as production.

Hosted room creation, persisted lobby after refresh and invite copying were verified through the actual signed-in private site. Browser QA with two simulated local identities completed an entire 16-move B game (final scores 0 / 3), exercising joining, independent hands, Swap, explicit Wild, reconnect and identical final results in both windows. A real second-account hosted game is pending friend access; do not treat local identity simulation as that test.
