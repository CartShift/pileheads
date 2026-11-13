# PILEHEAD · First-person table redesign

Purpose: Make the existing PILEHEAD gameplay feel like sitting at the near rail of a physical felt table. This is a UI-only upgrade; rules, deck and opponent privacy remain unchanged.

## Visual direction

The player's hand is nearest and largest, with a computed fan and tactile lift/selection. Face-up/face-down cards rest farther away. The shared pile is the central focus. Opponents sit beyond it and show both a fan of hidden card backs (their hand count) and their separate public cards. Walnut rail, green felt, paper-textured ivory faces, brass trim and expressive action colors create physical depth without an external 3D engine.

Color tokens: walnut #3b2b21; felt #10493b; dark felt #092d27; ivory #f4ead2; gold #f0c887; terracotta #d86a44.

## Shared implementation

- dist/pilehead/immersive.css: seat-focused layout, playing surface, card fan, accessibility and responsive portrait/landscape design
- dist/pilehead/immersive.js: shared UI enhancer for offline and online games, public-card flight, visual SLAM/BURN cues, optional synthesized sound and fullscreen
- dist/pilehead/app.js: existing bot and hotseat rules unchanged; mobile dragging, scrolling through large hands and multi-card selection are preserved
- dist/pilehead/online.js: exactly the same viewpoint for network players, only showing public opponents' cards and anonymous card backs
- dist/pilehead/index.html: immersive assets loaded before each game controller
- tests/pilehead-firstperson.cjs: contract tests for shared UI, keyboard and media-queries, CSS syntax and build registration

## Usability constraints

- Tap-to-select, keyboard selection and explicit buttons continue to work without drag gestures.
- Large picked-up hands must scroll horizontally; they cannot be clipped or make card swiping impossible.
- Sound is muted by default, turns on only from explicit user action, and is procedural rather than copyrighted recordings.
- Reduced-motion mode disables decorative movement without altering the game.
- Hidden opponent hands and face-down cards must never be revealed by animation.
- The Vercel and ChatGPT Sites builds copy both immersive assets.

## Verification still required

Run tests and review the rendered UI at 360px portrait, tablet, 1440px desktop and landscape phone. Inspect scrolling, accessibility, focus, selected-card legibility, card placement and SLAM feedback on actual touch devices. No code-level test establishes that physical game feel is perfect.

Online room backend activation and two-device end-to-end testing remain separate from this visual redesign; do not claim online rooms work merely because the interface renders.
