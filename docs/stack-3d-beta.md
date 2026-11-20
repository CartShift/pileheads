# STACK 3D tabletop beta

The classic simulator is still the production default at `/pilehead/index.html`.

The **opt-in** Three.js presentation is `/pilehead/3d-beta.html`. Use `/pilehead/3d-beta.html?online=1` for room creation. Both versions share the same `engine.js`, `app.js`, `online.js`, 54-card deck, saved local session, Neon-backed online rooms, and validated move rules. Room URLs preserve their `?room=...` query when switching to Classic or Beta.

## Renderer design

- `3d-beta.html`: separate page using the canonical simulator scripts and controls.
- `3d-beta.css`: beta-only room ambiance, wooden tabletop, glass panels, gold actions, responsive layout, and short nonblocking comic effects.
- `3d-beta.js`: pinned Three.js WebGL presentation. The actual DOM card buttons remain pointer/keyboard targets. The renderer samples their geometry and paints textured 3D boxes in a transparent canvas below the semantic interface.
- Card textures are derived from **the actual shipped** 4 × 4 geometry/character sprite sheets and existing card-back image. Studio theme deliberately shows the classic 2D rendering.
- The scene never reads card secrets, writes game state, sends room actions, or changes move timing. All SNAP/SLAM/DUMP/take/selection rules remain in the authoritative original game.
- WebGL unsupported, CDN unavailable, or context lost: hide 3D and keep the existing DOM simulator playable.
- Pixel density is capped at 1.65 desktop / 1.3 mobile; beta rendering targets lower frame cadence on narrow screens and respects reduced-motion settings.

## Beta test checklist

1. Open Classic and Beta in separate tabs, verify both URLs work and Beta shows the real character card art in all six actions plus ranks 1–10.
2. On local mode, deal 54 cards (including four BURN), change opening face-up cards, play single/matching cards, take the pile, play special cards, and finish a round.
3. Confirm a selected card glows/lifts and that moving a card is accomplished through the **real** Play/drag actions. The renderer should never intercept touch or keyboard input.
4. In Beta and Classic, use a live 2-device room: join, swap setup cards, ready, start, play, DUMP-select any active opponent, SNAP without blocking the next turn, concurrent SLAM, reconnect, finish, and rematch.
5. Switch Classic → Beta → Classic while in the same `?room=...` room and ensure no seat, hidden hand, or shared game state is lost.
6. Test 360px phone portrait, phone landscape, desktop, reduced motion, no WebGL, and poor network conditions. For huge hands verify that card scrolling remains understandable.
7. Inspect the renderer on actual low- and mid-range Android devices for frame pacing, memory leaks, shadow readability, and card/art cropping.

## Acceptance status

Source-level beta checks are in `tests/pilehead-three-beta.cjs`, auto-discovered by `npm test`, and the Render build manifest includes the new beta files. **Do not claim live 2-device or real WebGL visual QA from this test alone.** The interface is intentionally a **beta** and the 3D look is an incremental rendering layer, not a complete 3D game rewrite.

## Rollback

The default game uses neither `3d-beta.js` nor `3d-beta.css`; simply open `/pilehead/index.html` to use the original renderer. Revert the build-manifest beta entries and remove the classic-navigation beta link if retiring the experiment. Do not touch the authoritative rules, database, API, or shared card state.
