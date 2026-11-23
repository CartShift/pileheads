# STACK Motion & UX 2.0: release and rollback runbook

**Source of truth:** [Epic #72](https://github.com/yotamon/spark-card-game/issues/72) and [physical event QA matrix](stack-motion-ux-matrix.md).

## Scope

- **Production Classic:** `/pilehead/index.html`. Preserve all engine, room, card-face, and responsiveness contracts.
- **React tabletop:** `/play`. New event-driven animations, motion preferences, explicit rule marker and optional sound.
- **Backend:** existing single Node/Render deployment, no new game authority, no added service or database mutation.
- **Legacy 3D beta:** retired independently on main. This release must not restore its files, routes or WebGL dependencies.

## Hard invariants

1. The server/game engine **commits before visual feedback**. Neither sound nor animation can postpone moves, SNAP or SLAM.
2. Never duplicate a committed played-card face or show a concealed card in an effect.
3. DUMP transfers only existing public pile cards to the server-confirmed recipient, not the DUMP card itself.
4. A successful SNAP that completes four is visually **SNAP + BURN**; blind failure reveals only the server-published face.
5. Optional Final Duel erodes one visible top card first, then transfers the remainder; classic default stays OFF.
6. No stale effects after another move, reconnect, undo, rematch or leaving a room. Do **not** cancel a legitimate animation on incidental mobile document scroll.
7. `prefers-reduced-motion` is honored even if a user picked Full; muted sound and quiet regular plays remain usable.

## Automated release checks

All commands must be run for the **same final head SHA**:

```bash
npm ci --no-audit --no-fund
npm test
npm run build
npm run typecheck --prefix apps/web
node tests/stack-single-service.cjs
node tests/stack-next-browser.cjs
node tests/pilehead-browser.cjs
node tests/pilehead-live-browser.cjs
```

Browser checks require pinned Playwright and Chromium; GitHub Actions workflows:
- **STACK regression gates**: physics/engine/room/privacy and build.
- **STACK browser acceptance**: original Classic rendering, responsive touch and network race.
- **STACK integrated Render acceptance**: actual Next build, same-origin API/WebSocket, 2-browser room, SNAP/SLAM, Final Duel, hand stress, game settings and visual cues.

Do not confuse a green test on an **earlier commit** with acceptance of a newer head SHA.

## Manual visual and physical-device gate

Capture at least:
- 360 × 740, 390 × 844, 430 × 932, landscape, and 1280 × 800.
- Hand sizes 1 / 3 / 10 / 20 / 30+, no shaking, missing touch targets, unreachable cards or overlapping player zones.
- Side-by-side two **real devices** in one room: BURN, DUMP to selected seat, SNAP, SNAP + BURN, SLAM, pickup, blind reject, reconnect and rematch.
- Balanced, Full, Reduced, OS reduced motion; muted/on sound; touch drag/tap/sort and keyboard focus.
- Use screen recordings to identify wrong direction, duplicate animations, poor performance or concealed identity leaks.
- Record browser/device details and measured frame pacing where possible. **Do not mark any of these checks done without real evidence.**

Release can be labeled *automated acceptance passed* without claiming physical-device QA.

## Deploy and rollback

1. Confirm all automated CI checks green on final SHA and PR cleanly mergeable.
2. Merge a reviewed PR into `main` via squash only after verifying no subsequent mainline changes affect it.
3. The repo's deployment workflow mirrors main to `feat/render-hosting-outage-fallback-20261120` while Render's service still watches that branch; `render.yaml` declares `main`. Verify actual Render service configuration before manually triggering anything.
4. Verify `/livez`, `/pilehead/index.html`, `/play`, loading a local game, WebSocket room join, and one remote move after successful deploy. Health checks alone do not prove user-visible gameplay.
5. If any visual or fairness P0 appears, revert only the UI PR/disable the faulty presentation cue; do **not** rewrite game rules, room revisions, DB schema or users' saved games.
6. Confirm the last known healthy Render deploy is serving before closing issue #71.

## QA record

Keep issue #71 open while any real-device checks or production smoke tests are unverified. Record exact SHA, workflow URLs and test evidence in #72 and the PR. Vercel status is unrelated to the desired Render deployment and can be blocked without implying a Render failure; do not deploy via Vercel.
