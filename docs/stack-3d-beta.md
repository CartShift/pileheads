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

## Cinematic composition pass (2026-11-21)

The opt-in beta now loads `3d-beta-v2.css` and `3d-beta-v2.js` after its original presentation assets. This is a reference-driven redesign with a rounded mahogany table, atmospheric lounge gradients, player portrait placeholders, compact opponent groups, room/round HUD, game-log and action sidebars, illustrated card art, and phone-adaptive controls. Local and online games continue using their existing controllers and server authorization; v2 rearranges live DOM nodes rather than duplicating or replacing move logic.

The first 3D renderer had a structural problem: it cleared all WebGL meshes whenever the canonical controller rerendered the DOM. It now retains card meshes across turns and distinguishes all three blind cards under face-up cards. Basic interpolated motion from a selected card to a newly played pile card has been added; it is still beta animation, not deterministic physical simulation.

**QA caveat:** Source-level routing/integration checks pass (including `pilehead-three-cinematic.cjs`) but no actual Chrome/Android screenshot comparison or complete live 2-device playtest has yet been performed for this visual pass. The generated player avatars are generic illustrations, not account profile photos. Do not describe the beta as pixel-perfect to the supplied visual until visually verified and adjusted on real desktop and phone viewports.

## Mobile corrective pass (21 November 2026)

A real Android screenshot showed a broken beta layout: the HUD covered opponent portraits, the face-up and hand rows collided, the deck back did not match the illustrated cards, and the bottom action toolbar was clipped. This was a **structural mobile composition failure**, not a Three.js shader issue.

Changes:

- `3d-beta-v2.js` now moves current turn, room tools and game HUD **outside and above** the table on narrow screens. It also moves the real action toolbar and move history **outside and below** the table. This keeps delegated gameplay handlers intact and removes the clipping caused by a fixed dock inside the table's overflow container. Desktop retains the cinematic side panels.
- `3d-beta-mobile.css` is loaded after the previous beta skins. It provides phone-specific header wrapping, single-purpose status bar, restrained opponent rail, separate real stock/pile, three face-up/blind cards, a readable horizontally scrolling hand, a body-level safe-area-aware action dock, and subdued wood grain without the distracting grid effect.
- For the Characters theme, beta 3D card backs now use a matching teal STACK sunburst texture; miniature 2D cards and fallback rendering follow that direction. Classic and other themes retain their own assets.

**Source checks:** `npm test` includes `tests/pilehead-three-mobile.cjs`, while the previous cinematic and engine-level checks remain. A separate browser gate was added at `tests/stack-three-mobile-browser.cjs`, run via `npm run build && node tests/stack-three-mobile-browser.cjs` after installing Playwright and Chromium. It checks 360, 390, and 430px mobile layouts, desktop, clipping, overlapping zones, interactions, and saves screenshots under `artifacts/browser/`.

**Visual verification still required:** The corrective CSS is committed, but the actual Android/desktop screenshot comparison and full two-device multiplayer QA were not executable from this environment. Do not claim perfect parity with the reference image or mobile production readiness until those screenshots have been inspected.

## Screenshot-driven correction (21 November 2026, follow-up)

The next Android screenshot still showed a displaced bottom Take Pile control, an intrusive Playtest tools bar, duplicate status placement, and corrupted/overlapping card textures. The causes were identified in source:

- The fixed phone toolbar was anchored at `left:0` while inheriting Classic's `transform:translateX(-50%)`. The beta now explicitly resets the transform, spans the viewport and applies a safe-area-aware fixed action dock.
- The controller's debug `playtest-tools` and `meta` nodes had default Flex order zero, which pushed developer UI **above the turn HUD**. The beta hides them on mobile; notices render after the tabletop instead of before the primary game state.
- The original 3D renderer scaled cards using rotated `getBoundingClientRect()` dimensions and then applied the rotation again. It also placed overlapping cards at the same Z depth. The renderer now uses offset dimensions, distinct per-card layer depths, nonsticky hover on touch, and color-preserving materials for illustrated faces.
- Mobile's four live board regions are now normal CSS grid rows rather than independent absolute percentages: opponents, stock/pile, face-up/blind, and hand. This prevents percentage drift and card-region collisions across phone heights.

The browser-level acceptance gate remains `tests/stack-three-mobile-browser.cjs`; the source regression suite covers the above contracts. **This is a committed beta repair, not proof of passing live visual QA.** The Render deployment and the visual output on a real Android browser must still be confirmed.

## Tabletop Studio v4 · screenshot-driven correction (21 November 2026)

The Android Studio screenshot was legible but still underwhelming: all card regions felt stacked vertically, the turn headline was dark against a dark HUD, the robot portraits were identical, and the bottom fixed Take Pile dock was uncomfortably close to the hand. The old Studio stylesheet was therefore **replaced**, not extended: `tabletop-studio.html` now loads `tabletop-v4.css` as its single Studio-specific stylesheet. Its scene adapter remains `tabletop-v3.js`, which shares the canonical local/online controllers and semantic input targets.

V4 changes:
- The phone table height uses `clamp(422px, calc(100dvh - 188px), 603px)` and proportional grid rows rather than 607px of fixed card zones. Card sizes also adjust to available viewport height, making the hand visible above the action dock on ordinary phone sizes.
- High-contrast gold turn status; differentiated main Play vs Take Pile controls; restrained typography and lighting; one centrally emphasized pile and stock.
- The three bot portraits are no longer identical, with distinct palettes/accessories from the same in-house SVG robot artwork.
- Desktop remains the cinematic layout with dedicated log and action areas. On phones those become a compact activity disclosure and safe-area-aware action dock.
- The Three.js wood/card renderer and existing 2D fallback are unchanged. Classic and the previous `3d-beta.html` are not modified by the new Studio CSS.

`tests/pilehead-tabletop-v3.cjs` now asserts the v4 layout and engine-preservation contract; `tests/tabletop-studio-browser.cjs` adds checks for the mobile action dock not overlapping the hand, and for the new Studio body class and contrast. Source-level checks passed. **Live WebGL + Android browser screenshots, real interactions, and Render deployment still require independent verification**. Do not call v4 pixel-perfect to the user reference based on source checks alone.
