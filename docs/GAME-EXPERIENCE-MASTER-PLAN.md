# PILEHEADS — Game Experience 4.0 master plan

Status: approved product direction; implementation and acceptance pending. Updated 2026-11-26.
Owner: product/engineering. This is the active experience roadmap and a living execution checklist, not a claim of commercial readiness. Internal STACK identifiers remain compatible.

## 1. Objective and scope

Turn /play from a functional playtest tabletop into a polished, tactile, instantly understandable digital card game that people voluntarily want to replay. Prioritize web quality before native app development or broad public competitive rollout. Preserve the physical deck, existing rules and frictionless private-room invitations. Quality is measured by human comprehension, enjoyment, accessibility, stability and responsiveness, not feature count or time spent.

Do not replace Next.js/React/Motion with a game engine, restore Classic, introduce a second game authority, redesign the canonical card faces, change gameplay balance as part of presentation work, or add paid infrastructure without evidence and owner approval. Use the existing single Render service and Neon. Native implementation can reuse the improved domain boundaries and design assets later.

## 2. Evidence and baseline (2026-11-26)

Audited main: [fa6074f](https://github.com/CartShift/pileheads/commit/fa6074fa38927e80901af5e0e6d763b203ac3c7f).

| Area | Verified in source or existing CI | Remaining uncertainty |
| --- | --- | --- |
| Rules | packages/game-engine canonical; generated compatibility bundle; shared game-protocol; Counter Dump #90 and shared core #101 merged | Exact release candidate parity and hardware acceptance |
| Web | Next /play sole supported tabletop; Classic retired; legacy game URL redirects | Visual and touch quality on current live build |
| Presentation | committed-event motion-core, MoveTheater, useCommittedCardTravel; regular play and local draws, specials, blind flip; motion preferences | Whole-round choreography, real frame pacing, comprehension and Counter Dump differentiation |
| Controls | tap/drag/sort, adaptive hand, public pile/opponent inspection, practice coach, keyboard, rematch | Legal-action affordances, accessibility, actual thumb reach and large-hand readability |
| Sound | nine branded MP3s, synthesized fallback, opt-in, committed sound cursor | Audio unlock/failure recovery, distinct counter/deal/result cues, mix, optional platform haptics |
| Online | authoritative HTTP commands, revision checks, authenticated WS, fallback polling, private rooms 2–5, mixed bots and reactions | Actual human devices, network resilience, latency, interrupt UX |
| Maintainability | game-table.tsx 1,411 lines; globals.css 998 lines; existing presentation modules | Extract responsibilities, measure rather than assume performance problems |
| Brand | illustrated deck and canonical homepage design tokens; tabletop dark felt intentionally selected in previous design system | Prototype more cohesive comic tabletop; do not assume felt itself is a defect |

Evidence: [fast checks on main](https://github.com/CartShift/pileheads/actions/runs/45739343916) passed; [full acceptance on PR #86 head 8b792e2](https://github.com/CartShift/pileheads/actions/runs/45738101941) passed (actual Node and Chromium, mocked Neon, 3/5-seat rooms and screenshots). This is not a new full test on main. [Render verification](https://github.com/CartShift/pileheads/actions/runs/45739344065) failed: mirror update succeeded but after 21 attempts the serving SHA remained 1a65fdb95be2 rather than expected fa6074f. Actual current production status must be checked afresh; this is not proof of downtime. Browser screenshots were generated but not visually inspected during the source audit. Physical Android, human multi-device, comprehension and performance checks remain open in #71. Do not assign a visual quality score based on source code.

Dependencies: [architecture](ARCHITECTURE.md), [motion implementation audit](stack-motion-ux-implementation-audit.md), [motion matrix](stack-motion-ux-matrix.md), [release runbook](stack-motion-ux-release.md), [design tokens](stack-unified-design-system.md), [rules](pilehead-design.md), [Classic retirement](CLASSIC-RETIREMENT.md), [CI](CI.md), [repository readiness #103](https://github.com/CartShift/pileheads/issues/103), [existing motion epic #72](https://github.com/CartShift/pileheads/issues/72) and issues #65–71. Reuse those issues and evidence rather than duplicating the same work. #91 commercial beta remains open, not part of this milestone.

## 3. Execution order

P0 = blocks credible experience work/release; P1 = required web experience milestone; P2 = optional follow-up. Phases below are execution order, not calendar estimates. QA runs in every phase. Start with a small PR per coherent slice; do not combine infrastructure, rules and visual redesign in a single change. All unchecked tasks require evidence. Suggested owners are roles, not assigned staff.

### GE-00 — Production baseline and deployment (P0, engineering)

- [ ] Inspect live Render service, tracked branch, auto-deploy history, build logs, actual serving SHA and readiness. Distinguish cold start, stale branch, slow build, credentials and smoke contract failure; no blind restarts or DB changes.
- [ ] Reconcile deployment workflow and current Next-only route contract, including obsolete Classic checks. Verify legacy invite URL redirects preserve query parameters. Reuse existing provider-neutral CI and Render service.
- [ ] Record exact main/candidate and production SHAs, rollback target, /livez, /readyz, /play asset load, local play, actual private room join and one remote move. Check CI logs and live service separately.
- [ ] Run relevant locked install, core parity, typecheck, integrated build and acceptance on candidate; do not treat older PR success as final SHA success.
- Gate: known reproducible deployment, verified serving SHA, documented rollback, no unexplained red CI. If production unavailable, keep local design exploration separate and label all live-dependent findings blocked.

### GE-01 — Experience baseline and visual QA (P0, design + engineering)

- [ ] Record current /play lobby, first setup, normal turns, all specials, interrupts, blind play, loss/win, rematch, reconnect and errors, with before screenshots/video and exact SHA/device.
- [ ] Use existing stack-next-tabletop-visuals CI artifact and tests/stack-next-browser.cjs; capture fresh reference on 320/360/390/430px-class mobile, landscape and desktop 1280x800, 2–5 seats and hands of 1/3/10/20/30+ cards. Real devices are additional, not simulated by Chromium.
- [ ] Compare representative experience to commercial card-game conventions (not copied assets/layouts); inspect hierarchy, legibility, visual grammar, touch targets, state changes, mental load, sound and frame pacing.
- [ ] Observe at least a small formative group of unfamiliar players; record first move, rule confusion, wrong taps, action comprehension and desire for another round. Ask consent, avoid recording private data.
- [ ] Prioritize findings by correctness/fairness P0, task-blocking UX P1, and decoration P2. Update #65/#71 and #103.
- Gate: reviewable baseline corpus, actionable backlog and agreed visual direction. No redesign before seeing the baseline.

### GE-02 — Modular tabletop boundaries (P1, engineering; after GE-01 baseline)

- [ ] Extract pure view selectors (legal cards/groups, stage, targets, next turn, hand layout) and test against existing engine/legal DTOs; no second rules engine.
- [ ] Separate local game controller, room transport/session lifecycle, input/selection controller and presentation preferences from GameTable. Keep browser localStorage/DOM/HTTP/WS adapters web-specific; retain revision, session epoch and authoritative semantics.
- [ ] Extract CardView, HandLayout, PlayerSeat, Board/Piles, ActionHUD, Lobby/Setup, Results/Rematch, Settings/Rules/Inspect dialogs; names illustrative. Keep motion provider, motion-core and committed card travel instead of rewriting.
- [ ] Split CSS by ownership (tokens, layout, cards, controls, motion, dialogs); inventory cascade and selectors first. Preserve computed styles and responsive layouts during extraction. Do not force a large monorepo migration.
- [ ] Use shared pure packages only where genuine cross-platform value exists; retain compatibility paths and existing npm locks. Memoize or alter DOM measurement only if profiling identifies a benefit.
- Gate: equivalent baseline captures, existing rules/room/browser tests green, no UX or API drift, independently testable controllers/components, clear ownership notes. No arbitrary line-count target.

### GE-03 — Cohesive comic game board (P1, design + frontend)

- [ ] Use original deck faces/backs, approved logo, cream paper, charcoal ink, teal/red/yellow, Barlow Condensed and print grain from the canonical brand system. Evaluate readable comic-felt and paper/table alternatives on real layouts; choose with owner, not based on an invented screenshot. Preserve contrast and avoid decorative crowding.
- [ ] Design consistent player seats/avatars, active turn, pile/stock/ashes, card counts, legal limit, action affordances, buttons, sheets and status/error states. Draw stock, active pile and ashes must remain unmistakable. Preserve public-card inspection and distinguish bots.
- [ ] Build mobile-first viewport layout with safe areas, reachable controls, adaptive 2–5 seats, no obscured cards, no forced landscape. Test desktop separately; keep game elements visible when feasible without sacrificing hand readability.
- [ ] Align lobby, setup, table, help and results with homepage brand. Preserve optional themes and correct back/face asset pairing; don't reintroduce flipped logos or replace original illustrations without separate approval.
- Gate: owner-reviewed actual screenshots/prototype for each state, visual diff review, text/icon contrast, no overflow or regressions. No copying other games' IP.

### GE-04 — Card input, action clarity and accessibility (P1)

- [ ] Derive actionable card styling from authoritative legal moves; distinguish selectable groups, inactive/illegal cards, setup swaps, legal hand-to-face-up bridge, blind slots, out-of-turn SNAP/SLAM and Counter Dump. Do not infer concealed faces or disable an otherwise legal group.
- [ ] Make selected cards tactile and stable; improve drag hit testing/cancel/return, multi-select, sort, tap-to-play and tap alternative to drag. Avoid accidental plays, layout shaking and blocked touch targets; keyboard equivalent for all actions.
- [ ] Surface clear action-specific affordances for choosing DUMP recipient, Counter Dump or Keep cards, resolving other interruptions, and next turn. Keep pile rules persistent, ordinary text quiet; important information not conveyed by color, sound or transient animation alone.
- [ ] Evaluate busy/in-flight gate, stale revision recovery and selection resets under fast real input. Provide immediate non-authoritative press feedback, not speculative game state; no silent replay of card actions.
- [ ] Shared focus management for all dialogs, Escape/back behavior, return focus, screen-reader card labels and meaningful live announcements. Target WCAG 2.2 AA where applicable; verify at zoom/reduced motion.
- Gate: keyboard/touch tests, 30+ card hands navigable, no known unreachable legal action; dedicated tests for all specials and interrupt timing, including Counter Dump both choices.

### GE-05 — Game feel and full-round motion (P1)

- [ ] Retain one committed event truth model, latest consequential cue wins, no blocking queue; define lifecycle-only visual cues for shuffle/deal, setup, turn handoff, phase transitions, entering/exiting, result and rematch. Deal animation cannot delay readiness or legal input, can skip on resume.
- [ ] Improve ordinary lift/drop/refill, pickup direction and count, seat-aware transfers, blind reveal and public discard presentation. Continue animating actual committed DOM card when available; use only privacy-safe silhouettes otherwise.
- [ ] Expand semantic action matrix for RESET/GHOST/UNDER/SKIP/BURN/DUMP, SNAP, SLAM, SNAP+BURN, invalid blind, Counter Dump/pass, bridge, Final Duel and finishing. Counter Dump currently reuses dump cue with label; design recognizable reversal without showing a fictitious second transfer or burning the top again.
- [ ] Add short, distinct comic impact motifs and optional richer effects, with static equivalents in Reduced and OS reduced motion. Do not extend reaction opportunities or delay bots for cinematic effects.
- [ ] Validate rapid consecutive moves, skipped revisions, background/foreground, rotate/resize, reconnect, undo and rematch; no historical sound/animation replay, wrong recipient, or duplicate cards.
- Gate: every semantic row has tests and before/after recordings, no regression on #66–69; human understands actor/action/recipient/next turn. Existing event durations are starting points, not mandated delays.

### GE-06 — Audio identity and optional tactile feedback (P1; music/haptics depth P2 if necessary)

- [ ] Inventory existing branded clips and rights/provenance; reuse rather than regenerate. Add distinct shuffle/deal, take, blind, Counter Dump, turn/result sounds only where useful. Commission/create original music if approved; no copied music.
- [ ] Consolidate sound dispatch, preload/unlock and fallback behavior, volume mixing, mute, clip overlap limits, separate music/SFX controls, lifecycle handling and user preference persistence. Preserve opt-in default and silent tab/resume behavior.
- [ ] Offer optional short haptics behind platform capability checks (web Vibration API is not universal, especially iOS; never promise it). Respect settings, avoid repeated buzzes and avoid coupling vibration to game rules. Native adapter later.
- Gate: actual listening/device checks, no duplicate or stale sounds, no autoplay surprise, mute works, gameplay works with audio and vibration unsupported. Music and advanced haptics may be deferred explicitly if core quality is accepted.

### GE-07 — First-time experience (P1)

- [ ] Keep immediate guest local play and invite join; design learn-by-playing with one bot, guided setup, first legal move, refill, special mechanics, hand/up/down progression, win/loss and rematch. Teach contextual mechanics, not a wall of rules.
- [ ] Explain SNAP/SLAM/DUMP/Counter Dump when relevant using controlled tutorial fixtures, separate from ranked or live games. Include skip, replay, persistent help and accessible rule reference; no mandatory account or tutorial to join friends.
- [ ] Test unfamiliar players unassisted and refine confusing language/actions. Preserve engine authority and distinguish tutorial fixtures from ordinary games.
- Gate: formative test goals in section 5; no blocking or misleading coaching; new player can finish a round and explain key decisions.

### GE-08 — Lobby, social presence and round results (P1)

- [ ] Streamline local/bot/private-room selection, invite copy/join, ready/host state, reconnect indicator and error recovery. Keep names/seat identity and bot disclosure.
- [ ] Give outcome emotional character: first out, escaped and PILEHEAD loser, correct placement/stats, optional celebratory art/sound, clear next round and leave actions; ensure accessible result focus.
- [ ] Provide respectful reactions and replay consent, no pressure to stay. Preserve existing same-room rematch/winner starts and room authority; do not fake durable score/history.
- [ ] Define tournament-ready result/lobby UI contracts but leave scoring persistence, accounts, matchmaking, moderation, ranking and rewards to the multiplayer roadmap. Reconcile #91 before accounts/commerce.
- Gate: successful 2–5 player private lobby → game → results → next round/leave, reconnect and error handling with real humans. No fake opponent/activity.

### GE-09 — Performance, resilience and release acceptance (P1)

- [ ] Profile actual Android Chrome, iOS Safari if available, desktop browser; test low/mid hardware and small portrait, rotation, large hands, reduced motion, keyboard, screen reader, zoom and long sessions. Document device/browser/OS/refresh rate.
- [ ] Measure drag/render frame pacing, layout reads in useCommittedCardTravel (currently captures each render), hand layout, asset decode, JS/CPU/memory and network latency. Optimize measured bottlenecks (e.g. scoped DOM refs, batch reads, memoization, sprite/asset registry, render isolation); no speculative rewrite.
- [ ] Exercise real private rooms with 2 physical clients plus mixed bots, 3–5 human seats where feasible, weak/unstable network, disconnection/rejoin, stale requests, rapid SNAP/SLAM, DUMP counter/pass, rematch and background recovery. Browser mock Neon tests remain necessary but insufficient.
- [ ] Verify accessibility, privacy redaction, no console errors, no stale effects, and no open P0 or release-blocking P1. Confirm live release SHA and rollback; coordinate #71/#72 and #103 evidence.
- Gate: quality criteria in section 5, exact candidate checks and human signoff. If real hardware unavailable, mark awaiting manual QA, not complete.

### GE-10 — Multiplayer product expansion (P2 relative to experience gate)

After GE-09, proceed using [MULTIPLAYER-MASTER-PLAN.md](MULTIPLAYER-MASTER-PLAN.md): tournament rounds/standings, identity, matchmaking, competitive fairness, progression and social systems. This is a separate implementation stream; early pure contract or safety work may proceed if it does not delay or destabilize experience quality. No public ranked launch until its own privacy, fairness, capacity and moderation gates pass.

### GE-11 — Native applications (deferred)

After GE-09 owner signoff, reconsider native foundation Phase 2 using [MOBILE-IMPLEMENTATION-PLAN.md](MOBILE-IMPLEMENTATION-PLAN.md). Shared-engine maintenance and portable selectors/assets are allowed now; no Expo app scaffold, store commitments or native UI production in this milestone. GE-10 may proceed independently after GE-09; completing every competitive feature is not a prerequisite for native technical alpha unless separately decided. Native Hermes, accessibility, device and cross-play gates remain independent.

## 4. Presentation contract and architecture

Engine/server commits first -> shared public/private view projection -> local or online controller -> derived legal affordances -> React board/HUD -> committed-event motion and optional sound. Input may acknowledge touch immediately but must never adjudicate a move. Keep server as authority in online play, hidden cards and session tokens private, room revisions monotonic, stale response protection, existing clock and card IDs/rules versions. No animation timer extends SNAP/SLAM or delays any legal action. Only committed public blind reveals; no invented pile counts, replay or duplicate faces.

Proposed boundaries: shared rules/bots/snapshots in packages/game-engine; DTOs in packages/game-protocol; pure controller/selectors only when portable; web transport/storage/gestures/DOM geometry in apps/web. Keep audio/haptics/asset adapters platform-specific. No new dependency until clear problem and measurable benefit.

## 5. Acceptance scorecard (proposed targets, not achieved measurements)

Review with owner after GE-01; log actual numerator/denominator, device/network, sample size and build. Targets are pragmatic formative gates rather than statistically validated product KPIs.

| Dimension | Initial proposed gate |
| --- | --- |
| Correctness/privacy | Zero known reproducible P0: wrong turn/recipient/card count, stuck play, hidden identity disclosure, duplicate cards, stale state, reaction unfairness; no release-blocking P1 |
| Input | 100% scripted legal action scenarios reachable by touch and keyboard; all supported 2–5 seat/30+ hand layouts usable; no unintentional drag/drop or inaccessible cards in recorded manual cases |
| Comprehension | At least 5 new-player sessions; at least 4/5 complete first round without facilitator instructions beyond in-game help; at least 80% of sampled special-event prompts correctly identify actor/action/recipient (when applicable)/next turn; report raw counts and revise if unclear |
| Enjoyment | At least 5 formative sessions; ask whether they voluntarily want another round and why; initial target 4/5 positive without rewards/prompt pressure, not a population-level claim |
| Responsiveness | Proposed p95 input-to-local visual acknowledgement <=100 ms on representative device (not online authoritative latency); report online commit latency separately by network; target p95 frame interval <=25 ms during normal drag on 60 Hz reference device; record traces and exceptions rather than claim unsupported 60fps |
| Accessibility | Reduced motion, muted play, keyboard/focus and screen-reader essential actions, contrast and alternative non-drag inputs verified; no essential meaning color-only or sound-only |
| Reliability | Automated full acceptance on exact candidate, live SHA/health and real room checks, reconnect and rematch verified; no unbounded event/animation replay or persistent memory growth observed in repeated sessions |
| Brand | Owner reviews actual mobile/desktop captures across lobby, table, specials and results against approved art; no missing or wrong faces/backs |

Use anonymous aggregated optional telemetry only if approved: start, setup complete, first legal move, completed round, voluntary rematch, tutorial skipped/completed, disconnect/reconnect, rejected actions and performance summaries. No private card contents, raw session tokens, free-text identifiers or invasive recording. Existing commercial telemetry draft is not a dependency. Avoid optimizing for compulsive play.

## 6. CI, evidence and rollout

Use existing Node 24 locked installs and provider-neutral scripts; see CI.md. Fast per-change checks; relevant focused regression; full core/build/browser acceptance for ready integration/release; avoid redundant heavy jobs and respect CI budget. Current commands include npm run ci:install, npm run ci:fast, npm run test:engine-parity, npm run test:shared-core, npm run ci:full-core, npm run ci:browser-setup, npm run ci:browser-test, npm run test:integrated and production probe scripts/check-render-production.mjs. Confirm actual current scripts before running. Never introduce a paid runner or service solely for this plan. Keep screenshots/video with commit/run and viewport metadata, avoid storing private player data. Preserve evidence before short-lived CI artifacts expire.

Every PR: phase/task IDs, baseline and before/after evidence, scoped changes, tests actually run (including SHA), not-run checks, trade-offs and rollback. Review design before large visual changes; don't merge failing runtime changes or deploy unverified builds. Use reversible flags for major UX changes when warranted; never toggle game rules as visual rollback. If live release fails, retain/restore last known healthy deployment according to runbook; no DB rollback for a presentation-only change. Documentation-only PRs need link/diff review, not a new expensive browser run.

## 7. Decision register

Approved direction: web experience before native app work; preserve engine, Next, existing deployment and private rooms. Proposed pending owner review: exact comic table composition (felt vs paper/hybrid), sound/music budget and creative direction, optional haptics on supported web platforms, numeric scorecard thresholds and device mix, implementation names and component boundaries. No rule change, production migrations, paid service or user tracking approved by this plan.

## 8. Execution log

- 2026-11-26: source/CI audit at fa6074f; GE-00 deployment verification blocker observed, GE-01 real visual/human checks outstanding. Existing #65–72/#103 retained. This document coordinates future work; no runtime implementation or new test execution is implied by its creation.
- Next: GE-00, then capture GE-01 evidence and choose design direction. Update this log with date, task ID, commit/PR, check outcomes, blockers and remaining work; mark a checkbox only after its evidence is attached.

- 2026-11-26 GE-00: [production smoke attempt 2](https://github.com/CartShift/pileheads/actions/runs/45739344065/attempts/2) passed exact runtime fa6074f, WebSocket readiness, Neon, homepage and /play. Full acceptance PR head and deployed runtime have identical Git tree. Current main docs-only ahead. Render direct-main configuration/auto-trigger drift and real-room acceptance remain open in #103/#71; no redeploy or config changes.
- 2026-11-26 GE-01: [visual baseline and prioritized audit](GE01-VISUAL-BASELINE.md) reviews 23 existing CI screenshots from the verified runtime tree. Highest priorities: viewport-aware action access, opponent and heavy-hand readability, action affordances and visual evidence timing. No fresh interaction run or human/device acceptance; visual direction needs review. Keep gate open; proceed with safe GE-02 modular prep and geometry harness while arranging remaining manual checks.

- 2026-11-26 GE-02: PR #110 merged as c5a60187 after full/fast checks; initial viewport assertions at 360×740/390×844/1280×860, 2–5 local seats and online setup, expanded-hand no-overlap checks. [Full CI](https://github.com/CartShift/pileheads/actions/runs/45750576507); [live smoke](https://github.com/CartShift/pileheads/actions/runs/45751155756). Physical-device checks remain open.
- 2026-11-26 GE-03: PR #111 merged as 253bfe4a, first comic-felt skin, public hand counts, no new card art. [Full CI](https://github.com/CartShift/pileheads/actions/runs/45751343227), screenshots artifact 15085328216 reviewed. Further visual polish/owner review remains open.
- 2026-11-26 GE-04: PR #112 merged as c64d100b, engine/server-derived legal group markers, hidden-card neutrality, bridge, SNAP/blocked tests. [Full CI](https://github.com/CartShift/pileheads/actions/runs/45752394920), artifact 15086525949; [deployment](https://github.com/CartShift/pileheads/actions/runs/45753606502). Selection compatibility and dense hand interaction remain follow-up work.
- 2026-11-26 GE-05: PR #113 merged as 8feb6d36; fresh deal/start/handoff decoration, non-blocking input, silent resume, reduced motion, distinct Counter DUMP visual. [Full CI](https://github.com/CartShift/pileheads/actions/runs/45753762609). Richer physical deal choreography and real frame pacing remain open.
- 2026-11-26 GE-06: PR #114 merged as ad1f3bf4; existing nine bundled MP3 clips reused, original synthesized effects, optional volume and vibration controls, stale/hidden/mute cancellation. [Full CI](https://github.com/CartShift/pileheads/actions/runs/45754058066). Actual listening and hardware vibration, full provenance inventory, music, and deal/turn audio remain unverified or deferred. No new commercial audio assets or external audio service.
- GE-07/08 candidate: contextual coach driven by legal options and current phase, tips can be reenabled, clearer ready/host states and distinct placement results. Human testing, tutorial fixtures, broader lobby/replay consent, durable tournaments and GE-09 hardware acceptance remain open. Do not mark the entire phases complete based on automated tests alone.

- 2026-11-26 GE-07/08: PR #115 merged b8e02956; contextual practice tips, clear invite/ready, distinct results and result focus. [Full CI](https://github.com/CartShift/pileheads/actions/runs/45754321630). PR #116 merged 4125a152; isolated engine-backed SNAP/SLAM/Counter DUMP exercises preserve normal saves and timing. [Full CI](https://github.com/CartShift/pileheads/actions/runs/45754498401); [exact live smoke](https://github.com/CartShift/pileheads/actions/runs/45754673309). Human onboarding acceptance remains open.
- 2026-11-26 GE-04/09: PR #117 merged 92daf875; full-card spread at 9+ cards, real legal group extension marks, extended portrait/landscape and short desktop tests. [Full CI](https://github.com/CartShift/pileheads/actions/runs/45754713039) artifact 15086838766 (spread and 320px reviewed). 430×932 and 1280×800 initial viewport assertions pass; 320×640 and 740×360 permit safe scrolling. [Physical acceptance checklist](GE09-PHYSICAL-ACCEPTANCE.md) and #71 comment 7182562456 retain real-device/human gate. The previous result screenshot was captured before its entrance settled; next pass strengthens actual opacity evidence.

- 2026-11-26 GE-05/06: PR #118 merged d98a998e; bounded artwork deal and fresh-round audio. Full CI https://github.com/CartShift/pileheads/actions/runs/45754959620. Subsequent PILEHEADS rebrand and V7 artwork/homepage updates landed separately; preserve those changes. Result visibility PR #119 passed its original checks but main advanced; replay only its scoped changes on current main and validate again.
