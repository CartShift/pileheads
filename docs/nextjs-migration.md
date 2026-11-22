# STACK Next.js migration

## Goal

Move the browser interface to React + TypeScript + Next.js **without** changing gameplay rules or the authoritative multiplayer protocol. Protect the existing live Classic experience.

## Architecture

- `apps/web`: App Router, React tabletop, CSS/motion effects, responsive UI, lobby and local/online modes.
- `dist/pilehead/engine.js`: one authoritative deterministic rules implementation, reused in the new UI via `apps/web/lib/engine.ts`.
- `scripts/render-server.cjs` and `api/pilehead.js`: existing authoritative room server, WebSocket invalidation and Neon persistence.
- Card themes: canonical static sprite assets copied at dev/build time; no duplicate source assets.
- No PixiJS required for this prototype; use React DOM + CSS transforms first and measure on mobile.

## API security

The API only accepts a *single exact* additional browser origin set through `STACK_WEB_ORIGIN`. This covers CORS preflight and the WebSocket handshake, while preserving same-origin Classic support. Never use `*` for the Origin or expose DB secrets.

## Rollout gates

1. Build/TS validation and legacy `npm test`.
2. Verify local 2–5 seat games, bot turns, BURN, DUMP, SLAM and final-duel endgame.
3. Verify online room create/join/ready/start/reconnect/rematch on two real devices, including seat privacy and simultaneous SNAP.
4. Perform mobile layout, keyboard, reduced-motion and screen-reader QA.
5. Compare React responsiveness and physical-card feel with Classic; switch the default route only after sign-off.

The existing Render service and `/pilehead/` routes remain unchanged. The Next preview deploy is opt-in.
