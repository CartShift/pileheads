# STACK Next.js table (isolated migration)

This application is a Next.js / React / TypeScript table that reuses the **canonical** legacy game engine and the existing authoritative Render/Neon room protocol. It does not change the live Classic site or its database.

## Run

From the repo root:

```sh
cd apps/web
npm install
cp .env.example .env.local
npm run dev
```

Local bots work without a server connection. Online rooms require the existing Render service's `PILEHEAD_DATABASE_URL`, the browser's `NEXT_PUBLIC_STACK_API_ORIGIN`, and `STACK_WEB_ORIGIN` on that Render service matching the Next frontend origin, including scheme and port.

Use `npm run build` for production and `npm run typecheck` to validate TS. The `predev`/`prebuild` task copies only the existing canonical deck artwork. The game engine is imported directly from `dist/pilehead/engine.js`; do not fork rules into the Next app.

**Not yet a replacement for Classic:** treat `/play` as migration preview. Preserve the current Render service, URLs and save keys until behavior parity, desktop/phone QA, mixed-bot matches, reconnect, SNAP, SLAM, DUMP and setup have been accepted. No production auto-deploy is configured for this app.
