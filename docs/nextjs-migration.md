# Single-Render Next.js integration

## Decision

One Node.js service remains the only runtime:

- Classic static UI: unchanged `/` and `/pilehead/index.html`
- React UI: `/stack` landing and `/play` tabletop
- Existing game server: `/api/pilehead` and `/api/pilehead/live`
- Neon: same authoritative database, no migration required

The separate frontend Blueprint formerly proposed is no longer necessary.
Do not create `stack-next-preview`. Do not set an additional CORS origin for
same-origin deployed pages. The existing `STACK_WEB_ORIGIN` setting, if present,
is only relevant for explicitly trusted *external* development origins.

## Build

The existing `stack-card-game` service keeps its Node start command. The
`npm run build` root command performs the integrated build even if the service
ignores a changed Render Blueprint. The deployment GitHub Action mirrors `main`
to the currently Render-tracked branch `feat/render-hosting-outage-fallback-20261120`.
The integrated build does:
1. Generate the original Classic output through `build-vercel.mjs`.
2. Install Next dependencies when needed. Build `apps/web` with `output: "export"` and force `NEXT_PUBLIC_STACK_API_ORIGIN` to empty for same-origin transport.
3. Publish static Next routes + `_next` files into `vercel-static/`
   without touching root `index.html` or `pilehead/` assets.
4. The original `scripts/render-server.cjs` serves everything and retains
   the existing auth, room state, Neon and WebSocket behavior.

The Node server explicitly maps `/play[/]` and `/stack[/]` to their
exported HTML, and serves the Next router's route payload and hashed assets.
No SPA catch-all that could affect legacy routes is introduced.

## Deployment sequence

1. Open PR #57, verify the integrated CI build and browser acceptance.
2. Merge only after the tests and real phone QA are accepted.
3. The existing Render service builds from `main`; verify `/livez`,
   Classic, `/stack`, `/play`, and two-device private rooms.
4. Keep Classic as default until the new version is explicitly promoted.
5. Roll back the Render deploy if integrated routes fail; the original
   Classic site and room state were not changed.

## Production gates

- Classic end-to-end acceptance with existing URLs.
- Integrated browser tests exercise the *same-origin* HTTP API and socket.
- Manual multi-device QA on real Android/iOS hardware for drag/drop, reactions,
  DUMP, SNAP/SLAM, rematches and reconnection.
- A paid Render instance for reliable public multiplayer availability.

The Next preview is a product-development preview, not automatically
production-ready solely because CI is green.
