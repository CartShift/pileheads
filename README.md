# SPARK Simple+

Mobile-first Hebrew/English card-game playtesting prototype, hosted privately on ChatGPT Sites. Vanilla HTML, CSS and JavaScript, with no runtime dependencies or build step.

**Private playable site:** https://spark-simple-plus-yotam.yotamonf.chatgpt.site

## Run locally

Use Node.js 20 or newer for the tests. No dependency installation is required.

```sh
npm test
```

Serve `dist` over HTTP, for example with Python 3:

```sh
python3 -m http.server 4173 --directory dist
```

Open http://localhost:4173. Use HTTP rather than opening the HTML directly so the simulation Worker and bundled report load correctly.

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

## Source map

- `dist/index.html`: table UI, legacy engine, persistence, narration, physical animations, replay and setup.
- `dist/engine-v5.js`: deterministic mode engine, move validation and bot policies.
- `dist/sim-core.js`, `dist/simulation.worker.js`: comparison simulator running off the UI thread.
- `dist/simulation-results.json`: reproducible bundled comparison, 120 games per mode.
- `tests/`: dependency-free rules, UI state, replay and regression checks. `original-v04.html` is the imported legacy parity fixture.
- `.openai/hosting.json`: existing ChatGPT Sites project and static directory.
- `docs/development-history.md`: prior implementation and QA notes.

## Validation and limits

`npm test` covers 100 complete games against the imported legacy engine, 90 complete new-mode games, six complete UI-state games, every insertion position, ability use, scoring, row and hand sizes, reloads, export payloads, replay and hidden-information isolation. A three-wave fixture scores ten points.

Local Chrome QA completed A against one bot and B against two bots. It exercised staged Swap, explicit Wild color, refresh, language switching, a two-wave six-point SHIFT move, the simulator Worker, and a 360px frame without page overflow.

Hosted Chrome QA completed on 2026-11-09 after owner sign-in: full B vs one bot (0–18), A vs two bots (0–24–30), and C vs one bot (9–24); restart, staged Swap surviving refresh, explicit Wild color, every gap for both board lengths, language switching, save/resume, and the two-wave six-point SHIFT scenario passed. Automatic playback returned to the next human turn with zero leftover flying-card elements. The hosted Worker completed another 30 games per mode (seed 1794232368). Browser download events confirmed both session JSON and simulation JSON exports. Downloaded file bytes were not independently re-parsed during this browser session. Android hardware touch/performance remains unverified. Simulations are bot evidence, not human enjoyment or commercial-readiness evidence. B offers more distinct scoring choices in the bundled sample without an extra rule; it is a playtesting hypothesis, not a proven winner.

## Deployment

The imported source matches the private Sites deployment identified in `docs/provenance.md`. This GitHub repository is a source copy, not an automatic deployment connection. GitHub pushes do not publish the site. Keep the existing Sites project, preserve its URL and private audience, and save a rollback version when deploying changes. Never commit authentication credentials or local browser data.
