# RFC: PILEHEAD Free-to-Physical growth and commerce
Status: proposed, implementation not started | Date: 2026-11-18 | Repository: \`yotamon/spark-card-game\`

## 1. Decision and non-goals

**Decision:** Make the fully playable, free PILEHEAD game the discovery/referral channel for its paid physical 52-card deck. Launch the first physical-deck **interest list**, then enable checkout only when the product, seller, pricing and logistics are real.

**Goals**
- Let guests play immediately against bots or in private online rooms, without a commerce account or email gate.
- Offer a non-intrusive "Physical deck" discovery route from entry, the game menu and the shared end-of-round result.
- Build one product landing page and a confirmed opt-in list. Measure whether playing drives qualified purchase intent.
- Generate natural invitation/referral loops; never require players to invite others to unlock game features.
- Later accept direct orders for a physical deck in Germany, with securely hosted checkout and clear shipping/returns terms.
- Keep the existing game state, room privacy, mechanics, rematch and SPARK functionality independent and unchanged.

**Non-goals for the first release**
- Not building Shopify storefront, customer accounts, loyalty points, pop-up ads, in-game payment gating, detailed player tracking or a full analytics SaaS.
- No real money collection, preorder commitments, stock counters or shipping promises until seller/legal/manufacturing checks pass.
- No unverified photos implying a final product already exists. Illustrations/renders must be labeled "prototype preview" until verified.

**Offer:** one physical PILEHEAD deck: proposed retail price EUR 14.90, **including applicable VAT** once seller tax status is known. Shipping separate and displayed before payment. Two-deck pack EUR 26.90 is a **hypothesis**, gated on cost/shipping quote; do not publish unvalidated economics.

## 2. Existing code baseline (reviewed 2026-11-18)

| Component | Current source | Implementation approach |
| --- | --- | --- |
| Shared main navigation | \`dist/pilehead/index.html\` lines 109–115 | Add a restrained "Physical deck" link; collapse other secondary links into accessible menu at small screens. Do not crowd mobile header. |
| Local setup and gameplay | \`dist/pilehead/app.js\` | No changes to \`PileheadEngine\` or persisted local game. Instrument non-identifying lifecycle events outside game state if approved. |
| Online lobby and invite | \`dist/pilehead/online.js\` | Preserve \`?room=\` private join URL only during joinable lobby; use generic public game link for post-game share. Never send room code or bearer token to marketing. |
| Shared finale and focus trap | \`dist/pilehead/immersive.js\` \`resultHTML()\`, \`syncResult()\` | Add optional, subdued physical product panel/anchor **after** existing primary rematch action; retain modal role, focus trap, reduced-motion. |
| Authoritative online game | \`api/pilehead.js\` with dedicated Neon Postgres | Keep transactional gameplay state separate. Add marketing APIs/tables, no marketing fields inside \`pilehead_rooms.state\` and no dependency from game availability to marketing availability. |
| Static deployment | \`scripts/build-vercel.mjs\`, \`scripts/build.mjs\`, \`vercel.json\` | Whitelist new static assets for Vercel and Sites; server API available on Vercel only. |
| Regression tests | \`tests/pilehead-*.cjs\` | Extend finale, mobile navigation, privacy, build assets and API tests. |

**Critical flow detail:** Currently existing-room invitations are joinable only during lobby; sharing a completed room URL is not a valid way to invite a new player. The "challenge a friend" action after a round should send a **generic free-play link**, or create a *new* lobby before sharing a private room URL. Rematch in the same room is for existing seats.

**Technical debt outside this scope:** The global legacy \`npm test\` suite has previously included an unrelated SPARK VM parity failure. Preserve the PILEHEAD-only Node 24 CI gate; repair the SPARK test separately rather than weaken the PILEHEAD suite.

## 3. UX information architecture and copy

Routes proposed (same origin, no separate commerce domain):
- \`/pilehead/index.html\` — existing free local experience.
- \`/pilehead/index.html?online=1\` — existing online lobby flow.
- \`/pilehead/deck.html\` — physical product page, initially interest-list mode.
- \`/pilehead/confirm.html\` — double-opt-in confirmation UI.
- \`/pilehead/thanks.html\` — post-subscription confirmation, not checkout success.
- Later: \`/pilehead/order-success.html\` — factual post-checkout status; **not** sufficient proof of payment.
- Required site-wide legal pages or links: Impressum, Datenschutzerklärung, and when selling, applicable purchasing/withdrawal/shipping policies.

### Touchpoints
1. **Entrance:** small persistent "Physical deck" link, never competing with "Play". On mobile, put it in an overflow/menu that remains keyboard-accessible.
2. **In-game:** low-emphasis link via existing menu only. **Never** show a modal during a turn, SNAP countdown, SLAM response, connection recovery or while cards animate.
3. **Finale:** rematch remains the primary CTA. Below rematch, short line: **"Loved the chaos? Bring it to the table."** Product thumbnail + **"See the physical deck"** secondary link. Offer "Challenge a friend" as another secondary action. Keep first-screen mobile hierarchy and existing focus containment.
4. **Deck page:** hero with deck mockup marked "Prototype preview"; 52 custom cards, special mechanics, 2–5 players, price target EUR 14.90 clearly labeled as **planned**, shipping/TBD availability honestly stated, compact "Play for free" route, waitlist form. At checkout stage replace interest-list CTA with live buy CTA via feature flag.
5. **Post-confirmation:** thank you, confirmation status, no scarcity or urgency claims; link back to play/share.

### Suggested messaging
- Master brand: **PILEHEAD**
- Headline candidate: **Easy to learn. Hard to forgive.**
- Product tagline candidate: **Same chaos. Real cards.**
- Entry CTA: **Play free**
- Finale: **Bring the chaos to your table**
- Prestock CTA: **Get notified when the first deck drops**
- Paid CTA only after stock/legal/payment launch: **Get the physical deck · €14.90**

**Design:** reuse PILEHEAD felt green / ink / warm accents / card illustrations from existing game. Product page should feel like a physical collectible on a felt table, not a generic SaaS funnel. Ship English initially; plan German copy and statutory pages before Germany-wide paid advertising or purchases. Never use emoji-only action controls; preserve labels and focus states.

## 4. Phased implementation and PR breakdown

### P0 — Instrumentation contract, UX detail and legal prerequisites (small, no production behavior changes)

- [ ] Approve funnel copy, mockups and mobile placement in existing design language.
- [ ] Define event dictionary and source attribution: \`entry_nav\`, \`game_finale\`, \`menu\`, \`shared_link\`, \`external\`, \`unknown\`.
- [ ] Decide analytics legal basis: aggregate events without persistent unique device identifiers by default; no marketing cookies/fingerprints without valid consent.
- [ ] Validate seller entity and registration, privacy notice, legitimate contact email and prospective domain.
- [ ] Document inventory/fulfilment and product image quality requirements.
- [ ] Add feature flags: \`PILEHEAD_WAITLIST_ENABLED=false\`, \`PILEHEAD_CHECKOUT_ENABLED=false\`; no "fake" working form.

**Gate:** approved UX flow and event names; explicit environment-dependent off states.

### P1 — Product page + navigation + finale CTA (one small PR)

- [ ] \`dist/pilehead/deck.html\`: static accessible page, SEO/canonical metadata and truthful product preview, no email capture until backend is ready.
- [ ] \`dist/pilehead/deck.css\` (or reuse a scoped stylesheet) and optional minimal JS. Avoid loading game engine on product page.
- [ ] Add "Physical deck" to existing navigation; mobile overflow/focus QA.
- [ ] Add secondary physical-deck entry and a share CTA in \`resultHTML()\`. Rematch stays first and main.
- [ ] Ensure product links work for both bot/hotseat and online without leaking \`?room=\` or \`_vercel_share\`.
- [ ] Update both static asset whitelists: \`scripts/build-vercel.mjs\`, \`scripts/build.mjs\`.
- [ ] Add regression: shared local/online finale includes expected CTA; no dynamic player-name injection; footer/menu accessible; no content behind narrow mobile viewport.
- [ ] Do one real-phone test in landscape and portrait before merge.

**Gate:** players can complete a game, replay normally, view the product page, and return without any gameplay regression.

### P2 — Verified, consent-based waitlist (one backend PR + one UI PR)

- [ ] New Vercel server functions separated from \`api/pilehead.js\` (e.g. \`/api/pilehead-waitlist\` and \`/api/pilehead-waitlist-confirm\`).
- [ ] Minimal contacts/consent persistence with independent marketing schema and restricted DB credentials; avoid storing contact details in room state or client local storage.
- [ ] Integrate an email provider (candidate **Resend**) using *server-side* API keys and a verified sender domain. Use opt-in double-confirmation before treating a contact as subscribed.
- [ ] Never attach waitlist email to game identity, room code, private hand or referral token.
- [ ] \`POST /api/pilehead-waitlist\` accepts validated \`email\`, \`consent\`, locale, and whitelisted coarse source. Return the same non-enumerating response for existing/not-yet-existing addresses; rate-limit and send a neutral verification email.
- [ ] Store pending confirmation token hash / short TTL; no raw email or tokens in logs. \`/pilehead/confirm.html?token=...\` renders a page with an explicit confirmation button that **POSTs** the one-time token (avoids mail link-scanner auto-confirmation).
- [ ] On confirmation, record consent date, specific notice version, confirmation timestamp, source and provider contact ID. Ensure repeat clicks are safely idempotent.
- [ ] Offer unsubscribe and erasure requests, confirmed-only mail, minimal retention and export/deletion controls, verified from staging.
- [ ] No third-party advertising trackers, auto-subscribing game players, pre-checked opt-in or bundled newsletter agreement.
- [ ] Graceful provider outage: game remains playable, product page explains that signup is temporarily unavailable.
- [ ] Backend contract tests cover validation, consent, duplicate signup, TTL expiry, enumeration resistance, provider outage and failure/rollback handling.

**Suggested data model (conceptual; adapt to provider):**
\`\`\`text
pilehead_waitlist_subscriptions
  id: UUID PK
  email_hash: HMAC(email normalized) UNIQUE
  provider_contact_id: nullable
  status: pending | confirmed | unsubscribed
  locale: en | de
  source: enum
  consent_version: text
  consent_at: timestamp
  confirmed_at: timestamp nullable
  unsubscribed_at: timestamp nullable

pilehead_confirmation_tokens
  token_hash: PK
  subscription_id: FK
  expires_at: timestamp
  consumed_at: timestamp nullable

pilehead_aggregate_events
  date: YYYY-MM-DD
  event: enum
  source: enum
  channel: enum (local_bots, local_hotseat, online)
  experiment_variant: enum nullable
  count: integer
  UNIQUE(date,event,source,channel,experiment_variant)
\`\`\`

Do not store raw IP addresses, private session bearer tokens, room codes, personal names or hidden cards in marketing analytics.

**Gate:** a confirmed signup can be evidenced, unsubscribed and erased; no secret leaks; waitlist remains optional and non-gating.

### P3 — Organic referral loop + metrics (small PR)

- [ ] "Challenge friends" at end of round uses Web Share API with Clipboard fallback on a direct tap/click; generic free-play URL, not the finished room URL.
- [ ] New-room invites remain available from joinable lobby; if user wants to invite new players after match, create a new room before sharing its invite link.
- [ ] Preview \`og:title\` / \`og:description\` / \`og:image\` for playable page and product page with approved branded card artwork; do not leak private state.
- [ ] Use coarse \`?src=shared_link\` and \`?from=game_finale\` source tags, no user-specific identifiers. Sanitize/allowlist and drop unrecognized fields.
- [ ] Event schema:
  \`game_started\`, \`game_completed\`, \`rematch_started\`, \`deck_cta_clicked\`, \`deck_page_viewed\`, \`waitlist_submitted\`, \`waitlist_confirmed\`, \`share_intent\`, \`checkout_started\`, \`purchase_paid\`.
- [ ] Online completion measured on **authoritative server** once per room and round; local completion deduplicated in memory per run as well as possible without persistent identifiers. No private card/player state. Count-based conversion proxies are **event ratios, not unique-player conversion rates**.
- [ ] Dashboard for aggregate daily/weekly volume by source, medium and device size category (avoid fingerprint-style granular dimensions).
- [ ] Log event schema version and discard malformed/high-cardinality properties; abuse prevention and rate limiting.
- [ ] A/B experimentation **later only when enough eligible volume**; do not falsely interpret tiny samples.

**Gate:** can derive directional \`confirmed_waitlist_count / completed_round_count\` over a fixed time period, clearly labeled as an aggregate proxy; no nonessential storage without requisite consent.

### P4 — Real physical sales (separate release with external sign-off)

**Only after verified product, supplier pricing, responsible seller, realistic delivery plan and compliance:**
- [ ] Choose **Stripe Checkout** first, not a full Shopify storefront. Price ID and amount are server-authoritative; no client-submitted monetary amounts. Product(s), shipping zones and tax rates based on actual tax advice.
- [ ] Build \`POST /api/pilehead-checkout\` with server-side validated SKU and quantity; create Stripe-hosted Checkout Session. Never handle raw card information.
- [ ] Verify signed Stripe webhooks; idempotent paid order creation and eventual order fulfilment; no reliance on \`/order-success.html\` alone. Keep paid order/customer records separate from game and waitlist; consent to newsletters **separate** from purchase.
- [ ] Specify shipping charges and supported countries **before commitment**; product availability and delivery date must be accurate; tax/VAT handling, invoices, refunds, customer support, returns workflow and stock control.
- [ ] Link Impressum, privacy policy, applicable checkout terms and withdrawal information; ensure rights and delivery details are available. Address GPSR consumer product obligations and VerpackG/LUCID/packaging system participation in Germany as applicable. Verify legal/business registration for sale of goods.
- [ ] Feature-flag rollout, full staging test and live low-value test/refund; server must refuse checkout while disabled.
- [ ] Later consider Shopify or fulfillment software when there is enough actual throughput to justify recurring overhead.

**Gate:** deliverable stock, economic unit margin, validated checkout payment/refund/fulfilment, signed compliance review.

## 5. Key product/engineering invariants

1. **Game always playable if marketing email provider, metrics or checkout is down.** Marketing failures never mutate \`PileheadEngine\` or block room actions.
2. **No forced upsells.** No commerce UI inside active turn, SLAM/SNAP, loading, or connection-error recovery.
3. **No dark patterns.** No fake scarcity, fabricated social proof, misleading product photography, or sale before real delivery plans.
4. **No player tracking without an appropriate legal basis.** Privacy-first aggregated counts are not necessarily automatically exempt; review GDPR/TDDDG application before enabling.
5. **Session isolation.** Marketing API never receives a room session token; never include room code or \`_vercel_share\` in marketing analytics or public share links. Keep multiplayer token in game-only client storage as currently designed.
6. **Accessibility.** All controls keyboard/touch accessible, modal focus remains trapped, reduced motion honored, mobile 360px and desktop 1440px check; no extra card animation caused by UI CTA rendering.
7. **Server authority.** Money and waitlist confirmations are server-controlled; rate limits, payload size caps, CSRF/origin checks and logged error redaction.
8. **Safe deployments.** Checkout disabled by default, staging/prod secrets separated, migrations backward compatible, reversible UI feature flags. No direct modifications to SPARK D1 backend.

## 6. Measurement and experimentation

**North-star business outcome:** count of paid physical-deck orders originated via the free game once commerce is live.

**Prior to sales:** confirmed (double-opt-in) deck-interest registrations from game-related acquisition sources, measured alongside completed rounds and voluntary rematches.

| Stage | Metric | Definition | Caveat |
| --- | --- | --- | --- |
| Discovery | landing/game starts by coarse source | counted events/day | Not unique individuals without consent |
| Engagement | completed rounds and rematch events | server-authoritative online, best-effort local | Some local duplication possible after reload |
| Product interest | finale/menu/deck CTA clicks | explicit outbound product navigations | Need distinguish game vs external traffic |
| Lead intent | confirmed waitlist registrations | confirmed contacts with consent | Self-selection; not proof of purchases |
| Monetization | paid orders, AOV, contribution margin | signed successful payments, net VAT, fulfilment, costs | Chargebacks, refunds and discounts must reconcile |

**Pilot decision criteria, not historical results:**
- Human playtests: 12 independent groups; at least 70% spontaneous repeat round requests (from earlier playtest protocol), plus full game comprehension.
- Waitlist: initially seek **100+ confirmed contacts from people outside the founders' immediate circle** and track the ratio of CTA clicks to completed games (without making up a unique-user conversion rate).
- Conversion experiment: only launch paid preorders after plausible delivery and explicit terms, ideally evidenced by a meaningful count of genuine paid commitments.
- Marketing CAC ceiling: start as a contribution-margin budget from actual landed product/shipping costs; organic attention is not zero cost in developer/creative hours.
- Separately label all paid, organic, friend and referral traffic. Review weekly; prevent admin/self-testing from contaminating the sample where practical.

**A/B tests to consider after launch volume grows:**
- Hero: physical card artwork vs actual tabletop photo.
- Product CTA text: "Get the deck" vs "Bring it to the table".
- Bundles: 1 pack vs 2-pack upsell, only once shipping and fulfillment economics are verified.
Avoid simultaneous changes to rules, CTA position, copy and channel targeting.

## 7. Practical release sequence and dependency map

\`\`\`text
Gameplay baseline (exists)
    |
    +-- P1 product page + calm navigation + finale CTA
    |         |
    |         +-- P2 consent-compliant waitlist / Resend
    |         |         |
    |         |         +-- P3 organic sharing and aggregate funnel metrics
    |         |                     |
    |         |                     +-- Human playtest + waitlist validation
    |         |                                 |
    |         |                                 +-- Supplier, legal & stock gates
    |         |                                             |
    |         |                                             +-- P4 Stripe checkout + fulfillment
    |
    +-- Game engine / online rooms remain independent throughout
\`\`\`

**Recommended PR boundaries**
1. \`feat/pilehead-deck-landing\` — static product page, header, end-of-round product CTA, responsive QA.
2. \`feat/pilehead-waitlist-api\` — schema, Resend, DOI, unsubscribe, secret/rate-limit/test contracts.
3. \`feat/pilehead-waitlist-ui\` — connect form, verify screens, legal/footer and accessible states.
4. \`feat/pilehead-sharing-and-events\` — share/referral, metrics and data-sanity tests.
5. \`feat/pilehead-stripe-checkout\` — only after business/compliance gates, with webhook, stock and refunds.

**Follow-up operator tasks**
- Identify seller entity and domain, verify Resend sending domain, provide credentials via encrypted Vercel env (never GitHub).
- Prepare honest physical-deck packaging image or labeled prototype mockup and one printed quality-control sample.
- Approve product shipping geography, eventual VAT treatment and supplier landed-cost quotes.
- Verify live site access: public free game vs restricted preview/private SPARK surfaces.
- Test with real human groups before buying hundreds of physical decks.

## 8. External documentation checked for operational planning

- German email double-opt-in and consent evidence: https://www.ihk.de/hannover/hauptnavigation/recht/e-business-recht/newsletter-rechtliche-voraussetzungen-5205352
- German consent and tracking constraints (TDDDG): https://www.lfd.niedersachsen.de/startseite/infothek/faqs_zur_ds_gvo/faq-telekommunikation-digitale-dienste-datenschutzgesetz-tdddg-206449.html
- Resend verified contacts and suppression: https://resend.com/features/audiences and https://github.com/resend/resend-double-opt-in-example
- Stripe Germany official pricing and hosted checkout: https://stripe.com/en-de/pricing and https://stripe.com/en-de/payments/checkout
- IHK Berlin shop legal requirements: https://www.ihk.de/berlin/service-und-beratung/recht-und-steuern/vertragsrecht-online-recht/medien-it-recht/rechtliche-anforderungen-fuer-online-shops-4173820
- German packaging LUCID: https://www.verpackungsregister.org/en/knowledge-bases/mail-order-companies-and-online-retailers
- EU consumer-product GPSR: https://ec.europa.eu/safety-gate/screen/pages/productSafetyLegislation
- EU 14-day distance-sales withdrawal: https://europa.eu/youreurope/citizens/consumers/shopping/returns/index_en.htm

*This RFC is a technical/business proposal, not legal advice. Confirm the exact legal and tax obligations for the seller and target markets before collecting contacts or taking payment.*
