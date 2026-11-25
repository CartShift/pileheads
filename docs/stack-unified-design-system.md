# STACK unified design system
Canonical CSS: apps/web/public/stack-media/stack-design-system.css.
The V3 marketing homepage defines the approved identity: cream paper, charcoal ink, teal, red, yellow, Barlow Condensed Black Italic, original logo, printed grain, pill CTAs.
Public surfaces: /stack, /play, /pilehead/index.html, /pilehead/gallery.html, /pilehead/playtest.html, /pilehead/print.html, /pilehead/endgame-lab.html. Root redirect is intentionally unchanged for compatibility.
Shared tokens and brand links apply across all surfaces. Editorial pages use printed-paper layouts; tabletop screens keep dark felt and their compact layout to prioritize play. All print-specific geometry, survey logic, engine code, card art and player state are unchanged. Hebrew headings retain a suitable system font; printed pages retain ink-efficient styling.
Test both standalone and integrated builds, route screenshots at 320/390/768/1440 widths, keyboard focus, bot/room flows, gallery counts, print front/back count and Hebrew form. This is a first unified implementation; rendered verification and final QA are required before release.
