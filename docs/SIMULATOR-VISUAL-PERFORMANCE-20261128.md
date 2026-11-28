# PILEHEADS — visual baseline and performance evidence, 2026-11-28

## Source and limitations
Actual screenshots from [PR #208 full Chromium acceptance](https://github.com/CartShift/pileheads/actions/runs/46087606781), artifact [15240295810](https://github.com/CartShift/pileheads/actions/runs/46087606781/artifacts/15240295810), candidate 36ed3f1, downloaded and visually inspected. These are rendered product states, not mockups, but the test backend uses isolated mock persistence, synthetic players and emulated mobile viewports. Static captures cannot certify animation timing, audio, haptics, touch reach or real-device usability. CI images include generated fixture room labels only.

## Findings and scope
| Priority | Observed evidence | Decision / next verification |
| --- | --- | --- |
| P1 | resilience-320x640.png: the logo visibly overlaps Rules; header overflow is internal, so document scroll-width check missed it. | #212: wrap narrow control group; pairwise geometry test, inspect fixed capture. |
| P1 | 320x640 and 740x360 full-page captures extend past viewport (767px and 917px respectively); action dock remains in document flow. | Intentional safe-scroll behavior for short viewports, but repeated action reach needs human device testing before introducing a sticky overlay. Do not cover cards. |
| P1 | adaptive-hand-360-36.png shows dense overlapping art; spread-hand-360-36.png exposes larger individual faces in scroll region. | Retain both modes; verify rank recognition, tap errors, thumb reach and sort with real players. Do not automatically switch modes mid-turn without input. |
| P2 | 1280 desktop captures have considerable space around the central two-player layout; 5-seat mobile opponents are very compact but distinct. | Evaluate hierarchy with real users; avoid changing board proportions solely from static images. |
| P2 | Setup and results hierarchy are identifiable; result card appears centered, distinguishes PILEHEAD and standings, offers rematch. | Verify actual rematch journey and modal focus on hardware. |
| Open | BURN, DUMP, GHOST, UNDER, SNAP+BURN, blind-fail and Final Duel captures show real cards/board outcomes. Static motion samples sometimes include moving overlays. | No conclusion about animation quality or duplicate artifacts from still images alone. Record real-time playback, sound and actor/recipient comprehension. |

## Synthetic load baseline
From the same artifact's next/launch-performance.json (Chromium, local server, emulated 1.6 Mbps / 100ms / 4x CPU for mobile). LCP target 2,500ms, CLS target 0.1. INP not measured. No horizontal document overflow, external origins or reported page errors in these rows; this is not evidence that every child element fits (header defect above).

| Route | Profile | LCP ms | CLS | Encoded total bytes | JS bytes | Requests |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| /play | Desktop local | 64 | 0 | 1300938 | 746320 | 21 |
| /play | Throttled mobile | 2608 | .0068 | 1300938 | 746320 | 21 |
| / | Throttled mobile | 2640 | .0002 | 1133255 | 480894 | 20 |
| /how-to-play | Throttled mobile | 2532 | 0 | 805540 | 472928 | 17 |
| /deck | Throttled mobile | 2676 | 0 | 848441 | 472928 | 19 |

/play LCP misses the lab target by 108ms in this single sample; JS represents ~57% of encoded bytes. Profile repeated cold/warm runs and chunk attribution before changing bundle boundaries. No evidence yet for real EU move latency, INP, frame pacing or repeated-round heap growth. Keep targets from master plan. Browser extension unavailable; direct live endpoint request from current chat inaccessible. Production metadata alone is not live health.

## Iteration evidence
- #208 merged 90050d4; full browser acceptance and security/fast checks passed. Unknown-result mutation recovery and older cancellation support.
- #209 merged c2008a2; [full acceptance](https://github.com/CartShift/pileheads/actions/runs/46087970638) successful; immediate foreground/network resync and authenticated retry reset. Physical suspended-browser testing remains open.
- #210 action clarity and keyboard isolation: initial full browser test failed on overescaped regex despite actual label being 'Play cards (1) →'; fixed assertion, retest required.
- #212 narrow header: candidate created based on the observed screenshot, full acceptance and after-capture review required.
- #211 large benchmark: [matrix](https://github.com/CartShift/pileheads/actions/runs/46088132878) passed all 3–5 player cohorts; full results in [balance report](SIMULATOR-BALANCE-20261128.md).

No visual redesign, rules, pricing, tracking or paid infrastructure changes. Still open: real device acceptance, live room/latency smoke, usability pilot, motion/audio recordings, accessibility and performance profiling. Do not close GE09 or public release gates.

## Verified subsequent fixes

- #210 merged 1505060 after [full acceptance](https://github.com/CartShift/pileheads/actions/runs/46088324476). Selected count, legal pile activation, remote DUMP waiting feedback, busy target controls, modal keyboard isolation and distinct online matchmaking label. Initial failed regex assertion corrected and retested.
- #212 merged 06771aa after [full acceptance](https://github.com/CartShift/pileheads/actions/runs/46088280155). Downloaded [after artifact 15240081799](https://github.com/CartShift/pileheads/actions/runs/46088280155/artifacts/15240081799) and visually inspected resilience-320x640.png and resilience-430x932.png. At 320px controls wrap without covering logo or Rules. At 430px ordinary single-row header remains. Very short viewports still scroll naturally; fix does not claim entire 320x640 table fits.
- #211 merged 5581cb7; dedicated benchmark matrix and full acceptance passed.
- #215 merged 3b66d80 after [full acceptance](https://github.com/CartShift/pileheads/actions/runs/46088494441); added 20 trusted selection gestures per desktop/mobile lab profile. [Raw artifact 15239674811](https://github.com/CartShift/pileheads/actions/runs/46088494441/artifacts/15239674811). Desktop click-to-aria-pressed commit p50/p95/max = 1.2/1.6/1.8ms; two-RAF paint proxy 31.7/32.1/32.1ms. Emulated mobile (1.6 Mbps, 100ms, 4x CPU) commit 5.2/5.9/7.6ms; paint proxy 29.7/31.7/32.3ms. This is a local reduced-motion browser proxy, not hardware input-to-photon, field INP or real network p95. /play mobile LCP 2600ms; CLS .0068; JS encoded 747183 bytes. No performance threshold claim beyond this lab sample.
- #216 merged 3c82682 after [full acceptance](https://github.com/CartShift/pileheads/actions/runs/46088546848); isolated pure adaptive hand geometry and verified 2,750 card-count/viewport/card-width fixtures plus existing Chromium large-hand coverage. No intentional layout or engine behavior change.
- Browser connector reported no originating browser context. Direct container GET could not resolve pileheads.com; public web open was also inaccessible. Production metadata verified independently, but current live API/multiplayer not confirmed.

## Subsequent production, accessibility and performance slices

- #219 merged bc5a5ca: live sample count is explicitly selectable (1 or 20) in manual workflow. [Two canonical live runs and exact metadata](MULTIPLAYER-LATENCY.md) verified on e14b12a, not every later deployment.
- #220 merged 78ccb71: extracted local table projection and bot-opportunity selectors with injected canonical engine. [Full acceptance](https://github.com/CartShift/pileheads/actions/runs/46089236308).
- #222 merged 2e1c20f: persistent turn/limit/interrupt live announcement; blind slot accessible index without hidden face; dynamic system reduced-motion cancellation and unavailable WAAPI fallback. [Full acceptance](https://github.com/CartShift/pileheads/actions/runs/46089337447). Physical screen reader/audio validation still open.
- #223 merged 4c21b1f: live measurements and [pilot facilitator packet](LAUNCH-PLAYTEST-READINESS.md); no recruitment, analytics or physical sign-off.
- #225 merged 0637724: test-only two-arrival CAS barrier for bot SLAM vs normal move, SNAP vs next move, duplicate SNAP. [Initial full acceptance](https://github.com/CartShift/pileheads/actions/runs/46089704734) passed. Subsequent integrated fast CI in #226 found a randomized fixture failure (one arrival), so this is not yet a stable regression. #228 uses guaranteed legal TAKE contenders and improved redacted failure diagnostics; full retest pending at capture. No production CAS changes.
- #224 candidate 76c0e69: [full acceptance](https://github.com/CartShift/pileheads/actions/runs/46089560675), [actual screenshot and performance artifact](https://github.com/CartShift/pileheads/actions/runs/46089560675/artifacts/15240269791). Inspected online-results.png: legible centered mobile result, standings and rematch control, no apparent clipping. Native CSS entrance replaces Motion only on /play. Superseded by #226 after parallel PWA changes conflicted; integrated candidate must pass again. Not yet merged at capture.

| /play lab metric | #215 baseline | #224 candidate |
| --- | ---: | ---: |
| Encoded JS bytes | 747183 | 627215 |
| Mobile LCP ms | 2600 | 2608 |
| Mobile CLS | .0068 | .0068 |
| Mobile selection commit p95 ms | 5.9 | 9.1 |
| Mobile selection paint proxy p95 ms | 31.7 | 29.8 |

119,968 fewer encoded JS bytes (~16.1%). Different candidate runs, not a paired controlled benchmark; LCP improvement is not demonstrated. Do not equate this with physical browser startup speed. Maintain all prior device/pilot gates. #227 independently extracts room reconciliation with new stale/equal/session/seat/round selection tests; acceptance pending at capture.
