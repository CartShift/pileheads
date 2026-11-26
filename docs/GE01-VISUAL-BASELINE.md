# GE-01 — PILEHEADS visual baseline and prioritized UX audit

Date: 2026-11-26. Status: screenshot/source review complete; live interaction, video, human study and physical-device acceptance outstanding. Parent roadmap: [Game Experience 4.0](GAME-EXPERIENCE-MASTER-PLAN.md). Refs #65, #67, #70, #71, #72, #103.

## Evidence and reproducibility

Runtime SHA fa6074fa38927e80901af5e0e6d763b203ac3c7f; Git tree c75398930ff6279c2c3c571baac2ad6ae191bf86 is identical to accepted PR head 8b792e2fd56fb8d1bfb77820347d312ea6f27a9c. [Full browser acceptance](https://github.com/CartShift/pileheads/actions/runs/45738101941) passed. [Artifact 15080440529](https://github.com/CartShift/pileheads/actions/runs/45738101941/artifacts/15080440529), stack-next-tabletop-visuals ZIP, SHA256 0368737e130d88f37133556ba170f4485adfbc8b756eddb99de6801a99439855, 8,075,206 bytes, expires 2026-12-03 UTC. Downloaded and visually reviewed all 23 PNGs; preserve originals privately before expiry or reproduce via the pinned fixture suite. No new browser execution was performed during this review. ZIP also supplied to the owner in chat. Do not commit private/live room codes, credentials or concealed data. The captures are test rooms on integrated Node + mocked Neon, not actual mobile hardware or live human sessions.

[Production smoke retry](https://github.com/CartShift/pileheads/actions/runs/45739344065/attempts/2) confirmed runtime SHA, WebSockets enabled, database readiness, homepage and /play on public HTTPS. Main 2df8041c is docs-only ahead. GE-00 remaining automatic trigger/config drift and physical-room acceptance are tracked in #103/#71, not waived.

| Corpus | Files | Source viewport |
| --- | --- | --- |
| Local/table | local-360, local-390, local-1280, five-players-360 | 360x740, 390x844, 1280x860 |
| Hand stress | adaptive-hand-360-6, -24, -36 | 360x740 |
| Setup | setup-host, setup-guest | 390x844 / 360x740 |
| Online | online-host, online-3-seat-host/guest, online-5-seat-host/guest, online-results | 390x844 / 360x740 |
| Action states | motion-burn/dump/under/reset/ghost/blind-reject/snap-burn/final-duel-erosion-390 | 390x844 |

All PNGs use fullPage:true, so their height is NOT the viewport height. Local screenshots are 360x1194, 390x1179 and 1280x1376; five-player 360x970; hand stress 360x970/1068/1081; online 5-seat host 390x1010 and guest 360x1003. Review the top viewport crop separately from the complete document; these demonstrate initial scroll-zero visibility, not a claim about every scroll position. Tests localScenarios use reduced motion and Original theme at screenshot time; the other captures include illustrated and independent guest themes. No screenshot proves frame pacing, latency, tap success or motion comprehension.

## Strengths to preserve

- Actual illustrated cards have distinctive character, high-level color/number identity and matching themed backs; don't redesign faces in a tabletop PR.
- Public opponent cards and private hand counts are represented on the table; selected card, active seat, rule marker and pile count are readable concepts.
- Stable normal-flow controls were chosen to avoid covering large hands. Existing horizontal fit, card identity, hand sorting, inspect and pointer handling tests matter.
- The green felt is intentional in the previous design system. Reconsider its treatment and hierarchy, not automatically replace it with cream everywhere.
- Online rooms, two themes in separate profiles, 2–5 seats, and rule-specific state are visible. Preserve privacy, authority, reconnect and bot behavior.

## Prioritized findings

No new gameplay correctness P0 was established by these screenshots. P1 findings are experience/release blockers or risks; evidence-backed layout observations are distinguished from hypotheses requiring interaction.

| ID | Priority | Evidence and observation | Proposed action and acceptance |
| --- | --- | --- | --- |
| GE01-01 | P1 | five-players-360: first 740px ends at own hand, action dock below; online-5-seat-host first 844px also excludes actions. local-1280: full page 1376px at 860px viewport; controls below fold. CSS globals 422–429 makes dock normal flow intentionally. Tests check no horizontal overflow and dock below hand, not visibility. | Design viewport-aware board + reserved action dock, safe-area padding, scroll only controlled regions when necessary. For ordinary three-card turns and setup at 360x740/390x844/430x932 and desktop 1280x800/860, active actionable cards, central pile, turn and relevant primary actions simultaneously visible at initial/settled state when feasible. Measure bounding rectangles and actual touch targets; never overlay cards, trap scroll or hide legal actions. For long hands/accessibility zoom allow purposeful hand browsing while action dock remains reachable. Test keyboard/zoom/landscape/virtual keyboard, not just screenshots. |
| GE01-02 | P1 | five-players-360 and online-5-seat-guest: four narrow opponent panels; mini face cards CSS width 19px at <=390; face art/details hard to distinguish at native size. | Use seat-aware compact opponent HUD, larger rank/action markers or public-card detail affordance, active-seat emphasis and inspect accessible by touch/keyboard. Never reveal hidden faces. Compare 2/3/4/5 seats; verify every name, hand count, visible up-card identity, presence, target affordance. |
| GE01-03 | P1 risk | adaptive-hand-360-24/-36 show many overlapping rows and narrow visible strips; impressive fit but several card faces/action names visually obscured. Actual mis-taps not established. | Compare grouped-rank fan, focused row/scroll or expandable hand with count; maintain access to each physical card and multi-select semantics. At 6/16/24/30/36 cards, test hit areas, card readability, all legal groups, sort stability and tap/drag; record real device mis-taps and performance. Do not simply shrink cards further. |
| GE01-04 | P1 | local-360/390/1280 and online screenshots: repeated turn message at top and bottom; separate labels/counters, disabled Inspect pile occupies space; online header wraps and takes a large share of height. | Compact header/overflow settings with obvious invite/live state; one prominent turn signal near action, central rule marker and consistent accessible contextual hint. Keep help/reactions/invite reachable, not hidden behind unnecessary steps. |
| GE01-05 | P1 risk | setup-host/guest: same board composition as live, generic instructions far from cards. Source GameTable setup swaps by hand then up click. | Clear setup mode with hand/up role, explicit selected-swap target and ready status; optional auto-arrange where supported. Verify ready/join/host transitions, swap undo semantics as currently supported and all legal setup actions. New-player study needed. |
| GE01-06 | P1 | source game-table.tsx: chooseCard allows same-face group selection, canPlay checked against legal moves later; screenshots mostly idle or empty pile, cannot prove wrong taps. | derive legal affordances from engine/DTO; show playable/selected/invalid group and SNAP/SLAM/Counter Dump availability; keep all legal combos/bridge/hidden slots reachable and rules authoritative. Test non-color-only affordance, all special decisions, no accidental/automatic play. |
| GE01-07 | P1 visual direction | Illustrated cards sit inside dashboard-like rounded panels and oversized green zones; original screenshots have huge whitespace around three cards. | Explore a premium comic-felt hybrid: compact shared tabletop, diegetic pile marks, ink outlines, subtle halftone, expressive seat/turn motifs, paper accents, original typography, card art dominant. Maintain legibility; compare with one restrained felt alternative, owner approves actual mobile/desktop design before implementation. Direction proposed, not approved mock. |
| GE01-08 | P1 evidence gap | motion-burn/dump/snap-burn/blind-reject captures show settled state, not the cue; online-results PNG lacks the results overlay although DOM visibility/geometry assertions passed (entry opacity animation delayed 0.32s). Full-page capture after transient DOM sampling is not synchronized to animation frames. This is NOT evidence animations or results fail. | Keep authoritative duration unchanged. Capture deterministic test-only paused/controlled presentation frames at cue start/mid/end plus real-time short videos or sequential captures, verify visible pixel/opacity evidence. Results capture after animation settles; test first-out/escaped/loser/long-hand and reduced motion. Separate screenshots from temporal tests. Include Counter Dump/pass, SKIP, SLAM, pickup, bridge, reconnect/rematch. |
| GE01-09 | P2 | Burned zone mostly empty dashed X, stock/pile placeholders feel generic; empty states occupy similar attention as active pile. | Improve pile material/size/empty-state visual grammar, maintain explicit counts and correct transfers. Do not add persistent distracting particle effects. |

## Recommended visual hierarchy

In-play top: compact brand + room/connection status + menu. Opponent HUDs arranged by seat count with clear turn indicator. Shared central tabletop: stock to left, played pile primary, ashes right; visible constraint near current pile. Own up/down zone compact but distinguishable; hand is dominant. Bottom action dock contextual (selected action, take/play, interrupts), reserved space; no duplicate headline, no offscreen primary action for ordinary hand. Setup and round result have distinct hierarchy. Local table should not feel like a settings page.

This is a design hypothesis for review, not a selected mockup. Keep approved illustrated deck as canonical. Do not introduce Canvas/WebGL, new game engine or new backend merely for visual polish.

## Next implementation sequence

1. GE-02a: extract pure legal/stage/seat/hand selectors with parity tests; isolate CardView/HandLayout, PlayerSeat, Piles and ActionHUD from the existing component without changing behavior. Keep existing controller/transport and motion authority until safe extraction. Avoid a giant refactor.
2. GE-02b/GE-03a: build viewport layout harness and initial geometry assertions with before evidence, test normal and stress layouts at 320/360/390/430, landscape, desktop. Review design variants with owner. Deliver focused PR for board+reserved dock; explicit rollback.
3. GE-04: legal/action feedback, large-hand and opponent readability, accessibility and setup. GE-05: event/lifecycle choreography, meaningful visual evidence. GE-06–09 follow master plan.
4. Update #67/#70/#71 rather than duplicate issues. Run fast checks and scoped browser cases for incremental changes, full acceptance for ready integration; use existing provider-neutral scripts and conserve CI. Never claim a green earlier revision certifies a later change.

## Remaining GE-01 gates

- [x] Downloaded and visually reviewed existing corpus; matched tree to deployed runtime; source-supported prioritized findings.
- [ ] Preserve/reproduce artifact beyond expiration; add actual first-viewport screenshots and animation/result timing evidence (current corpus is full-page).
- [ ] Fresh live/browser interaction baseline: lobby, settings/help, setup, all special events, round finish/rematch, connection loss/recovery; additional viewports 320, 430 and landscape.
- [ ] Real Android/iOS/desktop interaction recordings, frame/latency measurement and accessibility test. No new device claims.
- [ ] Five formative unfamiliar-player sessions with consent, comprehension/voluntary rematch raw counts; numeric targets in master plan are proposed.
- [ ] Owner-reviewed visual target and prioritization; no visual redesign is claimed or selected.
- [ ] Record evidence for outstanding tasks and GE-01 gate before broad rollout. Safe modular prep may proceed while arranging manual QA, but design implementation must be tied to reviewed target and baseline.
