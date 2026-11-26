# STACK Motion & UX: implementation audit and visual contract

_Reconciled 2026-11-26: React is the sole supported web frontend. Legacy Classic references below are historical._

## Active code paths

| Surface | Owner | Current behavior | QA |
|---|---|---|---|
| Core moves and card conservation | `packages/game-engine` (generated `dist/pilehead/engine.js`) | Sole deterministic local rules and bot logic; no animation authority | `tests/pilehead-engine.cjs`, `pilehead-physics.cjs`, room tests |
| Private online rooms | `api/pilehead.js`, `scripts/realtime-hub.cjs` | Revisioned Neon commits, authenticated WebSockets, polling fallback; server redacts private hands | `tests/pilehead-online.cjs`, `pilehead-realtime-contract.cjs`, `stack-next-browser.cjs` |
| React table | `apps/web/components/game-table.tsx` | Immediate authoritative card placement, adaptive hand packing, 2–5 seats, input handling and optional SFX | React browser acceptance |
| React motion contract | `apps/web/lib/motion-core.cjs` | Pure event classification, identity cursor, transfer/target/count contract, sound cursor | `tests/pilehead-motion-director.cjs` |
| React motion renderer | `apps/web/components/move-theater.tsx` | One latest committed effect, DOM-positioned targets, cancellation on new event/game/visibility/resize, quiet ordinary moves | `tests/stack-next-browser.cjs` |
| Motion CSS | `apps/web/app/globals.css` | Current `.move-story-stable` rules, non-blocking transform/opacity flights, reduced motion, hand stability | Browser screenshot artifacts and reduced-motion checks |
| Sound | `apps/web/lib/sound.ts` | Short original synthesized effects; disabled until player opts in | Pure event-cursor tests, preference checks |

The superseded React `react-special-ring`, `react-pickup-transfer`, `react-blind-reveal`, `move-story-flight` and `move-story-refill` presentation paths were removed in #77. Classic-only presentation has since been retired. Existing base `move-story-*` CSS is still intentionally inherited or overridden by `.move-story-stable`; removing it without computed-style acceptance would be unsafe.

## Event lifecycle and precedence

```
Local input → Engine.move or resolveDump → invariant checked → game state updated
Online input → authenticated API → revisioned Neon transaction → room snapshot/WebSocket
Both → render actual pile/hands/limits immediately → latest move cue → optional sound
On newer authoritative move/undo/room switch/rematch/tab hide → retire prior cue
```

- Ordinary card placements never create duplicate flights or explanatory announcements.
- `dump-pending` is a choice, not a committed transfer. The chosen recipient and old pile count come from the final event. A DUMP card goes to ashes.
- BURN and SLAM send only authoritative known pile count to ashes. SNAP completing four is labeled SNAP + BURN.
- Pickup sends the remaining public pile to the chosen hand. In opt-in Final Duel, visible-top erosion finishes first, then remainder travels. If only one card existed, no false remainder is shown.
- A blind face is rendered in a new cue only after the authoritative public reveal matches move and actor. No client may infer the face from a hidden deck.
- `RESET` clears the restriction, `GHOST` keeps it, `UNDER` persists as 1–4. SKIP identifies the skipped seat, not a presumed turn.
- Snap and Slam input is accepted/rejected solely by the engine/server. Neither CSS nor the sound cursor delays a move or extends a reaction opportunity.

## Motion design grammar

The canonical semantic names, symbols and cue lifetimes live in `EFFECTS` in `motion-core.cjs`; change them there before adjusting the matching CSS. Current cue ranges are approximately 410–1,330 ms, with the longer invalid-blind sequence deliberately revealing **before** the pickup. Transfer flight keyframes and their delays are separately defined by `.move-story-stable[data-kind]` in `globals.css`. Check computed styles rather than reading only the older base rule.

- **Ember:** BURN / SLAM. **Pink:** DUMP. **Gold:** pickup. **Red:** invalid blind. **Blue:** RESET. **Violet:** GHOST. **Mint:** UNDER. **Yellow:** SKIP. **Lime:** SNAP.
- Maximum overlapping consequential scenes: **one**. A later move cancels the previous visual; no backlog or attempt to replay delayed moves.
- Use transforms and opacity rather than continuously measuring geometry. Measure relevant DOM anchors on each new cue. Cancel viewport-fixed vectors on resize/hidden tab; *do not* cancel during incidental document scroll after a Play tap.
- Balanced is default. Full may add glow only; Reduced or OS `prefers-reduced-motion: reduce` removes flights while keeping a static, comprehensible action cue. Sound is opt-in and never substitutes for visual truth.
- Keep user-visible copy sparse: a short action name only for consequential events. Screen-reader status can carry actor, destination and count.
- Interactions must remain enabled even while a cue animates. There is no mandated frame delay before the next player acts.

## Reproducible browser evidence

`tests/stack-next-browser.cjs` runs against the **actual integrated Node server** and a deterministic mocked Neon backend. The CI artifact `stack-next-tabletop-visuals` includes representative captures at 360/390 px, 1280 px and 30–36-card hand stress. The expanded fixtures include 3- and 5-seat online rooms with two separate mobile browser profiles and bots; snapshots are checked for hidden-hand redaction and independently chosen deck themes. Action screenshots include BURN, DUMP, RESET, UNDER, GHOST, blind reject, SNAP burn and optional Final Duel erosion.

Browser CI is strong evidence for DOM correctness, visibility, layout and revision behavior. It is **not** a physical Android gesture/performance profile, a human comprehension study, or real two-phone networking. See issue #71 for remaining manual work. Preserve screenshots plus workflow URL and exact SHA when reviewing changes.

## Severity and nonnegotiable checks

- **P0:** wrong pile contents/recipient, hidden-card disclosure, SNAP/SLAM fairness, stale room resurrection, card identity duplication, unreachable last cards, rule drift. Revert the affected presentation change immediately.
- **P1:** incorrect direction/quantity display, audio duplication, unclear turn handoff, keyboard traps, viewport overflow, animation interruptions or canceled valid taps. Fix before labeling UX fully accepted.
- **P2:** decorative particle/glow consistency or optional richer motion. Do not increase CI or runtime complexity to solve a purely decorative issue.

No changes to the engine, room schema or hosting are justified solely by animation polish. Release checks and rollback procedures are in `docs/stack-motion-ux-release.md`.
