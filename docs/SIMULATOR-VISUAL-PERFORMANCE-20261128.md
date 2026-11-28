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
- #215 input timing instrument and #216 pure adaptive-hand geometry were opened for automated acceptance; status at capture pending full CI.
- Browser connector reported no originating browser context. Direct container GET could not resolve pileheads.com; public web open was also inaccessible. Production metadata verified independently, but current live API/multiplayer not confirmed.
