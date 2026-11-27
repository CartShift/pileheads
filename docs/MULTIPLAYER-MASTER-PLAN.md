# Pileheads Multiplayer — Implementation Master Plan

Status: phased implementation in progress; the release gates remain open. Owner-approved product direction; numerical defaults and technical choices below are proposals until verified. Updated: 2026-11-26. Repository: CartShift/pileheads (existing STACK/PILEHEAD internal identifiers remain for compatibility). This is the living multiplayer roadmap. Check off a task only with commit/PR and verification evidence; record changes to decisions here. 

## Sequencing with web experience

[Game Experience 4.0](GAME-EXPERIENCE-MASTER-PLAN.md) is the active product milestone. Stabilize and polish the web tabletop and private-room experience through GE-09 before broad tournament/competitive implementation or public rollout. Non-disruptive shared contract and safety work may proceed in parallel; this document owns tournament, scoring, identity, matchmaking and progression semantics. Do not duplicate Game Experience presentation work or treat its completion as multiplayer launch acceptance.

## Implementation evidence — 2026-11-28

The original roadmap below records the target architecture. This evidence section supersedes stale descriptions of the current baseline; it does not mark entire phases complete.

| Increment | Evidence | Release status |
| --- | --- | --- |
| Faster room synchronization / Frankfurt | [#174](https://github.com/CartShift/pileheads/pull/174) | Merged; actual live latency sample still required |
| Atomic room creation / join | [#179](https://github.com/CartShift/pileheads/pull/179) | Merged; disposable PostgreSQL and browser acceptance |
| Guest profiles and acceptance | [#178](https://github.com/CartShift/pileheads/pull/178), [#181](https://github.com/CartShift/pileheads/pull/181) | Merged; activation gated |
| Authoritative round receipts | [#180](https://github.com/CartShift/pileheads/pull/180) | Merged; 90-day retention, activation gated |
| Verified accounts and Google sign-in | [#182](https://github.com/CartShift/pileheads/pull/182), [#183](https://github.com/CartShift/pileheads/pull/183) | Merged; actual provider and HTTPS staging pending |
| Private account history and consent | [#184](https://github.com/CartShift/pileheads/pull/184), [#185](https://github.com/CartShift/pileheads/pull/185) | Merged; shared database grants and activation gated |
| Player data maintenance | [#186](https://github.com/CartShift/pileheads/pull/186) | Merged; approved operator cadence required |
| Private XP and achievement pilot | [#188](https://github.com/CartShift/pileheads/pull/188) | Implementation PR; see current checks and merge status |
| Public casual queue foundation | [#189](https://github.com/CartShift/pileheads/pull/189) | Implementation PR; no public endpoint or room assignment |

See [PLAYER-PROGRESSION.md](PLAYER-PROGRESSION.md) for private pilot tuning (10 XP per opted-in all-human round, 50 per UTC day, level increments of 100 XP). This is not the eventual ranked or public XP economy. See [PUBLIC-MATCHMAKING-QUEUE.md](PUBLIC-MATCHMAKING-QUEUE.md) for the initial two-human format and ready-check design. Do not equate queue acceptance with a playable public match. Next implementation slice: atomically consume a ready offer into one room, recover seat access across authenticated devices, then deadlines, moderation and Play Hub integration. Coordinate [#187](https://github.com/CartShift/pileheads/pull/187) for the shell. No paid dependency or public activation from these changes.

## Product vision

Every online room hosts a tournament, every tournament contributes to appropriate persistent progression, and every player can develop a competitive and social identity. The core loop is find opponents → play → see standings and memorable moments → finish tournament → see progress → voluntarily rematch or leave. Optimize for fun, fair competition, social connection and voluntary replay, not compulsive screen time. No forced streaks, lost earned rewards for inactivity, undisclosed bots, pay-to-win, paid random rewards or pressure to stay. Preserve frictionless friend invites, local/offline play, original card rules, retro comic artwork, mobile usability and accessible motion.

## Verified main-branch baseline and coordination

See [architecture](ARCHITECTURE.md), [online protocol](pilehead-online.md), [rules](pilehead-design.md), [Render hosting](render-hosting.md) and [release runbook](stack-motion-ux-release.md). Main has the canonical packages/game-engine and packages/game-protocol with generated dist/pilehead/engine.js compatibility bundle; Next.js static export (React/TypeScript) is the sole supported web frontend, Node 24 integrated Render service, Neon PostgreSQL, revision-checked HTTP room mutations (api/pilehead.js), seat-private projections, hashed seat tokens and authenticated WebSocket invalidations with polling fallback (scripts/realtime-hub.cjs). Rooms support 2–5 seats, humans/bots, setup readiness and same-room rematches. The current rematch replaces game state, not a durable tournament history; room expiration and bounded event history (96 persisted/24 exposed) need separation from long-term results. Existing room creation uses separate inserts and join/start are not a single lifecycle transaction; harden for public use. Server currently caps 200 WebSocket connections per instance; not a tested capacity. Render configuration is free tier with auto-deploy on main; no hosting capacity or live acceptance is inferred.

Related PRs at planning time (historical references): [#101 shared engine/protocol/mobile foundation](https://github.com/CartShift/pileheads/pull/101), [#91 commercial beta identity/entitlements/checkout](https://github.com/CartShift/pileheads/pull/91), [#90 Counter Dump](https://github.com/CartShift/pileheads/pull/90), [#92 CircleCI pilot](https://github.com/CartShift/pileheads/pull/92), [#96 homepage](https://github.com/CartShift/pileheads/pull/96), [#86 motion QA](https://github.com/CartShift/pileheads/pull/86). Their descriptions report incomplete verification; do not assume merged or shipped. Review latest status and coordinate before implementation. Reuse #101 canonical engine/protocol packages and #91 guest/OIDC/entitlement implementation if accepted; do not fork them. Reconcile Counter Dump and existing UX tests. Preserve existing internal paths and contracts; avoid mixing renames with feature work.

## Architecture and contracts

Modular monolith, one service and PostgreSQL initially; no new microservices, Redis or paid services without measured need and approval. Suggested domain modules: tournaments, identity, matchmaking, ratings, progression, achievements, social, seasons, cosmetics, commerce, analytics. Keep rules pure and independent of accounts/scoring/commerce. Share engine, DTOs and client logic between Classic, React and future React Native; no DOM or browser-only dependency in shared domain modules. Native implementation is coordinated with #101 rather than a second roadmap. Retain Node HTTP/WS transport, version additive DTOs and feature flags; old clients and active legacy rooms remain compatible or explicitly complete under legacy semantics. Client animations render committed events and never control gameplay; no hidden cards in spectators, logs, analytics or other seats' views.

Room is a persistent session container; Tournament is a bounded competition with a locked roster and immutable rules/config; Round is one engine game; a seat can be guest/account/bot. Room/session TTL is independent from durable historical records. Lifecycle: lobby → ready → round setup → playing → round results → next round setup (repeat) → final podium → rematch lobby or leave. Explicit aborted/forfeit outcomes. Joining during a competition is spectator-only or next tournament; no seat substitution in ranked except technical forfeit policy. Host handoff, leave, kick and expiration must not strand a room. Rejoin restores committed revision; no automatic enrollment into a new tournament. Private ready and rematch consent; ranked fixed rules and server-driven scheduling.

Suggested logical data model (reuse existing names/identity schema; actual migrations follow audit):
- pilehead_rooms, pilehead_members: live room state, revision, current tournament, seat/session.
- tournaments(id, room_id, format, rules_version, scoring_version, status, round_limit, roster/config snapshot, started_at, completed_at); tournament_players(tournament_id, seat, player_id nullable for bot/legacy, kind); rounds(id, tournament_id, number, status, starter_seat, result_version); round_results(round_id, seat, placement, points, outcome); unique tournament/round number and round/seat; one active tournament per room.
- players, player_identities, sessions; match history derived from finalized results; explicit guest-link ownership and deletion.
- game_events, event_outbox: durable server events and retryable delivery; unique event id and round sequence; bounded retention of sensitive/nonessential data; persist summaries not full hands every action.
- matchmaking_entries: one active ticket per player, expiration/lease, atomic claim and room assignment.
- player_ratings, rating_history (unique tournament/player/ladder); xp_ledger, player_progression (unique source/player/reward); achievements, player_achievements; friendships, blocks, reports, rivalries; clubs, club_members; seasons, season_standings; challenges, player_challenges; cosmetic_items, player_inventory, orders, entitlements, redemption_codes.

Transaction boundary: validate seat authorization, expected room revision and command id; execute deterministic move; commit CAS/lock update, terminal result, tournament points and outbox rows in one DB transaction (evaluate Neon transaction API or single SQL CTE; test real PostgreSQL). Unique result/idempotency constraints protect duplicate submissions and worker retries. A stale revision returns conflict with refresh path. Outbox consumers process at least once with idempotent effects, retry/backoff, dead-letter visibility and replay tools. Final results remain usable if XP/rating is pending; never fabricate it. Atomic durable finalization on transition to over, not on client rematch. Authoritative sequence and timestamp; payload allowlists; redacted public vs private projections. Realtime publishes committed revisions after transaction; polling recovers missed events. No unbounded JSON event logs or hidden-card telemetry. Server clock governs deadlines; restart recovery and competing workers must be safe.

Proposed API surface (names illustrative, adapt to existing /api/pilehead and shared protocol): create/join/state/ready/start/move/dump-target/advance/presence remain; additive tournament_config, standings, next_round_ready, tournament_rematch, leave, forfeit; player/session/profile/history; queue join/cancel/status/accept; rating/leaderboard; progression/achievements; friends/blocks/reports; seasons/challenges; catalog/inventory/redemption. Each command validates schema, seat/role, lifecycle, rule version, revision and idempotency. Versioned typed errors, retry semantics, cursor pagination. Native auth/WS handshake planned alongside mobile protocol; no tokens in invitation URLs.

## Tournament and scoring specification

Initial proposal, configurable/versioned:
| Format | Rules |
| --- | --- |
| Quick Battle | 1v1 first to 2 wins, max 3 decisive rounds; 3–5 players 3 fixed rounds |
| Classic | 5 fixed rounds |
| Grand | 10 fixed rounds |
| Endless Table | Unranked cumulative standings, explicit end/reset; no automatic ranked rewards |
| Custom | Private configurable round count/rules; no ranked rating |

All seats receive N minus 1-based finishing position (2 players: 1/0; 3: 2/1/0; 4: 3/2/1/0; 5: 4/3/2/1/0). Full valid round totals N(N-1)/2; first place is first to shed all cards, last is Pilehead. Consume canonical finishedOrder and loser, validate a complete permutation (append last seat only if engine omits loser by contract); never trust client placements. Fixed-roster points do not change with disconnections. Tie-break by first-place count, then shared rank by default; optional predeclared playoff for private formats, not surprise infinite tie-breakers. Ranked ties must be supported by rating model. First starter randomized by server; previous round winner starts next per current rule. Measure potential starter advantage before ranked rollout; version alternate policy only if needed. Decide cancellation/forfeit placement and rating policy before public launch: don't award artificial wins to all remaining players or erase completed rounds. Private bots count in table score but never rated; any assisted/replaced ranked player handled as documented forfeit, not disguised human. No card-rule changes merely to implement tournaments.

Example four-player 3-round results A/B/C/D: round1 3/2/1/0, round2 0/3/2/1, round3 3/0/1/2; totals 6/5/4/3. Champion A. Each round totals six; a replay must not alter totals.

## Implementation backlog and gates

All tasks unchecked until evidence is linked. Dependencies: P0 → P1 → P2 → P3 → P4/P5 → P6/P7 → P8. Security, privacy, analytics, accessibility and operational testing run from P0, not deferred to P9. Start with private tournaments; public queue initially one format to avoid fragmenting a small player base.

### P0 — Engineering foundation
- [ ] P0.1 Inspect latest main, open PRs/branches, mobile/commercial plans, existing migrations and contracts; record integration order and baseline SHA.
- [ ] P0.2 Run existing npm test, build, typecheck, integrated API/WS and focused browser baseline; record failures rather than masking them.
- [ ] P0.3 ADRs: domain boundaries, transaction strategy, idempotency, event schema, privacy, feature flags, room TTL, versioning and compatibility.
- [ ] P0.4 Define migration/backfill/rollback plan, isolated test DB, typed contract fixtures and observability.
- [ ] P0.5 Coordinate canonical engine/protocol extraction, CI script reuse and existing release gates. No parallel duplicate implementations.
Gate: baseline evidence, documented dependency map, accepted contracts and migration strategy; no gameplay regressions.

### P1 — Tournament foundation (Release 1: Tournament Edition)
- [ ] P1.1 Pure tournament state machine, scoring, tie-breaks, termination and configuration validation; table-driven/property tests across 2–5 seats.
- [ ] P1.2 Add durable tables/constraints and atomic round finalization plus event outbox; backfill only valid known data, never invent legacy history.
- [ ] P1.3 Wire room API, readiness, next-round and rematch concurrency, host handoff, expiry/recovery; support private humans/bots and legacy clients.
- [ ] P1.4 Classic and React lobby settings, compact expandable standings, round X/Y, active leader, clear setup/ready flow, next round and leave.
- [ ] P1.5 Round result comic panel, score delta, biggest burn/comeback/counter where verified; final podium, shared ties, rematch consent and room continuity.
- [ ] P1.6 Instrument funnel and replay metrics; test short/long/endless/custom formats, disconnect at finish, simultaneous requests, crash/restart, expired room, bot seats, SNAP/SLAM and DUMP regressions.
Gate: complete 2–5-player private tournaments (including ten rounds and mixed bots), durable correct scores after restart, no duplicate results, two-device acceptance, compatibility and rollback. Suggested implementation branch feature/tournament-foundation after reconciliation.

### P2 — Player identity (Release 2 foundation)
- [ ] P2.1 Reuse accepted commercial guest/OIDC identity where possible; compare proven email provider, no homemade passwords. Guest private/public casual play without login; verified persistent account for ranked.
- [ ] P2.2 Stable IDs, unique normalized handle, display name, approved avatars, secure sessions, account linking/merge transaction, guest progress migration and cross-device restore. No identity takeover or duplicate reward.
- [ ] P2.3 Profiles, match history, per-mode stats, rating/XP slots and privacy controls; deletion/export, data retention policy and account recovery.
- [ ] P2.4 Connect invitations and seat tokens safely to persistent identity; legacy guest room remains functional.
Gate: guest can play immediately, secure account claim preserves valid progress, two devices sync, authorization and deletion/merge tests pass.

### P3 — Public multiplayer (Release 2: Online)
- [ ] P3.1 Play Hub: Quick Play, Friends, Practice; ranked hidden until ready. Public lobby/queue with honest wait state, cancel, optional practice while waiting; no fake bots.
- [ ] P3.2 PostgreSQL matchmaking with atomic ticket claim (locking/lease), ready check, expiry, reconnect, no dual rooms, no blocked pairing. One initial public format, select based on human playtest/queue supply.
- [ ] P3.3 Authoritative deadlines and reconnect policy, automatic server bot progression where allowed (not dependent on a particular client), away/AFK, graceful forfeits, restart recovery.
- [ ] P3.4 Public report/block/mute, username moderation, rate limits, preset reactions; no public free-text chat initially. Spectator privacy groundwork.
- [ ] P3.5 Multi-device/mobile responsive UX, errors, empty queues, queue stats and load tests.
Proposed defaults: 30s turn, warning at 10s, 90s reconnect grace, 20s public ready check. Define setup/DUMP deadlines, allowed auto-action and interaction with SNAP/SLAM before enabling; timers server-side and cannot be reset by reload. No ranked bot replacement. Gate: real public matches complete without stranded seats or concurrent assignment; abuse and outage recovery tests.

### P4 — Competitive Arena (Release 3)
- [ ] P4.1 Ranked eligibility, immutable ruleset, standard tournament format and separate ladders for 1v1 vs multiplayer (only enable when population supports them); no friend/bot/practice games rated.
- [ ] P4.2 1v1 Elo initial candidate: start 1000 or calibrated placement estimate, K=32 trial, E=1/(1+10^((Ropp-R)/400)), delta=K*(S-E), S=1/0.5/0. For 3–5 players evaluate placement-aware OpenSkill/TrueSkill or normalized pairwise model via simulation; no library selection until verified.
- [ ] P4.3 Provisional placements, rating snapshots and immutable rating history; atomic batch update with stable lock order and one reward per tournament, version algorithm, audit/reversal path. Distinct rating/XP/table points.
- [ ] P4.4 Match by rating then widen ranges with time (example ±50 first 10s, ±100 to 25s, ±150 to 45s, ±200 to 60s); cap unfair spread and offer cancel/casual. Never silently switch ranked to bot.
- [ ] P4.5 League UI and global/friends/format leaderboard; provisional names and thresholds Rookie <1000, Troublemaker 1000, Card Shark 1200, Pile Master 1400, Pile King 1700, Pile Legend 2000. Calibrate to population; avoid deceptive progression.
- [ ] P4.6 Integrity: detect suspicious repeated pairings, collusion, smurfing, boosting and deliberate losses; review/appeals, no automatic ban solely from weak heuristics.
Gate: simulated and human rating calibration, zero duplicate settlement, explicit forfeits/ties, ranked privacy and fair matchmaking; leaderboard reflects finalized results.

### P5 — Progression & achievements (Release 3: Arena)
- [ ] P5.1 XP ledger and level curve; proposals public round completed 20, win bonus 15, tournament complete 40, win bonus 50, regular/rare achievement 25/100, weekly challenge 150; next-level requirement 100+25*current level. Tune and bound private/practice rewards; no rewards for farming or forced streaks.
- [ ] P5.2 Durable event schema (id, tournamentId, roundId, playerId/seat, sequence, occurredAt, type, allowlisted payload); map committed engine events before bounded UI history truncation.
- [ ] P5.3 Generic versioned achievement definitions and idempotent unlocks; categories mastery, competitive, comeback, social, collection, seasonal, secret. Preserve earned awards on rule changes.
- [ ] P5.4 Initial catalog: Pyromaniac (3 burns in a round), Return to Sender (Counter Dump), Snap Attack (5 legal snaps in separate rounds), Great Escape (win after holding ≥15 cards), Untouchable (win every round in completed tournament), Against All Odds (win with last blind card), Social Butterfly (25 distinct eligible opponents), Comeback Kid (win after last place halfway). Define exact eligibility and event semantics; Counter Dump dependent on #90.
- [ ] P5.5 Profile stats, levels, rating history, titles/badges, unlocks, progress summaries; highlight improvement without shaming losers.
Gate: duplicate and out-of-order events safe, replay reconstructs ledger, profile totals consistent, cosmetics have no gameplay advantage.

### P6 — Social & community (Release 4 foundation)
- [ ] P6.1 Recent opponents, friend requests/accept/remove, invitations, challenge and rematch; privacy and blocks respected everywhere.
- [ ] P6.2 Rivalries and head-to-head histories, per-format records, mutual consent for direct challenges; no harassment loops.
- [ ] P6.3 Approved comic emotes/reactions, opt-out/mute, moderation and report handling.
- [ ] P6.4 Spectator role and safe redacted state, ranked anti-collusion controls/delay if required; no hidden hand/seed or privileged socket access.
- [ ] P6.5 Clubs, member roles, private leagues and friend leaderboards, discoverability/privacy, moderation and shareable profiles.
Gate: block/report tests across queues, invites and spectators, no private state leakage, community moderation operational.

### P7 — Live operations (Release 4: World)
- [ ] P7.1 Data-configured seasons (6–8 week hypothesis), versioned schedules, timezone-safe transitions, soft rating reset policy, season snapshots, Hall of Fame and cosmetic awards.
- [ ] P7.2 Optional daily/weekly challenges, event-based progress and idempotent claim; no penalty for missed days. Include Counter Dump and tournament wins only where available.
- [ ] P7.3 Daily Puzzle from deterministic engine state; validate legal solution, define known information and success condition, no false unique solution under hidden randomness.
- [ ] P7.4 Live tournaments with registration, check-in, qualification/final brackets or placement structure, no-show and cancellation policy, time zone display; operator tools and audit trail.
- [ ] P7.5 Special rules events with explicit ruleset version, calendar, event lifecycle and safe recovery.
Gate: fake-clock tests for transitions, no duplicate season rewards, event completion/cancel recovery, no need to deploy each content update.

### P8 — Digital economy (Release 5: Collection)
- [ ] P8.1 Reuse commercial catalog/entitlements from #91 when accepted; versioned cosmetic items, inventory and equipment validation. Deck themes, backs, avatars, tables, effects, emotes and collectibles. Free default and readable consistent card ranks.
- [ ] P8.2 Unlock sources, physical deck redemption codes (single-use, hashed, rate-limited), optional clubs tools and season pass with transparent fixed rewards.
- [ ] P8.3 Storefront, checkout, verified payment webhooks, atomic entitlements, refund/revocation and fraud support; test mode only until merchant/legal approval. Native purchases must follow applicable store rules.
- [ ] P8.4 Price/availability/ownership UI, restoration across devices, operator audit, no paid competitive advantage or paid random rewards; no sensitive payment data in game DB.
Gate: end-to-end sandbox purchase/refund/redemption, duplicates/chargebacks/ownership handled, consumer and age/privacy review, explicit approval before live billing.

### P9 — Production readiness (continuous; final commercial gate)
- [ ] P9.1 Threat model and security audit: authority, injection, session/seat theft, private views, seed exposure, rate limit, trusted proxy/origin, abuse, payment and moderation.
- [ ] P9.2 Data privacy and retention, youth/family safety, age policy and consent where required; jurisdiction-specific legal review before public commercial launch.
- [ ] P9.3 Capacity/load tests with 2–5 seats, WS reconnect storms, DB failure/restart, concurrent matchmaking and events; record p50/p95, errors, resource/cost envelope.
- [ ] P9.4 Accessibility (keyboard, screen reader, contrast, reduced motion, touch), mobile Android/iOS physical devices and independent real-human playtest.
- [ ] P9.5 Monitoring: errors, queue lag, room revisions, stuck rounds, outbox backlog, rating/XP anomalies, DB readiness and alerts with low idle cost; backups and restore drill, operator playbook.
- [ ] P9.6 Staged release, feature flags, backward-compatible expand/backfill/contract migrations, rollback and production smoke; verify serving SHA; no unapproved paid upgrade.
Gate: evidence for all relevant gates, no critical regressions or hidden state exposure; public ranked requires awake reliable hosting and measured capacity. A passing CI run alone is not production acceptance.

## Experience and design requirements

Screens: Play Hub; Create Tournament; Lobby; in-game standings; round results; podium; rematch; account/linking; profile/history; queue/arena/leaderboards; achievements; friends/rivals; challenges/seasons; spectators/clubs; collection/store; operator dashboard. P0 priority for tournament surfaces; P1 for identity/queue/ranked/progression; P2 for social/live ops; P3 for commerce. In-game standings compact on mobile, expandable without covering hand; show round and point delta, explain score; optional short result animation, skip/reduced motion, clear next/leave actions. Profiles show rounds, per-format win rate, tournament wins, rating history, XP, special-action stats and titles. Preserve original comic design system and card assets rather than generic dashboard styling. No text spam; highlight committed special moments. React/Classic parity for tournament functionality; avoid duplicating full shell if agreed compatibility strategy provides a clear path; shared contracts for native.

## Analytics and success criteria

North star: weekly unique human players who voluntarily return and complete another eligible tournament (define cohort and window before launch). Funnel: hub_opened → queue_joined/room_joined → tournament_started → round_completed → tournament_completed → rematch_accepted / later return. Define D1/D7/D30 return by calendar/cohort and distinguish guests/account linkage; tournament completion = completed/started, rematch rate = accepted new tournament/eligible completed sessions, rounds per session, queue p50/p95, abandon vs outage/forfeit, invite/friend conversion, human vs bot split. Track balance: duration/round, starter seat advantage, placement distribution, Burn/Dump frequency, comeback rate, endgame stalls. Server records authoritative events, clients optional consented UX telemetry; pseudonymous identifiers, no hidden cards or unnecessary PII. Baseline with real playtests; targets are not established facts. Segment by mode, seat count, ruleset, device and cohort. Measure player satisfaction and voluntary replay alongside retention, not raw minutes alone.

## Verification and CI

Use existing npm scripts and shared checks rather than duplicating CI: npm test, npm run build, npm run typecheck --prefix apps/web, npm run test:integrated, npm run test:pilehead-online, focused UI/browser and seeded simulations; reconcile mobile parity checks after #101. Add unit/property tests for scoring and rating, isolated PostgreSQL transactional tests, concurrent duplicate commands, public API/WS multi-client tests, two-device real gameplay, accessibility/visual tests, load/fault injection and payment sandbox tests. PR fast relevant checks; main regression/build; release full browser/security/load and serving-SHA smoke. #92 CircleCI pilot not proven; avoid redundant reruns or cron costs. Use exact tested commit and log results, including failures and unrun gates.

Mandatory adversarial acceptance: 5 players × 10 rounds; first/last placements and ties; simultaneous next round; disconnect exactly on finish; restart between commit and outbox; worker duplicate delivery; stale command and forged result; guest-link race; ranked abandonment; two queue workers competing; hidden cards/seed spectator access; bot substitution; missed WS message; SNAP/SLAM/DUMP/Counter Dump under latency; same-room new tournament retains previous history; old-client compatibility; daily/season boundary; payment webhook duplicates/refund. Test actual database transaction semantics, not only mocks.

## Release sequencing and governance

R1 Tournament Edition (P0–P1), R2 Online (P2–P3), R3 Arena (P4–P5), R4 World (P6–P7), R5 Collection (P8). P9 gates apply continuously; don't activate unreleased features. No hard timeline estimate until scope and dependencies are validated. Use small independently reviewable PRs, with feature flags off by default and no production DB migration without verified backup/rollback. Each PR includes task IDs, migration/compatibility impact, tests and manual acceptance status. Docs-only changes should avoid unnecessary deploys where CI/hosting policy permits.

Definition of done: logic, migration, API/docs, UI desktop/mobile, loading/empty/error states, accessible motion, auth/privacy, telemetry, automated tests, actual multiplayer sync evidence, documentation, deploy verification and rollback (as applicable). Explicitly mark unverified rather than claiming complete.

## Decision register (pending validation)

| ID | Decision / default | Validation |
| --- | --- | --- |
| D01 | Fixed-roster linear points; first places tie-break; shared ties | Human playtests; property tests |
| D02 | 3/5/10 rounds; quick 1v1 best of 3; private endless/custom | Completion and voluntary rematch |
| D03 | Prior winner starts next | Measure starter advantage |
| D04 | 30s turn / 90s reconnect; timeout/forfeit semantics TBD | Simulated network and human tests |
| D05 | One public format initially; separate ladders later | Queue demand and matchmaking fairness |
| D06 | Elo 1v1, placement-aware multiplayer model TBD | Simulation and calibration |
| D07 | XP amounts, level curve and league names/thresholds proposed | Abuse and economy testing |
| D08 | 6–8 week seasons, soft reset details TBD | Population and engagement |
| D09 | Existing Render/Neon, no extra service initially | Capacity and cost tests; free sleep blocker |
| D10 | Reuse identity/entitlement and engine/protocol PRs | Inspect current branches and acceptance |
| D11 | Guest casual, verified ranked; provider/age/consent policies TBD | Security and legal review |
| D12 | Cosmetic-only monetization, no public free chat initially | Safety and product review |

## Execution log

2026-11-26: roadmap documented from approved product direction and main/PR inspection. No feature code, migrations, live services, CI verification or production deploy performed as part of this documentation change. Next: reconcile #101/#91/#90/#92 and establish P0 baseline, then implement P1 in a dedicated branch. Update checkboxes and this log with verified PRs and release evidence.

2026-11-26 integration update: Blacksmith (#106), Classic retirement (#104) and shared mobile foundation (#101) were merged after successful fast and full acceptance. Counter Dump (#90) was already merged. The homepage V3 assets and UI are present in the newer unified design system; retain the current styles, accessible navigation and retired Classic redirect rather than restoring obsolete Classic links. Hosted deployment and commercial release gates remain separately verifiable. Native applications and multiplayer roadmap features are not thereby implemented.
