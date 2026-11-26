# PILEHEADS / STACK — Mobile & cross-platform implementation master plan

Status: approved direction, Phase 1 draft implementation; acceptance pending. Last updated: 2026-11-26.
Owner: product/engineering. Internal repository and package identifiers remain STACK until branding/domain/store IDs are confirmed. This is the living roadmap; mark a task done only with a commit and evidence. Do not confuse a proposed target with a shipped feature.

## Product vision and principles
Physical deck, instant-play web and native Android/iOS are three entry points to one game and community. QR/invite links open the installed app or fall back to playable web. Guest-first, offline bots, server-authoritative cross-play, fair competitive play, cosmetic-only monetization, accessible retro comic identity, low operational overhead. No WebView-only port, new game engine, second multiplayer backend, microservices, free-text public chat at launch, aggressive ads, or pay-to-win. Start with one matchmaking pool until population supports more.

## Baseline and dependencies
Main at ea5d940148d7d8b7f3fec71b4372c0c57e043dd7: deterministic JavaScript engine in dist/pilehead/engine.js, Classic browser UI, Next.js static export (apps/web; React 19, TS, Motion), Node 24 Render service, /api/pilehead HTTP authoritative moves + authenticated /api/pilehead/live WebSockets and polling fallback, Neon PostgreSQL room persistence. Existing deck assets and sound are canonical. Classic dist is maintained source, not disposable build output. PR #90 Counter Dump, #91 commercial foundation (guest profiles, OIDC, entitlements, test checkout, redemption, offline cache), #92 CircleCI and #96 homepage are open at planning time. Tournament work is a related stream; verify actual branch/status before integration. Never overwrite other work; retain legacy URLs, card IDs, serialized rules versions, existing sessions, and stable releases. A draft PR is not a deployment.

## Target architecture and decisions
- npm workspaces progressively: apps/web, apps/mobile, packages/game-engine, game-protocol, game-controller, multiplayer-client, design-tokens, card-assets, platform-services as warranted. Preserve current web install/build until lockfile and Render migration are tested. Avoid Nx/Turborepo initially.
- React Native + Expo + TypeScript, Expo Router, development builds; Android first for physical testing, iOS parity required. Use Expo SDK-compatible dependency versions at implementation time. Zustand/TanStack Query only if useful, Reanimated/Gesture Handler for motion, Skia only after profiling, Expo Audio/Haptics/Notifications/SecureStore/SQLite, Maestro, Sentry (privacy reviewed), EAS/local Android builds. No new paid services by default.
- Game engine owns rules, seeded randomness, legal choices, bots and game events; inject time, serialize/version local full state; no DOM, storage, networking or animation dependencies. Share types; distinguish trusted full state from redacted online views and wire-only blind slot commands. Never ship a server full state or hidden opponent cards to online clients.
- Client controllers consume committed events and implement local/remote adapters; visuals may acknowledge touches immediately, but not adjudicate a move. HTTP commands + revision-based WebSocket notifications and polling fallback; existing server remains authoritative. Keep current single Render service and Neon, expand only as measured.
- Shared design tokens/artwork/audio, platform-specific UI; do not force HTML components into React Native. Portrait-first is a hypothesis; test 2–5 players and small screens, consider landscape only if needed.
- Offline state local and unranked; server owns ratings, progression and purchase grants. No blind offline merge into ranked games.
- Security: random/secure server seeds, no credentials in bundle/logs, secure mobile credentials, privacy-filtered views, authorization/rate limits, idempotent actions/settlements, abuse prevention. Version protocol separately from rules and app builds.

## Roadmap and acceptance gates

### Phase 0 — audit & safety
- [ ] Inventory engine globals/time/RNG, state versions, bot semantics, web/Classic/server/build/test consumers, protocol/privacy, assets and pending branches.
- [ ] Establish baseline regression and build results (baseline npm ci --offline and npm test passed all 32 files on Node 24.22.0 in OpenDev; baseline build not yet run); record failures with exact commands and SHAs. Check Hermes compatibility (device validation in Phase 2).
- [ ] Document migration/rollback and version compatibility. No gameplay rule edits as part of refactor.
Gate: known dependencies, baseline, migration plan and no unexplained behavioral changes.

### Phase 1 — shared game core
- [x] Create @stack/game-engine package with single editable implementation and explicit exports; keep Classic browser compatibility (generated artifact with drift guard); adapt server and Next vendor/import path.
- [x] Move shared TS contracts out of web-only layer; preserve existing consumers; separate authoritative game and online DTOs, wire moves from local moves.
- [x] Inject clock without changing default time semantics; keep seeded RNG and version/card ID behavior; expose explicit serialization/validated restoration for trusted local saves; preserve RNG, pending DUMP, SNAP, SLAM, blind reveal and finished order.
- [x] Separate bot/rule/public API boundaries pragmatically without duplicating logic; preserve existing mutation semantics and documented public API.
- [ ] Parity: fixed-seed identical actions/events/states across Node, browser artifact and web adapter, fake clock, save/resume, 2–5 players, legacy rules/card IDs, conservation, invalid moves, privacy, all existing rule regressions. Existing experimental endgame lab is not the production source.
- [ ] Validate npm lock/install, Classic build, Next sync/typecheck/build, integrated HTTP/WebSocket smoke; CI scopes cover new package paths. Do not merge if regressions are unresolved; Hermes smoke remains explicit Phase 2 gate.
Gate: existing browser/server routes work, one canonical rule implementation, no semantic regressions, package import and types ready for mobile.

### Phase 2 — mobile foundation (v0.1 technical alpha)
- [ ] apps/mobile Expo Router, TypeScript, SDK/Metro/workspace config, Android/iOS IDs and versioning (confirm brand first), dev/preview/prod config, native development build, navigation/safe areas, boundaries, feature flags, local/secure storage, update/rollback policy.
- [ ] Import game engine in Hermes, create/play seeded game; install Android APK on real device; iOS build/test path, no secrets in client bundle.
Gate: installed device app runs the shared engine; no rules fork. 

### Phase 3 — mobile design system
- [ ] Retro comic visual identity from original assets, tokens for paper/ink/colors/type/spacing, reusable buttons/dialogs/sheets/cards/icons/avatars, empty/error/loading states.
- [ ] Asset registry with all existing deck themes and audio; optimize decode, caching, offline bundling; safe-area, accessibility labels, touch targets, contrast, reduced motion, mute/haptics toggles.
Gate: consistent design with web/physical deck, readable on small real devices, accessible without color or audio alone.

### Phase 4 — native gameplay
- [ ] Portrait 2–5 seat layouts; stock/central pile/burn pile, opponent counts, hand fan/large-hand scroll, sorting, tap and drag, multiselect, legal action cues, hidden/up/down cards, target picker, all current rules including SNAP, SLAM, Counter Dump once integrated, Final Duel and settings.
- [ ] Selection undo only before commit; onboarding/tutorial, game results and rematch. Event-driven draw/play/burn/dump/counter/snap/slam/victory motion, sound, optional haptics. No animation can block a legal move, reveal secrets or change outcome.
Gate: feature parity for stable rules, small-screen usability, real device playtest.

### Phase 5 — offline (v0.2 playable alpha)
- [ ] 1–4 bots, difficulty only after balance tests, save/resume across process death, local stats, local tournament/practice, offline artwork/audio. Test airplane mode and old save migration.
Gate: complete native game offline; no offline results in global rating.

### Phase 6 — cross-platform multiplayer (v0.3)
- [ ] Shared API/WS client, secure seat session, create/join rooms, mixed bots/humans, Web/Android/iOS cross-play. Revision and action IDs, idempotency, heartbeat/backoff, polling, stale snapshot recovery, protocol/version negotiation.
- [ ] Background/foreground, lock screen, Wi-Fi/cellular switch, network loss, reserved-seat grace/forfeit policy, no queued stale moves, timeouts/anti-cheat/rate limits. Server-only private state.
Gate: mixed physical-device rooms complete and rematch, disconnect/rejoin tested, no lost/duplicated committed moves or privacy leaks.

### Phase 7 — accounts & identity
- [ ] Extend #91 guest/identity/entitlement foundation (verify merged state); stable account IDs, Google OIDC, Apple sign-in where required, guest upgrade/link, secure session refresh/revoke, cross-device progress, avatars/usernames/privacy, account deletion, block/report. Avoid duplicate auth.
Gate: guest can play without sign-up, upgrade without data loss, account deletion and session security verified.

### Phase 8 — competitive platform (v0.4)
- [ ] Persistent tournament rooms, configurable round count/scoring/ties, scoreboard, rematch with accumulated points, atomic result settlement; quit/timeout/rejoin policies.
- [ ] Quick Play, one initial public queue, fair matching, ranked/ratings/seasons/leagues when population permits, history/statistics, achievements, XP, optional daily/weekly challenges, abuse/collusion safeguards. Separate room points, rank and XP; no arbitrary example scoring treated as approved.
Gate: deterministic scoring, idempotent results, fair handling of disconnects, measured wait times; no manipulation through bots/offline.

### Phase 9 — social & retention
- [ ] Friends, recent opponents, rematch, persistent private rooms, safe emotes, report/block/moderation, optional invite/tournament pushes, share results, cosmetic rewards and events.
- [ ] HTTPS Android App Links/iOS Universal Links, web fallback, QR on deck, no session credentials in URL. Opt-in notifications, quiet controls, no coercive streaks.
Gate: invites work installed/uninstalled, notifications opt-in, safety/report flow works.

### Phase 10 — commerce
- [ ] Shared server entitlement ledger/catalog; store purchase verification, idempotent grants, restore/refund/revoke, cross-platform inventory subject to store rules; web test checkout before live activation.
- [ ] Digital deck shop, cosmetics, physical store/QR, redemption policy reviewed; subscriptions/seasonal collections only after demand; optional ads last, never pay-to-win. Verify current Apple/Google payment and redemption rules before implementation, no Stripe digital checkout inside app by default.
- [ ] Pricing experiments (not approved prices): digital decks EUR 1.99–4.99, themes 4.99–9.99, optional premium 3.99/month, physical 14.99, editions 19.99–29.99, optional ad removal 3.99.
Gate: sandbox purchases/restoration/refunds tested on both stores, no real payment activation without approval.

### Phase 11 — quality & launch (v1.0)
- [ ] Regression/seeded simulations, TS/lint, API/WS integration, mobile component/E2E (Maestro), real device playtests across supported screens/platforms/network states, release evidence. CI path filters/caches, shared scripts, no native full builds per trivial PR; Android local/OpenDev when supported, iOS macOS/Xcode or EAS.
- [ ] Initial measured performance targets: typical supported device 60 FPS, cold launch <=3s, local touch feedback <=50ms, crash-free sessions 99.9% after stabilization. Measure install size, battery/memory, reconnect and matchmaking. Set device/network baseline.
- [ ] Icon/splash, screenshots/previews/listings, privacy/terms, age rating, data safety, deletion, accessibility, billing, signed AAB, Play closed testing and TestFlight, staged rollout/rollback. Confirm current store policies and fees, including eligible personal Play account tester requirement, before submitting.
Gate: store compliance, actual real device and production smoke evidence; no claim of release on unit tests alone.

## Product measurement
Opt-in/minimal telemetry; never log full hands, tokens or sensitive data. Define denominators and cohorts: time to first game, first-game completion, rematch rate, games/session, D1/D7/D30 return, tournament completion, invite conversion, matchmaking waits, reconnect success, crash-free sessions, purchase conversion. Prioritize first-game completion and voluntary rematch; avoid dark patterns. Review metrics after beta before adding monetization or new queues.

## Execution and tracking
Milestones: 0.1 engine + native APK; 0.2 offline playable; 0.3 cross-play; 0.4 competitive beta; 1.0 store-ready commercial. Track phases in PRs/issues with checkboxes, evidence (SHA, command, result, real-device evidence where needed), blockers and next action. Keep docs/ARCHITECTURE.md and README in sync. Merge small tested increments; coordinate pending PRs, especially #90 and #91. No deploy, production DB migration, new paid service or merge from a draft without passing gates. Roll back by reverting the phase PR and preserve the existing engine/browser artifacts and API wire contract. Update this document when decisions or scope change.

## Phase 1 implementation evidence (2026-11-26)
Baseline main ea5d940: npm ci --offline and npm test passed 32 files, 144/144 stress simulations. Initial package extraction, browser generator, shared types, clock, local snapshot codec and regression added in draft. Exact committed engine blobs were executed against the original engine in a V8 isolate (CommonJS shim): 48/48 games finished, 6,214 committed actions, 390 save/resume round trips, 65 SNAP/SLAM interruptions, 86 DUMP events/resolutions, 313 blind actions; all events/states equal. Generated Classic bytes match generator exactly; duplicate card snapshot rejected. This is focused migration evidence, not Node CI, Next build, browser or Hermes acceptance. GitHub fast-check run 45726331674 failed before exposing any job steps; cause unconfirmed. Full acceptance skipped for draft. OpenDev fetch job queued, complete checkout/build/regression not verified. No production changes.

Shared room DTO types extracted into @stack/game-protocol; web imports/re-exports them without changing HTTP/WS behavior. Reproducible parity runner: npm run test:engine-parity (requires original Git object). Keep Phase 1 gate open until full Node/Next/integrated checks pass and pending branches are reconciled. Hermes is Phase 2.
