# GE-09 release acceptance: physical playtest checklist

Status: OPEN. Automated Chromium tests are necessary, not a substitute for physical devices or unfamiliar players. Record the exact deployed SHA and date at the start of each session.

## Verified engineering baseline (2026-11-26)

**Disposition: engineering candidate accepted by automated CI; commercial release awaiting manual QA.** This does not certify performance on physical devices or human comprehension.

| Evidence | Verified result |
|---|---|
| Runtime main | `a3e12283ddf37a45ce07948b7e70f6f6d72df7d0` (#131) |
| Full-tested candidate | `40c60f946e1496f999e050915c986ad18743906f` |
| Exact common Git tree | `36387bdf01be615df1d400484cd37920680ded3e` |
| Fast CI | [passed](https://github.com/CartShift/pileheads/actions/runs/45901785570) |
| Full core + browser acceptance | [passed](https://github.com/CartShift/pileheads/actions/runs/45901785515) |
| Main fast CI | [passed](https://github.com/CartShift/pileheads/actions/runs/45901978446) |
| V7.1/V8 visual evidence | CI artifact 15155953422 (32 PNGs; reviewed 5-seat mobile and settled result screen) |
| Last independently confirmed live baseline before #131 | `709febf85a40c5f00b71334f4073ebbfe4c9aea4`, [exact production smoke](https://github.com/CartShift/pileheads/actions/runs/45897328682) |
| #131 live deployment | [production smoke run](https://github.com/CartShift/pileheads/actions/runs/45901978569); pending at time of record preparation; check final result |

Verified by the integrated Chromium harness: responsive 2–5 player tables, 320×640 and 740×360 scroll-safe paths, ordinary viewport fit at 360×740, 390×844, 430×932, 1280×800 and 1280×860; hands up to 36 cards, spread selection preservation; captured pointer cancellation and next tap; private-seat privacy, real server transport against mocked Neon, mixed bots, SNAP/SLAM/Counter DUMP, stale requests, reconnect/rematch; reduced-motion lifecycle, feedback preferences, practice drills and visible results. These are scripted tests, not human or real-hardware acceptance.

### Remaining release decisions

- Physical QA: perform the scenarios below on two independent devices, including actual sound/haptics, screen-reader/zoom and frame pacing. Record observed data and defects; do not mark GE-09 complete without evidence.
- Product/design: the richer presentation is shipped incrementally; owner visual approval, unfamiliar-player study and remaining polish are not implied by green tests.
- Scope: preserve the separate RC3 artwork import/sign-off (#130). Tournament/account/commerce and React Native work are separate tracks, not part of this engineering sign-off. Music and advanced native haptics are deferred; no new paid service.
- Rollback: preceding healthy runtime `709febf85` is the immediate known-good reference, not a tested rollback exercise. Use the existing Render runbook; never roll back the database for a presentation-only regression.

## Session record

| Field | Record |
|---|---|
| Candidate SHA / production smoke run | |
| Phone model / OS / browser / refresh rate | |
| Second physical client / browser | |
| Network (Wi-Fi, mobile, weak, offline/rejoin) | |
| Number of players / human seats / bots | |
| Motion mode / sound / haptics | |
| Tester experience (new / returning) | |
| Screen recording or trace (consent only) | |

## Required scenarios

- [ ] 360–430px-equivalent portrait and landscape: setup, normal turn, own hand and action dock; zoom and rotation; no clipped or covered primary action.
- [ ] Draw to three, pick up a large pile, browse a 24–36-card hand in compact and spread views, select matching cards, sort, clear, tap and drag. Verify scrolling over the spread view, selection preservation and accessible controls.
- [ ] Face-up bridge, face-down flip and invalid blind pickup; every card remains physically identifiable and no hidden identities appear in network or presentation.
- [ ] RESET, GHOST, UNDER, SKIP (where enabled), BURN, DUMP, Counter DUMP/pass, SNAP, SLAM, SNAP+BURN, optional Final Duel. Verify event meaning and recipient, not just existence of an animation.
- [ ] Sound off/on, volume zero, muted/reduced motion, background/foreground, no stale sound, actual listening with speaker/headphones; vibration only if browser/hardware supports it.
- [ ] First-time learner can use practice tips, dismiss/restore them, and finish all three isolated drills; ordinary saved match remains intact.
- [ ] Private room with two independent physical devices: create/invite, join, ready, host start, actual cross-client moves, refresh/reconnect, weak network, stale request, finish, rematch and leave. Repeat with mixed bots and 3–5 humans when available.
- [ ] First-out/escaped/PILEHEAD result and winner-start behavior; ensure next-round action reachable by keyboard and touch. Check screen reader labels and focus; no unapproved pressure or scoring claims.
- [ ] Repeat at least three complete rounds; observe slowdowns, crashes, unbounded animation/sound replay, memory growth or inconsistent state.

## Performance evidence

Use Android Chrome remote DevTools and Safari Web Inspector where available. Capture real input-to-selection visual acknowledgement and frame intervals during card dragging on the target device; inspect main-thread layout, paint, JS and memory across three rounds. Report p50/p95 and network commit latency separately. Do not derive hardware claims from a CI runner. Proposed targets in master plan: p95 acknowledgement <=100ms, p95 frame interval <=25ms on 60Hz reference hardware. Record actual numbers and exceptions. No target has yet been verified on physical hardware.

## Formative usability

Aim for five first-time players. Record anonymized task outcome only, with consent: can start unassisted, make legal first move, explain DUMP and interrupts after play, complete a round, voluntarily rematch. No account, telemetry or recording required. Target 4/5 complete unassisted and want a rematch, >=80% explain special mechanics. These are proposed thresholds, not measured results.

## Release gate

Fast and full CI must pass exact candidate; production smoke must confirm exact SHA, homepage, React, database and WebSocket. Record screenshots and run URL. Any reproducible state divergence, hidden-card leak, inaccessible essential action, crash, broken rematch or unconfirmed release blocks acceptance. Keep issues #71/#72/#103 open until their real evidence is attached. Use existing hosting rollback runbook rather than database rollback for a presentation-only regression.

Automated evidence currently includes Chromium with mock Neon, 2–5 seats, local/mixed rooms, reconnect, privacy, move interrupts, large hand and settings scenarios. Physical multiplayer, listening, vibration, Safari, device profiling and human study are still unverified.
