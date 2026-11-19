# STACK Card Game

STACK (internally still named **PILEHEAD**) is a physical-first, 52-card game with a browser tabletop, bot opponents, private multiplayer rooms, a deck gallery and printable playtest materials.

**Play:** `/pilehead/index.html` (site root redirects here).
**Deck gallery:** `/pilehead/gallery.html` · **Print:** `/pilehead/print.html` · **Official playtest kit:** `/pilehead/playtest.html`.

## Deck themes

Use the **Deck style** selector in the tabletop header, the deck gallery, or the print preview. Choose **STACK Original** (existing geometric sprite artwork), **STACK Characters** (the approved illustrated character deck), or **STACK Studio** (the original minimal vector illustrations). The selection persists per browser using `stack-deck-theme-v1` and also works in private online rooms without changing any shared game state or rules. Players may choose independently.

All 16 unique card faces use one 4 × 4 sprite index, with each illustrated character cell exactly 252 × 355 pixels. The default card back is shared between styles. Both raster sheets are kept as source assets under `dist/pilehead/assets`; `deck-theme.js` contains only preference/UI logic, while `deck-raster.css` selects the appropriate sprite. `npm run build` includes all themes.


## Development

Requires Node.js 24.

```sh
npm test                 # Every current STACK regression (rules, online, UX, graphics)
npm run build            # Produce the Vercel static directory
npm run build:vercel     # Alias for the same build
npm run simulate         # Diagnostic seeded bot simulation, JSON to stdout
npm run simulate -- 120 4 20261113
```

The static build goes to `vercel-static/`, which is gitignored. Vercel serves `api/pilehead.js` alongside the static files. To enable online rooms, securely configure `PILEHEAD_DATABASE_URL` on the Vercel project. Never commit credentials. See `docs/pilehead-online.md`.

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
| `scripts/` | Static builder, tests and simulations |
| `tests/pilehead-*.cjs` | STACK test suite |
| `docs/pilehead-*.md` | Game rules, deployment and design |

## Scope and safety

This repo now builds only STACK. Experimental SPARK and TILT apps, the separate Sites/Cloudflare Worker, and their tests were retired from current source. Historical sources remain recoverable via Git history. Existing ChatGPT Sites deployments are **not changed** by this cleanup.

The game retains its `/pilehead/` URLs, browser save keys, `/api/pilehead`, database schema and backward-compatible room handling. No card rule or multiplayer protocol changes are included. Passing source tests alone does not certify production multiplayer; test real devices, reconnect and rematch. See `docs/repository.md`.
