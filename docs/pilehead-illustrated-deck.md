# PILEHEAD · Illustrated Card Design v1

This implementation follows the approved infographic in a vector-based interactive deck. The final retail game name is **not** selected yet. PILEHEAD remains a temporary title. No artwork changes game rules or card counts.

## A single source of truth

- `dist/pilehead/deck-art.js`: accessible names, shared markup, 10 numbered templates, six individually drawn vector action scenes, symmetric card back and small public face-up miniatures.
- `dist/pilehead/deck-art.css`: paper/ink/gold numbers, distinct special-card palettes, clear small-card states, container-relative typography and print-color fidelity.
- `dist/pilehead/gallery.html`: all 16 distinct faces + a card back, with copy counts.
- `dist/pilehead/index.html` + `app.js`: local bot/hotseat tabletop, card selection, piles and setup views use shared art.
- `dist/pilehead/online.js`: online players see identical artwork and only public opponent faces.
- `dist/pilehead/immersive.js`: physical-flight visuals use identical card faces and backs.
- `dist/pilehead/print.html`: prints the *same* artwork at 57 × 82 mm with optional back sheets.
- Both Vercel and Sites build manifests include the gallery, CSS and JS. No external artwork hosting or client-side framework dependency.

## Art direction and system

**Number cards:** Warm cream stock (#f7edce), deep teal numerals (#0d3b33), fine golden frame and crest, small upper/lower number indices and subtle sunburst geometry. All 1–10 are ordinary ranks with identical visual hierarchy. No suits, rank color-coding, or implied powers. Four identical copies of each rank.

**Action cards:** Six visually distinct action faces with one symbol and an expressive vector narrative, all following the same hierarchy (crown, uppercase name, central illustration, one-line/short rule caption). Two copies each:

| Action | Color | Illustrated motif | Behavior |
| --- | --- | --- | --- |
| RESET | Cyan / teal | two circular sweeping arrows | reset active number limit |
| GHOST | Violet | passing translucent ghost in diamond | preserve numeric restriction |
| UNDER | Amber | a hurdle marked 4 and a low swooping arrow | next number must be 1–4 |
| SKIP | Green | arrow leaping over a seated pawn | skip next player |
| BURN | Coral red | burning stack of physical cards | remove pile; play again |
| DUMP | Magenta | shove a whole stack onto the next player | next player picks up pile; actor plays again |

**Universal back:** Deep-teal, golden patterned field with centered crown, temporary title and pile glyph. No cards identify their rank or action from the reverse.

**Motion/accessibility:** Artwork has `aria-hidden=true` while card buttons retain semantic action/rank names. Touch drag, card selection, responsive hand scrolling, focus outlines and reduced-motion paths are kept. The card rules remain available in the in-game rules list when fine print is hidden on compact face-up cards.

## Production checklist / known limits

- New decks are SVG/CSS vectors, not raster screenshots cut from a concept image. The high-detail textures are approximated with vector color and subtle CSS print textures.
- Visual appearance requires actual browser review at phone portrait/landscape and desktop sizes. Source-level checks cannot certify legibility on actual printed stock.
- Print A4 at actual size, use opaque sleeves or independently aligned backs, check color coverage/legibility on one test sheet. A print shop may require bleed/CMYK conversion and a professionally prepared die-cut template before retail manufacture.
- A permanent brand name and logo should replace PILEHEAD only *after* the naming process. The provisional crown/crest is a playtest graphic, not a final trademark.
- Online multiplayer activation requires separate Vercel database configuration; rendering updated cards does not turn that service on.

## Verification

Run `npm run test:pilehead-art`, `npm run test:pilehead-ui`, `npm run test:pilehead` and `npm run build:vercel` for the relevant contracts. Human playtests and visual inspection are still necessary.
