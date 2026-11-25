# STACK homepage V3 refinement

Source: approved Homepage V2 visual concept in Drive (1zy1cbbli_Btag1yZYRHUIXyu-M70mTYX). Preserve real V2 card illustrations and factual marketing claims.

Implemented first pass: local Barlow Condensed Black Italic (Google Fonts, OFL 1.1; license adjacent to asset), scoped editorial CSS, print grain and procedural cloud ornaments, vector benefit icons, stronger headline/CTA hierarchy, responsive spacing and actual left/top packaging review panels from STACK_Packaging_Flat_V2.zip. CSS 3D box is a concept render, not a photograph or manufactured product.

Release gate: compare 320/390/768/1440 screenshots with approved reference, check font/network requests and all links, run integrated build and regressions, inspect rendered box faces. Remaining: actual V2 simulator capture, more detailed source-faithful decorative art and product lighting, keyboard/reduced-motion interactions, performance/SEO/accessibility measurement and commercial readiness. No retail claims, fabricated testimonials, checkout or changes to game rules.

Second pass: added finite reduced-motion-aware entrance and touch feedback, truthful physical deck discovery CTA, updated stale Next landing test selectors, and a reproducible real Illustrated V2 screenshot script. Run `node scripts/capture-stack-marketing.cjs` after integrated build using the existing Playwright installation. Review output before replacing the old capture.

Third pass: restored the mockup's orange/red/blue hero card sequence and red-band three-part composition, added responsive two-part packaging and card fan on mobile, headline text range clipping assertions, and strict local font load check. Capture supports STACK_MARKETING_WIDE=1 for a real landscape tabletop image. Wide screenshot is not yet integrated; choose the best verified composition after capture.

Fourth pass: 5ff668e passed production build, static integration, browser acceptance on all four widths and both real V2 capture scripts in the hash-verified isolated overlay. Added the beach mascot traced/cropped from approved homepage concept (no generated replacement of the cards), organic printed-band edges and corrected grain tiling. This new revision requires another visual check. Real V2 captures pending integration.

Fifth pass: reviewed actual 390px and 1440px full-page screenshots of verified 5ff668e. Reduced stack overlap on Explorer and tightened over-tall digital band; added actual responsive Illustrated V2 gameplay captures from the verified browser run. Desktop capture is full-page 507×600 and mobile 321×860; not a fabricated UI. Further landscape refinement and final V3 QA remain pending. Original mockup testimonials still omitted.

Sixth pass: added genuine 1440px-derived gameplay capture (731×620 WebP) on desktop; tablet and phone preserve their own capture. Reduced Next Link prefetch into the game, focusable skip destination, and repeatable lab quality baseline (`node scripts/audit-stack-homepage.cjs`). Lab measurements are not field Web Vitals or a Lighthouse score. Public domain/canonical SEO, analytics consent, shop and real retail claims remain launch-dependent.

Seventh pass: b16a6c4 passed production build, all 32 regression files and 144 simulated matches, four browser sizes, keyboard skip target and basic metadata. Lab LCP 7192ms desktop / 9868ms throttled mobile; CLS .0581/.0061, transfer 2.124/1.845 MB. LCP target not met. Added responsive source-derived WebP derivatives with strict sprite budgets; original full-resolution artwork preserved. Moved MotionProvider to /play only (the game retains reduced-motion config); homepage no longer loads it globally. New audit records LCP element and largest resources. Re-run final visual and performance checks before release.
