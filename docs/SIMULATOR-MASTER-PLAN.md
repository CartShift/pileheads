# PILEHEADS Online — Game Experience & Reliability 1.0

Status: active implementation; release acceptance remains OPEN. Approved product direction, 2026-11-28.
This is the coordination index and ordered execution ledger, not a second set of competing requirements. Detailed work remains in [Game Experience 4.0](GAME-EXPERIENCE-MASTER-PLAN.md), [physical acceptance](GE09-PHYSICAL-ACCEPTANCE.md), [multiplayer latency](MULTIPLAYER-LATENCY.md), [public launch acceptance](PUBLIC-LAUNCH-ACCEPTANCE.md) and [repository readiness](https://github.com/CartShift/pileheads/issues/103). Reuse #65–72, #103 and #137–139; do not duplicate or close them without evidence.

## Guardrails

- Canonical Next.js /play, one shared authoritative rules engine and protocol; do not restore Classic or redesign approved card artwork.
- Preserve rules and deck balance, SNAP/SLAM timing contract, server authority, hidden-card privacy, frictionless private invites, existing accounts and consent boundaries. Proposed rule changes need measured evidence and explicit approval.
- Vercel canonical, Neon persistence, Render fallback; no paid infrastructure or new tracking without approval. No broad commercial release implied by pilot access.
- Small coherent PRs, regression tests with fixes, exact candidate checks before merge; use fast CI for routine changes and full acceptance for runtime slices. No unrelated migrations, major dependency upgrades (#170), PWA (#173), commerce (#172), or native development in this milestone.
- Status vocabulary: existing (source only), verified (exact evidence), open, blocked (named reason). Never count historical CI, a wireframe or mock persistence as live physical-device acceptance.

## Baseline (source and provider metadata, 2026-11-28)

- Main and canonical Vercel production alias: 7b3a7a2bbc7ea1cd38e92533b0c94dd0817f13f3; deployment dpl_GUpdvbMkkySPB1zyueGaBECVAn19 READY, fra1. [Deployment](https://vercel.com/cart-shift/pileheads/dpl_GUpdvbMkkySPB1zyueGaBECVAn19). READY does not establish runtime health.
- [Fast checks](https://github.com/CartShift/pileheads/actions/runs/46085547102) and [security baseline](https://github.com/CartShift/pileheads/actions/runs/46085547156) passed on that SHA. No fresh full-browser run verified on that exact SHA. Previous automated evidence: GE09 and public launch acceptance ledgers.
- Active PRs #196, #199 and #201 address account/profile/privacy separately; do not overwrite or incorporate their changes without review.
- Source review: game-table.tsx is ~1,226 lines; authoritative revision CAS and redacted seat views exist; online deck uses cryptographic shuffle; live invalidation + fallback polling exist. Existing synthetic balance data dates from 2026-11-22 and does not establish current rules balance.
- Browser session unavailable in this execution context; no live playthrough, screenshots, real-device or measured latency claims. Local shell cannot resolve GitHub, and provides Node 22 rather than project Node 24. Connector permits source and PR work; use actual CI for execution evidence.

## Ordered work and exit criteria

### S01 — Production baseline (P0) — #65, #71, #103, #137
- [x] Pin reviewed main and deployment metadata; inventory current checks, existing issues and related work.
- [ ] Verify runtime health and canonical live smoke on exact candidate; inspect full CI result and capture lobby/table/result reference screenshots at desktop, 320/360/390/430px, landscape, tablet.
- [ ] Record real input, network and rendering baseline; retain artifacts and rollback target.
Exit: known candidate, full evidence and actionable reproducible defects.

### S02 — Engine & rules (P0) — #103
- [ ] Verify number groups and all specials including Counter DUMP/pass, SNAP/SLAM precedence, hand/face-up bridge, blind reveal/pickup, winner-start, rematch and 2-player SKIP omission. Reuse shared-core, engine, matching-actions and online tests.
- [ ] Run deterministic canonical-engine benchmark with >=10,000 seeds per player count, classic and optional Final Duel, rotating starter and bot policy assignments; include interrupts and all decision types. Report p50/p95/p99, capped seeds, per-seat/starter wins and longest no-progress streaks; retain version/seed/cap. Compare historical benchmark without treating different cohorts as equivalent.
- [ ] Add targeted property/invariant and deterministic regression cases for findings. Do not silently change rules or force game termination.
Exit: zero invariant violations, published current distributions and explicit long-game decision.

### S03 — Multiplayer reliability (P0) — #69, #71
- [ ] Measure EU warm/cold command acknowledgement and opponent convergence; cross-instance and fallback; inspect read/compute usage.
- [ ] Reproduce simultaneous SNAP/SLAM, bot/human timing, duplicate requests, stale revisions, unknown-result timeouts, two tabs and out-of-order snapshots.
- [ ] Preserve still-legal card selection during unrelated revisions; never preserve invalid or cross-round selection. Keep intentional DUMP target state only when valid.
- [ ] Improve offline/reconnecting and recovery feedback, check room epochs, reconnect/backoff, token expiry, bot scheduling and read quota/cost. No new transport until measurements warrant it.
- [ ] Check redaction on every seat including blind IDs, logs and realtime packets.
Exit: no divergence, duplicate moves or private-card leaks; reliable recovery. No change to interrupt rules.

### S04 — Architecture (P1) — #103
- [ ] Inventory GameTable responsibilities; incrementally extract room, local game, connection, action and bot scheduler controllers and storage preferences; avoid broad rewrite.
- [ ] Define presentation contracts and test effect cleanup; remove obsolete duplicate paths only after parity; keep shared engine and protocol platform-neutral.
Exit: clear boundaries, behavior-preserving diffs and tests.

### S05 — Table UX (P1) — #67, #68, #70
- [ ] Audit actual screenshots first; verify turn, effective pile restriction, legal card indications, selection and contextual count labels.
- [ ] Refine DUMP targets and interrupt prominence, draw/burn counts, opponent density, large-hand spread/sort, waiting/error/empty states.
Exit: every core action is understandable without outside explanation; no regressions in card visibility or primary actions.

### S06 — Game feel (P1) — #66–70
- [ ] Audit committed-event choreography: deal, normal play, draw, pickup, BURN/four-of-kind, DUMP/Counter DUMP, SNAP/SLAM, blind reveal, GHOST/RESET/UNDER/SKIP.
- [ ] Check audio assets, volume/unlock, optional haptics, motion preference and effect priority. Motion never blocks legal actions; avoid invented outcomes and extra fixed delays.
Exit: physically coherent, distinct feedback for all moves, visually inspected in real sessions.

### S07 — Mobile (P1) — #71
- [ ] Test 320–430px, tablet, landscape, safe areas, dynamic viewport, thumb reach, touch targets, tap/drag/multiselect and 24–36 card hands.
- [ ] Physical iOS Safari and Android Chrome: background/foreground, lock, rotation, messaging-app invite, slow network, sound and haptics.
Exit: complete games on real phones, no clipped essential controls or lost state.

### S08 — Lobby and onboarding (P1) — #139
- [ ] Audit existing journey; simplify primary choices (bots, friends, online humans), avoid ambiguous Quick Play naming, move advanced setup behind choice.
- [ ] Verify no-account local/private start, invite join, saved games, first move, contextual special-card guidance and drills, layer transitions; dismiss/resume learning.
Exit: unfamiliar players can start and complete without coaching.

### S09 — Results and retention (P1) — #139, #137
- [ ] Verify winner/PILEHEAD, standings, rematch and all-human tournament consent/withdrawal; improve result sharing and invitation flow; review optional profile/progression without forcing accounts.
- [ ] Measure voluntary rematch only within consented pilot.
Exit: clear outcomes and voluntary continuation.

### S10 — Performance and accessibility (P1) — #70, #71
- [ ] Profile React renders, frame pacing, decoding, sound lifecycle, bundle and repeated-round memory. Optimize measured hotspots.
- [ ] Check keyboard, modal focus and restoration, screen reader announcements, contrast and non-color signals, storage denial, reduced motion and zoom.
Exit: essential actions accessible; evidence supports performance targets.

### S11 — Full QA (P0 release gate) — #71, #137
- [ ] Run canonical engine, API, concurrency, browser, security and integrated tests on exact candidate; 2–5 seats, mixed bots, multiple rounds and weak/offline networks.
- [ ] Inspect screenshots; verify production smoke, exact deployed SHA and rollback target. Record failures and retest after fixes.
Exit: no unexplained red CI or critical reproducible defect; all mandatory release gates signed.

### S12 — Pilot (P0 release gate) — #137–139
- [ ] 10–20 consenting unfamiliar players, including five formative first-time sessions; observe first move, complete round, understanding specials, voluntary rematch, invites; record non-sensitive anonymized outcomes.
- [ ] Resolve critical pilot defects; operator/privacy and launch approval as documented. Keep data collection flags off until appropriate gates pass.
Exit: evidence-based release decision, not a feature count. Physical tests and human participation require real people/devices.

## Targets (not measured results)

Warm EU p95 input <=100ms, server acknowledgement <=300ms, rival state <=1,000ms; 60 FPS reference hardware / p95 frame interval <=25ms. No divergence, duplication, hidden-card leaks or critical crashes. Formative usability: >=4/5 complete unassisted and want rematch, >=80% explain special mechanics. Capture cold/weak network separately and do not claim lab numbers as field metrics.

## Execution evidence

| Slice | Status | Evidence / next action |
| --- | --- | --- |
| S01 | partial | Baseline SHA, Vercel metadata and fast/security runs above; full/live/manual gates open |
| S02–S12 | open | Reuse existing tests and feature implementations, validate and repair only observed gaps |
| Human/device gates | blocked in current chat | GE09, #71 and #139 require physical participants and visual review |

For each PR record scope, source SHA, tests actually run and result, artifact URLs, remaining gaps, and rollback. Never mark a checkbox based solely on code presence. Update this ledger incrementally; link detailed existing documents rather than duplicating their evidence.
