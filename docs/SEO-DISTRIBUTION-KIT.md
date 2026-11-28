# PILEHEADS — Organic distribution and press kit (draft)

Updated 2026-11-28. This is a reviewable editorial kit, not a public launch, third-party listing, or grant of artwork rights. Coordinate with [SEO acceptance #238](https://github.com/CartShift/pileheads/issues/238), [implementation #237](https://github.com/CartShift/pileheads/pull/237) and [commerce #172](https://github.com/CartShift/pileheads/issues/172).

## Verified product facts and copy

**Short description (draft):** PILEHEADS is an original illustrated shedding card game for 2–5 players. Empty your hand, then your table cards, before everyone else. Six special actions and matching-card interruptions can turn a round around. The browser playtest offers bots and private multiplayer; the physical 54-card deck is still in playtesting.

**Long description (draft):** One pile. One loser. PILEHEADS reimagines a familiar shedding-game family with original characters and a purpose-built deck. Match or beat the pile, clear it with BURN, send it to an active opponent with DUMP, or use matching numbers to SLAM. Try the game in a browser before bringing it to a physical table. The retail edition is not yet available; no price, release date, shipping destination or age/duration claim has been approved.

| Fact | Current statement |
| --- | --- |
| Brand | PILEHEADS |
| Category | Original illustrated shedding card game, physical-first and browser-playable |
| Players | 2–5 |
| Deck | 54 cards: four copies of each rank 1–10, 14 action cards across six actions, 16 unique faces |
| Actions | RESET, GHOST, UNDER, SKIP, BURN, DUMP |
| Other mechanics | SNAP, SLAM, Counter DUMP, final hand combo; optional Final Duel off by default |
| Browser | Playtest supports bots and private rooms; live acceptance required before promotion |
| Physical | Playtest / prototype; no retail availability announced |
| Links | https://pileheads.com/ ; https://pileheads.com/play ; https://pileheads.com/how-to-play ; https://pileheads.com/deck |
| Unapproved or unknown | Final retail age/duration, UPC/EAN, price, packaging specification, delivery, publication date, legal operator contact, review quotes, audience size |

Verify facts against current engine, `docs/pilehead-design.md`, and actual deployment before external use. No claims of native app availability, awards, popularity, completed retail product, affiliation with other games, or production performance.

## Asset selection (review manifest)

Select the exact published source files below; do not generate fake gameplay screenshots or reuse unapproved AI concepts as photography. The current source page references these files. Existing integrated tests assert the gameplay capture hashes and format/dimensions for sharing image. Actual visual inspection and commercial usage approval remain required.

| Asset | Project path | Intended use | Review note |
| --- | --- | --- | --- |
| Official logo | apps/web/public/stack-media/stack-home-logo-web.webp | Brand identity | Confirm final artwork and transparency |
| Social graphic | apps/web/public/stack-media/pileheads-social.png | Sharing / press preview | Generated build asset, 1200x630; check actual output |
| Desktop game capture | apps/web/public/stack-media/stack-home-gameplay-desktop-rc3.webp | Actual browser gameplay | Existing RC3 capture; refresh when UI changes |
| Mobile game capture | apps/web/public/stack-media/stack-home-gameplay-rc3.webp | Actual browser gameplay | Existing RC3 capture; verify no private data |
| Wide game capture | apps/web/public/stack-media/stack-home-gameplay-wide-rc3.webp | Actual browser gameplay | Existing RC3 capture |
| Card faces | apps/web/public/stack-media/cards/face-0-280.webp through face-15-280.webp | Illustrations | Generated assets; use higher-res approved production art for print |
| Box concept | apps/web/public/stack-media/stack-home-box-web.webp | Prototype packaging concept | Label as concept; replace with actual photography before retail launch |

Build a private distribution folder from approved original high-resolution assets and current screenshot files. Do not copy entire print-ready deck or grant reuse of full artwork automatically. Provide actual packaging photography once physical sample exists.

## Channel decisions, reviewed against public rules

- **BoardGameGeek:** defer game listing until rules and product are sufficiently finalized. Its [game submission guide](https://boardgamegeek.com/wiki/page/BGG_Guide_to_Game_Submissions) advises waiting while a game is still in development; [version guidelines](https://boardgamegeek.com/wiki/page/Versions_Guidelines) do not accept prototype versions. Participate appropriately in permitted playtest communities instead, only after approval. No listing created.
- **itch.io:** [HTML5 publishing guide](https://itch.io/docs/creators/html5) uses uploaded files embedded in an iframe. Current PILEHEADS production has same-origin multiplayer and frame-ancestors none; do not weaken security or embed the production game. Consider a separate explicitly approved local-bot demo or compliant project page after testing, checking [creator quality guidelines](https://itch.io/docs/creators/quality-guidelines). No account/project created.
- **Reviewer/creator outreach:** prepare a small list of genuine tabletop or browser-game reviewers; assess fit, disclosure and submission policies. No paid placement or link exchange by default. Share an approved review kit and only real functionality.
- **Physical product search:** [Google merchant listing guidance](https://developers.google.com/search/docs/appearance/structured-data/merchant-listing) relies on accurate product and offer information. Wait for commerce #172 and actual availability. No feed, fake reviews or Merchant Center activation.

## Creator pitch (draft, not sent)

**Subject:** PILEHEADS — an illustrated card game you can try in your browser

Hi [creator],

I'm working on PILEHEADS, an independent illustrated shedding card game for 2–5 players. The idea is simple: get rid of your cards before everyone else, but special actions and quick matching-card moves can change the pile completely.

There's a browser playtest with bots and private tables, so you can get a feel for the game before the physical deck is released. If it fits your coverage, I'd love to share the rules, actual gameplay screenshots and a playtest link. The physical deck is still in development, so I'm looking for honest feedback rather than a retail review.

Play: https://pileheads.com/play  
Rules: https://pileheads.com/how-to-play

Thanks for taking a look.

Use the actual approved operator contact and verify live play before sending. No implied compensation or review requirement. Approved campaign tags only: utm_source=creator, utm_medium=creator, utm_campaign=playtest. No identifying user parameters.

## Acceptance checklist

- [ ] Exact current release and actual browser functionality verified.
- [ ] Rules, screenshots, rights and product copy reviewed by owner.
- [ ] Approved contact and asset folder prepared; no private data or unlicensed art.
- [ ] Target channel eligibility checked; public listing/outreach explicitly approved.
- [ ] Any published placement recorded with date, URL, permitted tracking and actual referral evidence.
- [ ] No payment/offer, availability, ratings or release-date claims until #172 approvals.

This draft is not proof of outreach, distribution, physical production, or SEO impact.
