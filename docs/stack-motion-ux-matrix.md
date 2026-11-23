# STACK Motion & UX 2.0: authoritative event matrix and QA baseline

**Status:** implementation in progress; **not** a claim of visual or production acceptance.
**Companion:** [Epic #72](https://github.com/yotamon/spark-card-game/issues/72).
**Reviewed baseline:** main after PR #64 (quiet authoritative special motion); React table at /play with the unchanged Classic fallback at /pilehead/index.html.

## Invariants

1. A committed game event is the **only** source for a special animation; historical events from a reconnect must never be replayed.
2. Never draw an imaginary face or duplicate the real card already rendered by React. Represent public-pile movement using a neutral card-back silhouette.
3. The game engine and server decide outcomes and reaction fairness **before** visualization; no effect blocks input or lengthens SNAP/SLAM response windows.
4. Every movement toward a person uses a known, authoritative seat. Unknown target or count means no card-transfer effect.
5. Round, room, game seed, move number, viewport and visibility changes invalidate stale overlays. On cancellation, the real table remains playable and correct.
6. The app obeys OS reduced motion; the separate user setting may reduce further. Neither changes game outcomes.
7. All browser accessibility/status text is independent of any animation duration.
8. Classic is not modified as a side effect of this React presentation refactor. The legacy Three.js beta has since been retired independently on main.

## Physical outcome matrix

| Committed event | Known engine metadata | Visual cue (non-blocking) | Key regression |
| --- | --- | --- | --- |
| Ordinary numbered play | new pile cards; \`rank\` | Real pile gains one or several cards, subtle settle only, no pop-up | No duplicate ghost face or unstable hand |
| Draw to 3 | \`drawnCount\` | Hand count/layout updates immediately; do not show unrevealed faces elsewhere | Hand packing and privacy |
| BURN card | \`burnedCount\`, \`burned=true\` | Public pile silhouette moves to ashes, hot ember pulse; actor may play again | Four BURN copies do not burn four times |
| Four matching number cards | \`reason=four\`, \`burnedCount\` | Same physical burn with a heavier impact if SLAM | Only actual group of four, not a single 10 |
| SLAM interrupt | \`type=slam\`, \`burnedCount\` | Distinct impact then burned pile to ashes | Only server-accepted interrupt, no delay |
| DUMP, chosen target | \`action=dump\`, \`target\`, \`takenCount\` | DUMP card is consumed; only pre-existing pile silhouette moves to chosen seat | \`count\` of DUMP cards is **not** pile size; all eligible seats |
| DUMP, unresolved target | \`type=dump-pending\` without a committed move | No transfer; existing target selector stays interactive | No phantom pickup |
| Empty-pile DUMP | \`takenCount=0\` | DUMP consumed, optional target highlight, zero transferred cards | Never fabricate a flying pile |
| Pickup | \`type=take\`, \`takenCount\` | Public pile silhouette moves to collecting seat | Correct recipient and no hidden face |
| Optional Final Duel pickup | \`erodedCount=1\`, \`takenCount\` | Visible top card burns to ashes first, remainder then travels to recipient | If only 1 card, nothing goes to hand |
| Optional Final Duel DUMP | \`erodedCount=1\`, \`target\`, \`takenCount\` | Same one-top-card erosion before pile-to-target transfer | Rule default remains OFF |
| SNAP | \`type=followup\`, \`reason=snap\` | Immediate small SNAP accent after committed move | No timer extension or hint |
| SNAP completing four | \`type=followup\`, \`burned=true\`, \`burnedCount\` | SNAP accent and actual pile burn | Do not omit burn just because event kind is SNAP |
| RESET | \`action=reset\` | Cancel persistent restriction indicator, keep pile | Never fly pile away |
| GHOST | \`action=ghost\` | Soft translucent accent; restriction remains unchanged | Same numeric limit |
| UNDER | \`action=under\`, \`limit.type=under\` | Brief action accent + always-visible 1–4 rule until resolved | Preserve through GHOST and SKIP |
| SKIP | \`action=skip\`, \`target\` | Mark **skipped** seat, real active-player marker remains authoritative | Two players: actor is up again |
| Blind play succeeds | \`blindReveal\` on authorized move | Reveal once publicly, then continue normal play | No private face leakage |
| Blind play fails | \`type=blind-fail\`, \`takenCount\`, \`blindReveal\` | Public face revealed, visibly rejected, then pile moves to actor; honor erosion | No premature reveal or false draw |
| Last-hand bridge | \`bridgeCount\` | Single grouped action feedback | Stable card IDs and correct stage |
| Room reconnect / duplicate snapshot | room revision + \`move\` | Nothing replayed; current table wins | Last move only, no duplicate effects |
| Rapid bot move / new committed action | new \`move\` | Old cue canceled, latest cue can appear | Don't delay input; never replay backlog |
| Undo / rematch / leave room | cursor rewind or game identity change | Clear overlay; UI reflects restored authoritative game | No abandoned-room afterimage |

## Visual and device acceptance

| View | Required check |
| --- | --- |
| 360 × 740 portrait | Full visible hand, selection/drop, pile, ashes, target, action toolbar, no overflow |
| 390 × 844 portrait | Same as above, including 30+ card hand, multirow fan, keyboard/gesture |
| 430 px portrait / landscape | No crossing overlays or disappearing cards after resize |
| 1280 × 800 desktop | 2–5 seats, drag, target, all real pile contents inspectable |
| User motion: Balanced / Full / Reduced | Preference persists; Reduced disables transfer, still explains result |
| OS prefers-reduced-motion | System reduction wins even if local Full is selected |
| Slow network / reconnect | Old event queue never plays, no duplicated sound |
| Two real devices | Actor and recipient positions are correct from *each* spectator's perspective |
| Retired 3D beta | This 2D release must not restore removed Three.js assets or WebGL requirements |

## Automated tests

- \`npm test\`: includes \`tests/pilehead-motion-director.cjs\`, the pure model and event cursor tests.
- \`npm run typecheck --prefix apps/web\`: strict React/Next types.
- \`npm run build\` and \`npm run test:integrated\`: single existing Render service.
- \`node tests/stack-next-browser.cjs\`: React 360/390px, local and two-browser room, special motion, blind failure, motion accessibility.
- \`node tests/pilehead-browser.cjs\` and \`node tests/pilehead-live-browser.cjs\`: Classic regression.

These should be run by the existing CI before merging. **Actual Android touch QA, physical two-device rooms, measured frame pacing, visual capture comparison and successful production deployment are unverified until separately recorded.**

## Delivery priorities

- P0: incorrect card destination/number, stale cue, misrepresented DUMP/SNAP/BURN, secret face exposure, inaccessible hand, locked turn.
- P1: animation jitter, wrong action focal point, missing transient rule indicator, poor mobile/desktop readability, sound mismatch.
- P2: decorative sparks, complex 3D effects, cinematic endings, optional sound variations.

## Baseline findings

- PR #64 already removed speculative ordinary card ghosts and old effect queues.
- Current engine exposes \`takenCount\`, \`burnedCount\`, \`erodedCount\` and DUMP \`target\` so most choreography can use authoritative metadata without server schema changes.
- Distinct CSS generations in \`globals.css\` warrant selective cleanup only after active-call-site/test inventory.
- Real-world hardware/performance benchmarks have **not** been measured.
