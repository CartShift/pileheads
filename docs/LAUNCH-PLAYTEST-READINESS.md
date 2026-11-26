# Digital playtest launch readiness

Status: preparation, not release authorization. Tracks #137, #138, #139 and existing #71.
Baseline: main 6918e0bd247581eea17aa42857c097c99823e6f2 (2026-11-26).
Canonical target: https://pileheads.com/play. Render is a fallback until manual acceptance; see [hosting runbook](vercel-hosting.md).
This document is intentionally public-safe. Keep marketing drafts, commercial plans, participant identities, consent records and sensitive operational evidence in the owner's private workspace.

## Release sequence

| Gate | Deliverable | Evidence required |
| --- | --- | --- |
| A0 | Production baseline | Exact deployed revision, canonical domain and live smoke run, rollback target |
| A1 | Manual UX | Real mobile and desktop, 2 physical clients, complete games, no critical failures |
| A2 | First-time playtest | 10–20 invited adults, aggregate observations, prioritized fixes |
| A3 | Measurement | #138 consent/privacy-reviewed instrumentation, feedback, test evidence |
| S0 | Public readiness | Owner approval, name/asset rights, appropriate legal disclosures, real social previews and approved creative |
| S1 | Soft launch | Limited organic traffic, monitor defects and measure actual completions/replays |
| S2 | Review | Review 100 first-game completers as an initial target, qualitative feedback and next experiment |

The target counts are proposed learning milestones, not estimates of traffic or guarantees of product-market fit. Do not launch paid acquisition or sell physical products based on these gates. Native apps and ranked matchmaking are outside this release.

## Manual playtest protocol

Record run date, release SHA or deployment ID, device/OS/browser class, network category and result. Use synthetic player aliases, disposable rooms, no identifying screenshots, and no public session tokens. Record only consented footage in private storage. Do not submit participant details to GitHub.

### Run A: first visit (one physical phone)
1. Open homepage as a first-time visitor. Identify the primary play CTA without coaching.
2. Open /play and start a local game against bots without an account. Note elapsed time to first legal move and any confusion.
3. Learn by using existing rules/coach, play a full round, use face-up and blind phases, then initiate a rematch.
4. Check hand overflow, sorting, touch target size, tap and drag, rotation, reduced motion and opt-in sound; do not assume haptics work.
5. Check feedback and share entry points where implemented. A missing optional feature is not a pass.

### Run B: two-device private game
1. Create a room on one real device and share an invite using the ordinary UI. Open it on another real device with a different browser/session. Verify correct seat and no other player's concealed cards.
2. Play one full game with both humans, then a second game with bots if supported. Inspect pile pickup and ordinary turns on both views.
3. Exercise RESET, GHOST, UNDER, SKIP in a room with >=3 active players, BURN, DUMP and Counter DUMP (accept and counter), SNAP, SLAM, blind fail and final phase. Use controlled fixtures for rare states where needed; identify fixture results separately from live human runs. Never force a production room into an illegal state.
4. Background one client, reconnect after a brief network loss, verify latest state and next legal move. Check no duplicate action, stale animation or changed private visibility.
5. Finish and rematch; open an old invite link and check appropriate redirect/error behavior. Test invitation link preview in actual social/messaging applications without exposing private tokens publicly.
6. Repeat at least one short session with reduced motion and sound disabled. Record any crash or accessibility blocker.

### Run C: formative user observation
Recruit 10–20 consenting adults unfamiliar with this implementation; distinguish familiar and unfamiliar with the underlying shedding-game rules. Ask them to play naturally; do not teach before recording initial friction. Ask after the round: What was the objective? What confused you? Which action was memorable? Would you play another round now? Was there a moment you wanted to stop? Record actual voluntary rematches separately from stated intent.
Record aggregate counts only: invited, arrived, started, completed, voluntarily rematched, invited a friend; note missing/unknown observations rather than turning them into zeros. Small samples are directional, not statistical proof.

## Evidence template

| Run | Build | Device/browser class | Scenario | Result (pass/fail/blocked/not run) | Defect link or non-sensitive evidence |
| --- | --- | --- | --- | --- | --- |
| A | TBD | TBD | First visit / bot game | not run | |
| B | TBD | TBD | Private room / reconnect / rematch | not run | |
| C | TBD | TBD | First-time player observation | not run | |

P0: stuck turns, incorrect engine result, privacy leak, inability to start/join/finish a normal game, security or data-loss issue. Stop release and fix.
P1: recurring comprehension, touch, accessibility or reconnect friction. Triage before soft launch; owner explicitly accepts any residual non-blocking issue.
P2: decorative polish and optional improvements. Do not hold launch for them.

## Measurement contract

Use #138 for implementation and privacy acceptance. Proposed reporting cohorts:
- Activation: unique observed eligible first-time visitors who start a game / eligible first-time visitors with permitted attribution.
- Completion: unique observed first-time starters who finish their first game / first-time starters with an observable outcome.
- Same-visit replay: first-game completers who voluntarily start another game in the defined visit / observable first-game completers.
- Invite conversion: attributable human invite recipients who join a game / observable eligible invite recipients, or unique invite links with a join / created links if recipients cannot be measured. Label the denominator accurately; do not equate the two.
- Return play: D1/D7 return among cohorts where identity/consent and follow-up are lawful and observable; otherwise report unavailable.
- Use authoritative completion, deduplication and separate local/online cohorts. Never count bots as visitors, never infer missing events or collect hidden hands/room credentials.
- No telemetry deployment before privacy review, consent handling where required and retention/deletion policy. No paid integration by default.

## Go/no-go

Record exact build, live smoke results, manual device matrix, outstanding defects, measurement validation, approvals and rollback owner. Owner makes explicit decision before public promotion. Verify links on the promoted deployment. Public content must accurately describe an online playtest; no physical availability claim. Keep fallback intact until acceptance. Review results before increasing promotion.
