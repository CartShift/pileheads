# STACK / PILEHEAD card artwork

The current deck uses one approved **4 × 4 raster sprite sheet** for all 10 numbered ranks and six special faces, plus a separate back.

## Current source of truth

- `dist/pilehead/assets/stack-sheet.webp`: sixteen approved card faces.
- `dist/pilehead/assets/stack-back.webp`: universal card back.
- `dist/pilehead/deck-raster.js` and `deck-raster.css`: sprite mapping and scalable rendering.
- `dist/pilehead/deck-art.js` and `deck-art.css`: required action/rank metadata and SVG-compatible renderer. Both scripts remain in use and load in order.
- `dist/pilehead/gallery.html`, `print.html`, `index.html`: gallery, printed sheets, solo and multiplayer tables.
- `tests/pilehead-raster-assets.cjs`: pinned approved raster digest, mapping, loading and build checks.

The deck has four copies of each rank 1–10 and two of each action: RESET, GHOST, UNDER, SKIP, BURN and DUMP. Art captions must match the real rules. Changing approved art requires updating its pinned test digest and visually reviewing the gallery, live table and print sheets.

Use `npm run test:pilehead-art`, `npm run build`, and inspect `/pilehead/gallery.html`. Print a physical sample before production.
