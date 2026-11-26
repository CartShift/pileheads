# PILEHEADS card artwork — White Border V7

The current illustrated deck uses the 16 card faces approved on 2026-11-26. The web sprites were composed from the individual files, not a regenerated collage. Slot order is numbers 1–10, RESET, GHOST, UNDER, SKIP, BURN, DUMP, row-major in a 4 × 4 grid. The rules engine and card IDs are unchanged. The V8 card back supersedes the previous back artwork without changing the V7 faces.

## Current source of truth
- Drive digital exports: https://drive.google.com/drive/folders/1ZA4WccE-1fJOewzw1F9nUhq9cLB7E18e
- `dist/pilehead/assets/stack-characters-v2.webp`: default V7 illustrated artwork, 2016 × 2816 (504 × 704 per face).
- `dist/pilehead/assets/stack-characters.webp`: compact V7, 1008 × 1420, retaining the existing compact sprite geometry.
- `apps/web/public/stack-media/stack-home-faces-{v2,web-desktop,web-mobile}.webp`: V7 marketing sprites, in the same slot order.
- `dist/pilehead/assets/stack-sheet.webp`: deliberately retained legacy Original theme; Studio remains a separate vector theme.
- `dist/pilehead/assets/stack-back*.webp`: V8 card back, exported at 504 × 704 from the approved white-border master.
- `apps/web/scripts/sync-assets.mjs`: copies the canonical simulator assets into the Next frontend.
- `tests/pilehead-raster-assets.cjs`: pinned hashes of the five updated exports and slot mapping checks.

V7 supplies the default/compact simulator themes (hands, opponents, piles, drag and travel animations), the gallery, print preview, lobby, landing-page card fans and illustrated rules. Gameplay screenshots (desktop, wide and mobile) are actual V7 browser acceptance captures from run 45878348885, cropped to omit the old header label and optimized for the web. Packaging/mascot illustrations are separate artwork.

Run `npm run test:pilehead-art`, `npm run build`, and the browser acceptance suite. Review the live homepage, /play, /pilehead/gallery.html, and /pilehead/print.html. Use the individual full-resolution masters for commercial print preparation, not web sprites.

## V8 card back (2026-11-26)
Canonical master: [PILEHEADS_BACK_white_border_v8.png](https://drive.google.com/file/d/12dM4rh7gm6YcA9M98dtbwoyVG106WedP/view) (1071 × 1496). Website exports: 440 × 615 and 300 × 419. The pure-white logo lettering and white outer border are preserved. Existing gameplay screenshots and embedded illustrations require separate visual refreshes; they are not updated by replacing runtime textures.
