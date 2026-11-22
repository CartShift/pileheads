# STACK Next.js table (single Render service)

The new React/TypeScript tabletop is exported as **static HTML, JS and CSS**
and served by the existing STACK Node.js server. Both versions share the same
domain, authoritative HTTP API, WebSocket server and Neon database.
**No second Render service, CORS setting or extra Next.js runtime is needed.**

## Local Next development

```sh
npm install --prefix apps/web
npm run dev --prefix apps/web
```

To use online rooms with the development server on port 3000, configure
`NEXT_PUBLIC_STACK_API_ORIGIN` in `apps/web/.env.local` to point at a
trusted backend and explicitly allow `http://localhost:3000` through
`STACK_WEB_ORIGIN` on that backend. Local bot matches need no server.

## One-server integrated build

```sh
npm install
npm install --prefix apps/web
npm run build
npm run test:integrated
node scripts/render-server.cjs
```

Routes on the **same** Node server:

- `/`: unchanged Classic landing page
- `/pilehead/index.html`: unchanged Classic simulator
- `/stack`: new Next landing page
- `/play`: new React game table; private-room links use `/play?room=CODE`
- `/api/pilehead`: unchanged authoritative room endpoint
- `/api/pilehead/live`: unchanged authenticated WebSocket
- `/_next/static/*`: fingerprinted assets from the static export

The root `npm run build` always builds Classic and Next together, regardless of
whether an existing Render service applies Blueprint changes. The deployment
workflow mirrors `main` to the existing Render-tracked branch. No new service
is involved. The new paths will appear there **only
after this PR is merged and the existing service deploys**. Until then the
live Classic site remains completely unchanged.

Next.js App Router handles the UI at build time and in the browser. No SSR
or standalone Next.js server is needed for these routes. The deterministic
engine continues to come only from `dist/pilehead/engine.js`; prebuild copies
it to the app's ignored `vendor/` so it bundles under Turbopack's root.

For testing locally, use Playwright via the Next web workflow, with a mock
Neon implementation and both browser and API bound to the same localhost
origin. This matches the actual deployment topology.
