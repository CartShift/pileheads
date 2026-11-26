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

V7 supplies the default/compact simulator themes (hands, opponents, piles, drag and travel animations), the gallery, print preview, lobby, landing-page card fans and illustrated rules. Gameplay screenshots (desktop, wide and mobile) are actual browser acceptance captures with V7 faces and V8 card back from run 45891297629, cropped to omit the old header label and optimized for the web. Packaging/mascot illustrations are separate artwork.

Run `npm run test:pilehead-art`, `npm run build`, and the browser acceptance suite. Review the live homepage, /play, /pilehead/gallery.html, and /pilehead/print.html. Use the individual full-resolution masters for commercial print preparation, not web sprites.

## V8 card back (2026-11-26)
Canonical master: [PILEHEADS_BACK_white_border_v8.png](https://drive.google.com/file/d/12dM4rh7gm6YcA9M98dtbwoyVG106WedP/view) (1071 × 1496). Website exports: 440 × 615 and 300 × 419. The pure-white logo lettering and white outer border are preserved. Homepage gameplay screenshots were replaced with genuine V8 browser acceptance captures from run 45891297629, preserving their previous dimensions. Embedded card-back artwork was updated on GHOST, BURN and DUMP by projecting the exact V8 master onto the existing card surfaces. The remaining 13 face tiles, game rules, characters and layout were preserved before re-encoding WebP variants at comparable sizes. Historical concept and legacy deck artwork is not part of this update.

## V7.1 exterior-only QA
Six number PNG masters (4, 5, 6, 7, 9, 10) had black pixels outside the rounded white border. Those pixels were replaced with pure white without changing the interior illustration. The full-resolution simulator and website sprite tiles are updated, preserving dimensions and card order. The compact simulator sprite already had white exterior pixels and is retained byte-for-byte. The canonical Drive index is https://drive.google.com/file/d/1CCaVYRFpQ2S2cUk1W3beMzMRptfCIw0h/view and the complete 17-artwork master bundle is https://drive.google.com/file/d/1CfTGIQIYjfe9uJAT_wKeKYNUx7ky7CuN/view. The physical A4 proof is for home testing only.
