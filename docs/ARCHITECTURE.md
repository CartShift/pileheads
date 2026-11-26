# STACK: technical architecture

STACK uses **one shared rules engine, one supported web presentation and one authoritative multiplayer backend**. The same Render Node process serves the Next.js static export and shared physical-game resources, the HTTP room API and authenticated WebSocket connections.

## System overview

```text
React tabletop (Next.js static export)
                |
       local shared rules engine
                |
       online commands over HTTP
                |
                   Node.js 24 / Render
                              |
                   /api/pilehead room API
                              |
             validate action against game engine
                              |
                 Neon PostgreSQL (room state)
                              |
                   committed room revision
                              |
              authenticated WebSocket update
                              |
                  connected React clients
```

In online rooms, the **server** validates legal actions and controls the current room state. Browser animations are a presentation of committed events, never an alternative game authority.

## Design decisions

### One canonical engine

- `packages/game-engine` owns rules, bot policy, versioned local snapshots, injected clock and shared types. The Node entry is free of browser global assignment.
- `dist/pilehead/engine.js` is a generated compatibility bundle; regenerate with `npm run sync:engine`, check with `npm run check:engine`.
- The Next app generates the same bundle into its browser build through `apps/web/scripts/sync-assets.mjs`, avoiding a second implementation of the rules.
- `api/pilehead.js` validates online moves with the engine, rather than trusting commands to contain a game state.
- Seeded simulations make unusual loops, endgames and balance changes reproducible.

### Real-time without surrendering consistency

- Players send authoritative commands through `/api/pilehead`.
- Room revisions prevent silently accepting conflicting stale moves; clients refresh on a rejected revision.
- Authenticated WebSockets at `/api/pilehead/live` notify connected players about committed updates and reactions.
- Polling remains a recovery/fallback channel. The WebSocket does not independently adjudicate moves.
- Private room responses expose only the information a particular seat is allowed to see. Session tokens are kept off invite URLs and persisted as hashes on the server.

This arrangement is especially important for **SNAP** and **SLAM**, where reactions to previous plays must not freeze the next player's turn.

### One web presentation, one deployment

- **Shared resources:** `dist/pilehead/` contains the original card sprites, print/gallery/rules pages and isolated Endgame Lab.
- **React:** `apps/web/` uses Next.js 16 (App Router static export), React 19, TypeScript and Motion.
- **Build:** `scripts/build-integrated.mjs` publishes shared resources and the Next export into one static output.
- **Runtime:** `scripts/render-server.cjs` serves those assets, `/api/pilehead`, `/livez` and `/readyz`.
- **Data:** Neon PostgreSQL holds multiplayer rooms; no database is required for local games.

A single origin avoids an extra frontend runtime and simplifies cross-origin configuration while redirecting retired Classic routes to `/play` for old invitations and bookmarks.

## Player experience and motion

The UI uses physical card metaphors, touch/drag controls and special-effect feedback to explain what happened. The motion layer follows the committed game event: DUMP transfers a visible pile to its recipient, BURN removes the pile, and a successful SNAP followed by four of a kind can show a combined SNAP + BURN sequence.

Animations must never reveal hidden opponent cards, duplicate committed cards, hold a turn open or make the outcome of a move ambiguous. Reduced-motion support and muted presentation remain valid modes.

See [motion QA and rollback](stack-motion-ux-release.md).

## Tests and operations

- **Rules and edge cases:** `tests/pilehead-engine.cjs` and focused regression modules.
- **Room privacy and concurrency:** `tests/pilehead-online.cjs`, realtime contract and browser acceptance suites.
- **React integration:** `tests/stack-single-service.cjs` and `tests/stack-next-browser.cjs`.
- **UX/visual safeguards:** tabletop interaction and motion tests, plus browser screenshot artifacts in CI.
- **Production smoke:** `scripts/check-render-production.mjs` compares the serving Render SHA with the released SHA and checks runtime/database/frontend readiness.

The live environment and real two-device gameplay require their own verification. A unit-test pass must not be described as proof of production availability.

## Engineering trade-offs

1. **A source directory named `dist`:** maintained for compatibility and historical links; generated output is `vercel-static/`. A future rename would be a separate, test-backed migration.
2. **Static Next.js export:** enables modern React component architecture without a second Next server, at the cost of relying on the existing Node API for dynamic state.
3. **WebSocket notifications + HTTP actions:** simpler authority and recovery semantics, but not a fully socket-driven game protocol.
4. **Private room identity:** appropriate for friend playtests, not a replacement for production-grade accounts, moderation or public matchmaking.
5. **Physical + digital products:** card artwork and physical rules remain important. Browser tests do not validate how an actual printed deck feels or how people understand the rules face-to-face.

For implementation details, see [online protocol](pilehead-online.md), [Next integration](nextjs-migration.md), [Render hosting](render-hosting.md), and [rules](pilehead-design.md).

## Mobile roadmap

See [mobile implementation plan](MOBILE-IMPLEMENTATION-PLAN.md). Native clients import the shared package; online views remain server-redacted. The initial npm workspace covers packages only; web retains its existing locked install until the Expo workspace migration is validated.

The [shared room protocol](../packages/game-protocol/README.md) contains only seat-redacted DTO types. The Next adapter re-exports these; its fetch, storage and browser lifecycle remain platform-specific. No transport or API contract change is introduced in Phase 1.
