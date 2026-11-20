# STACK Card Game

STACK (internally still named **PILEHEAD**) is a physical-first, 54-card game with a browser tabletop, bot opponents, private multiplayer rooms, a deck gallery and printable playtest materials.

**Play:** `/pilehead/index.html` (site root redirects here).
**3D beta (opt-in):** `/pilehead/3d-beta.html` · `/pilehead/3d-beta.html?online=1` for private multiplayer. The classic entry remains the default and the beta uses exactly the same game engine, rooms, and save keys. Three.js is loaded from a pinned CDN; if unavailable, the beta leaves the classic DOM cards playable. The Studio deck theme uses the classic 2D presentation inside beta.
**Deck gallery:** `/pilehead/gallery.html` · **Print:** `/pilehead/print.html` · **Official playtest kit:** `/pilehead/playtest.html`.

## Deck themes

Use the **Deck style** selector in the tabletop header, the deck gallery, or the print preview. Choose **STACK Original** (existing geometric sprite artwork), **STACK Characters** (the approved illustrated character deck), or **STACK Studio** (the original minimal vector illustrations). The selection persists per browser using `stack-deck-theme-v1` and also works in private online rooms without changing any shared game state or rules. Players may choose independently.

All 16 unique card faces use one 4 × 4 sprite index, with each illustrated character cell exactly 252 × 355 pixels. The default card back is shared between styles. Both raster sheets are kept as source assets under `dist/pilehead/assets`; `deck-theme.js` contains only preference/UI logic, while `deck-raster.css` selects the appropriate sprite. `npm run build` includes all themes.


## Development

Requires Node.js 24.

```sh
npm test                 # Every current STACK regression (rules, online, UX, graphics)
npm run build            # Produce the static assets served by Render
npm run build:vercel     # Legacy alias for the same build
npm run simulate         # Diagnostic seeded bot simulation, JSON to stdout
npm run simulate -- 120 4 20261113
```

The build outputs `vercel-static/` (historical folder name, gitignored). **Render is the production deployment target**: its Node server (`scripts/render-server.cjs`) serves these assets and the authoritative `/api/pilehead` endpoint. Commits to `main` auto-deploy via `render.yaml`. To enable online rooms, securely set `PILEHEAD_DATABASE_URL` in the Render service. The existing Neon database is retained, with no data migration. Never commit credentials. See `docs/render-hosting.md` and `docs/pilehead-online.md`.

**Game on Render:** https://stack-card-game-t7vx.onrender.com/pilehead/index.html


## Tabletop interaction contract

The simulator treats the cards as individual physical objects. **One tap selects one card**; further taps add matching copies, tapping a selected card deselects it, and tapping a different rank starts a new selection. During a valid final-hand/face-up combination, face-up selection automatically includes the required matching hand cards. The Play button, pile tap, keyboard pile activation, mouse drop and phone drag all normalize to the same engine-validated move. Escape clears a selection or cancels an uncommitted DUMP choice.

**SNAP never reserves or delays the next player's turn.** The SNAP button is the only opportunity prompt; the move remains possible until the next player commits an action. Local bots schedule once per turn rather than resetting their delay on incidental renders. Online rooms discard outdated poll responses, patch presence-only changes without remounting the card table, and show a pending state during authoritative submissions.

These guarantees are covered in `tests/pilehead-simulator-quality.cjs` alongside the existing engine, room API, mobile/table UX, art and build regression suites.

## Repository map

| Path | Purpose |
| --- | --- |
| `dist/pilehead/engine.js` | Rules, deterministic engine, conservation and bots |
| `dist/pilehead/app.js` | Local / hotseat tabletop |
| `dist/pilehead/online.js` | Private multiplayer UI |
| `dist/pilehead/immersive.{js,css}` | Shared physical presentation and motion |
| `dist/pilehead/deck-art.{js,css}` | Card semantics and SVG compatibility layer |
| `dist/pilehead/deck-raster.{js,css}` + `assets/` | Original and Characters 4 × 4 raster sprites and shared back |
| `dist/pilehead/deck-theme.{js,css}` | Persistent per-browser theme selector shared by game, gallery and print |
| `dist/pilehead/{gallery,print,playtest}.html` | Gallery, printing and controlled playtests |
| `api/pilehead.js` | Authoritative multiplayer room API |
| `dist/pilehead-sim-core.js` | Retained bot diagnostics, not a deployed browser dependency |
| `scripts/` | Static builder, Render Node server, tests and simulations |
| `render.yaml` | Render auto-deployment from `main` (existing Neon database) |
| `tests/pilehead-*.cjs` | STACK test suite |
| `docs/pilehead-*.md` | Game rules, deployment and design |

## Scope and safety

This repo now builds only STACK. Experimental SPARK and TILT apps, the separate Sites/Cloudflare Worker, and their tests were retired from current source. Historical sources remain recoverable via Git history. Existing ChatGPT Sites deployments are **not changed** by this cleanup.

The game retains its `/pilehead/` URLs, browser save keys, `/api/pilehead`, database schema and backward-compatible room handling. This v1.6 release changes the production deck from 52 to 54 cards by adding two BURN copies. Other action counts and all number-card counts remain unchanged. Existing 52-card rooms continue with their historical deck until rematch. Passing source tests alone does not certify production multiplayer; test real devices, reconnect and rematch. See `docs/repository.md`.

## Mobile UX clarity pass (21 November 2026)

The STACK table includes a compact mobile layout, safe-area-aware action controls, on-table quick rules, and a real **Learn with a bot** practice round. Active online rooms poll slightly faster while preserving authoritative validation. See `docs/ux-clarity-20261121.md` for acceptance tests and remaining push-transport/reactions work.

## Live rooms and social reactions

On Render, STACK now pushes room changes through a same-origin authenticated WebSocket while keeping game moves server-authoritative. Players can send five synchronized, rate-limited reactions. On reconnect or when WebSockets are unavailable, HTTP polling still restores the correct state; multiple Render instances reconcile using only shared room revisions and recent public reactions. The system does not require a new database or migration. See [the online protocol and operational limits](docs/pilehead-online.md).

The browser acceptance workflow runs **two independent mobile browser contexts** against the actual HTTP/WebSocket server and game engine with an isolated Neon test fixture. It checks seat privacy, socket auth, SNAP race, reaction delivery, reconnect and rematch. Live Render/Neon and physical-device QA remain separate from that automated test.
