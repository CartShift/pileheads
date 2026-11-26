# STACK repository maintenance

## Current product

Only STACK/PILEHEAD is built and tested. The original repository name `spark-card-game` and the `pilehead` paths remain unchanged to avoid breaking Vercel settings, links, API imports and browser persistence. Rename separately only after deployment verification.

The canonical frontend lives in `apps/web/`. `dist/pilehead/` retains shared rules, artwork, physical-game resources and the isolated Endgame Lab; `vercel-static/` is generated and ignored.

## Workflow

- Use Node.js 24 and run `npm test`; this discovers all `tests/pilehead-*.cjs` tests.
- Run `npm run build` for the STACK-only deployment.
- `npm run simulate -- 120 4 20261113` runs diagnostics (games, players, seed), not proof of human fun or fairness.
- Keep `PILEHEAD_DATABASE_URL` only in the secure Vercel environment.
- Make behavior changes in PRs; validate source tests, actual mobile UI and live two-device games.

## Compatibility

The retired `/pilehead/index.html` URL redirects to `/play`, retaining query parameters. The Next homepage is served at `/`. Printable pages, `/api/pilehead`, the authoritative database and room protocol remain. Classic local saves and browser credentials are not automatically migrated into the React client.

SPARK/TILT prototypes, the Sites/D1 Worker and original simulation hub have been retired from the active source tree. Historical content is still accessible through Git history. Do not restore the old backends into the STACK deployment.

The raster sheet `stack-sheet.webp` and back `stack-back.webp` are active production assets, not generated garbage. `deck-art.js` supplies active semantics/compatibility; `deck-raster.js` provides visible sprites. Do not delete either layer without replacing every consumer and adjusting its tests.
