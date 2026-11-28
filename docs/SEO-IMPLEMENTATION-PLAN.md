# PILEHEADS — SEO Foundation & Organic Growth implementation plan

**Status:** candidate implementation in progress; production acceptance remains open.  
**Created:** 2026-11-28. **Owner:** product/engineering; commercial, editorial and privacy decisions require operator review.  
**Canonical domain:** https://pileheads.com. **Scope:** organic search discovery, crawl/index control, public content, performance, conversion measurement and physical-deck discovery.

This is the coordination ledger for SEO, not a second product roadmap or authorization to activate commerce. Keep the existing web-first architecture, brand, rules, privacy controls and release gates.

## 1. Objectives and non-goals

1. Make PILEHEADS understandable and discoverable before people know its name.
2. Convert relevant organic traffic into first games, completed rounds, invitations, repeat play and confirmed deck interest.
3. Build durable search authority around the original illustrated card game, its rules and physical-to-digital experience.
4. Prepare the canonical deck page for genuine retail sales without claiming that the prototype is commercially available.

Non-goals: changing game mechanics or art; replacing the stack; restoring Classic; moving commerce to another domain; mass-generated content; doorway pages; paid SEO tools or infrastructure without approval; fake offers, reviews, demand estimates or ranking promises. Do not send private game/session or customer data to analytics. Keep the public repo free of confidential commercial data, tokens, private dashboards and personal information.

Related work: [simulator master plan](SIMULATOR-MASTER-PLAN.md), [game experience](GAME-EXPERIENCE-MASTER-PLAN.md), [PWA](PWA-IMPLEMENTATION-PLAN.md), [rules](pilehead-design.md), [CI](CI.md), [Vercel hosting](vercel-hosting.md), [public launch acceptance](PUBLIC-LAUNCH-ACCEPTANCE.md), [privacy-first analytics #138](https://github.com/CartShift/pileheads/issues/138), [commerce #172](https://github.com/CartShift/pileheads/issues/172). Do not duplicate those workstreams or mark their acceptance gates complete.

## 2. Source baseline (2026-11-28)

The initial audit inspected GitHub main source, not a successful live crawl. Source existence is not production evidence. Re-pin main and serving deployment SHA at the beginning of each slice.

| Evidence | Source observation | Open verification |
| --- | --- | --- |
| apps/web/next.config.ts | Next.js static export | Raw deployed HTML, response status and crawlability |
| apps/web/app/layout.tsx | metadataBase, English HTML language, favicon, global OG/Twitter metadata; global tabletop/PWA CSS; consent-gated GA4 component | Page-specific OG, rendered HTML and asset sizes |
| apps/web/public/sitemap.xml | Four URLs: /, /play, /how-to-play, /deck | Production sitemap and Search Console |
| apps/web/public/robots.txt | Allows public routes; blocks /api/ and legacy lab HTML | Production robots and intentional noindex policy |
| apps/web/app/page.tsx | Homepage branded slogan, links to game/rules/deck, waitlist, responsive WebP | Search-intent copy, mobile LCP and live consent behavior |
| apps/web/app/play/page.tsx | Canonical and title, inherits root description; client game-table | Stable initial HTML and game CTA with JavaScript enabled |
| apps/web/app/how-to-play/page.tsx | Rules content, canonical, repeated slogan H1 | Rule accuracy, descriptive heading, completeness |
| apps/web/app/deck/page.tsx | 54 cards / 16 illustrated faces; canonicals and prototype status | Future product conversion and real product facts |
| apps/web/app/profile/page.tsx | noindex, follow | Actual deployed directive |
| apps/web/app/quick-play/page.tsx | noindex, nofollow | Keep utility route out of index until explicitly promoted |
| apps/web/app/deck-updates/page.tsx | Client confirmation/unsubscribe flow; no page-level metadata observed in page file | Existing layout already supplies noindex; candidate centralizes it and removes the utility route from GA4 allowlist |
| vercel.json | cleanUrls, legacy redirects, shared security headers | www/apex, HTTP, previews, Render fallback, .html and slash variants |
| scripts/build-vercel.mjs / publish-next.mjs | Publishes legacy print, playtest, gallery and lab alongside static Next export | Legacy route policy, final artifacts and PWA caching behavior |
| apps/web/components/google-analytics.tsx / lib/ga4-core.cjs | Consent, host/path allowlist, safe referrers, campaign sanitization, play CTA event; /play excluded from GA4 page allowlist | Actual production config and consent-safe attribution; no private data |
| Structured data | None found in audited public page implementations | Search entire source and built HTML before adding |

Unknown: Search Console ownership and index coverage, actual crawl status, query volumes/difficulty, backlinks, live traffic/conversions, CWV field/lab data, deployed analytics behavior. Do not substitute heuristic scores for measured metrics.

## 3. Priorities, dependency order and evidence

P0 = foundation/release blocker; P1 = high-value organic acquisition; P2 = growth after evidence. Estimates below are rough engineering effort bands (S: 0.5–1 day, M: 2–3 days, L: 4–7 days), not calendar commitments; external access, CI and production approvals are excluded.

| ID | Workstream | Priority | Estimate | Dependencies | Owner |
| --- | --- | --- | --- | --- | --- |
| SEO-01 | Production baseline + Search Console | P0 | S | Domain access; live deployment | Engineering/operator |
| SEO-02 | Route registry, canonical/indexing policies | P0 | M | SEO-01 route evidence | Engineering |
| SEO-03 | Metadata, semantic content, OG | P0 | M | SEO-02 | Engineering/editorial |
| SEO-04 | Entity/schema + release regression tests | P0 | M | SEO-02/03 | Engineering |
| SEO-05 | Mobile performance, assets and budgets | P1 | M | SEO-01 baseline | Engineering |
| SEO-06 | Search-to-play measurement | P0 | M | #138, consent review | Engineering/operator |
| SEO-07 | Keyword research and content map | P1 | M | SEO-01; can parallelize | Editorial/product |
| SEO-08 | Rules/strategy and acquisition guides | P1 | L | SEO-03/07 | Engineering/editorial |
| SEO-09 | Deck commerce SEO | P1 | M | #172 readiness gates | Commerce/engineering |
| SEO-10 | Genuine distribution and backlinks | P1 | M | SEO-08; public release gates | Operator/editorial |
| SEO-11 | International SEO | P2 | L | Demand and localization readiness | Product/editorial |
| SEO-12 | Reporting and ongoing optimization | P1 | S | SEO-01/06 | Operator/engineering |

Parallelize independent work but avoid overlapping changes to root layout, routing, PWA or commerce. Use small reviewed PRs; exact-SHA fast checks for routine changes and full browser acceptance for shared runtime, navigation or consent changes. Maintain one implementation owner per slice.

## 4. Ordered implementation and acceptance criteria

### SEO-01 — Baseline and Google Search Console (P0)

- [ ] Capture current main SHA, Vercel production deployment, final host and time.
- [ ] Fetch raw HTTP and HTML for every public, utility and legacy route listed below. Record status, redirect hops, canonical, robots, title, H1, description and schema. Verify /robots.txt and /sitemap.xml serve correct content types and never return app HTML.
- [ ] Test HTTP, HTTPS, www, apex, .html, trailing slash, legacy and non-production domains. Probe a nonexistent URL for true 404; confirm query parameters do not expose private information.
- [ ] Record desktop/mobile Lighthouse lab results for four canonical routes; note absent CrUX field data rather than fabricating it.
- [ ] Operator: verify a Search Console Domain property via DNS TXT, without modifying existing DNS records. Submit https://pileheads.com/sitemap.xml; inspect the four canonical URLs. Record only non-sensitive aggregate evidence in public docs.
- [ ] Link GA4 and Search Console if configured and approved; confirm GA4 consent and measurement status separately.
- [ ] Baseline query/page/country/device impressions, clicks, CTR, average position, indexed URLs and coverage errors when data becomes available.

**Acceptance:** reproducible evidence for live URLs, valid sitemap and canonical host; Search Console verified by owner, sitemap submitted and inspected. If external access is unavailable, mark that gate blocked and continue source-level work; do not claim indexing is confirmed or request repetitive indexing.

### SEO-02 — Route registry and indexing (P0)

Create a typed route policy under apps/web/lib/ (exact naming implementation choice). Share indexability, canonical path, unique metadata, OG image and sitemap membership. Preserve static export: choose build-time generator or static metadata routes compatible with Next export and existing publish pipeline. Do not publish two sitemap generators.

| Route | Policy |
| --- | --- |
| /, /play, /how-to-play, /deck | Index, self-canonical, sitemap, 200 HTML |
| /profile, /quick-play | noindex; exclude from sitemap; preserve existing product behavior |
| /deck-updates | Utility noindex, excluded from sitemap; do not put email or confirmation tokens in analytics |
| /stack, /pilehead, /pilehead/index.html | Existing permanent redirects to canonical destination |
| /pilehead/gallery and .html | Existing permanent redirect to /deck |
| /pilehead/print and .html | Keep accessible; provisional noindex until distinct public print-and-play intent and distribution policy approved |
| /pilehead/playtest and .html | Keep accessible; provisional noindex as facilitator toolkit overlapping rules |
| /pilehead/endgame-lab and .html | noindex using HTML/header for reachable variants; allow crawl of noindex pages so search engines can see directive; if actually internal, authenticate/remove instead |
| /api/*, account/auth/payment/room utilities, preview domains | Never sitemap; use actual access controls, appropriate noindex headers for crawlable responses and deployment protection; robots is not security |
| /play with invite/UTM parameters | Canonical /play for public variants; inspect privacy and actual invite URL design. No room ID in sitemap or analytics. Never redirect away a functioning invite or strip a required token. |

- [ ] Inventory all exported routes including new commerce/auth routes on current main; add explicit policy for every HTML route.
- [ ] Verify canonical URL resolution from final HTML, use absolute HTTPS URLs, consistent slash policy and single-hop 301/308 for legacy URLs.
- [ ] Ensure only indexable, canonical, successful public URLs in sitemap; no fabricated lastmod, changefreq or priority. Add truthful lastmod only if reliable.
- [ ] Add crawler-visible noindex metadata/headers for utility pages including legacy variants; remove lab-specific robots block once noindex is deployed and accessible to crawler. Keep API policy and real access controls intact.
- [ ] Test Vercel and fallback host behavior; prefer deployment protection for previews and redirect/noindex on publicly reachable duplicate hosts where compatible with fallback operations. No cross-host redirect loop.

**Acceptance:** every generated HTML route classified, no private or utility URL in sitemap, indexable pages return 200 and self-canonical, legacy redirects preserved, no broken invitation/confirmation flow, real 404 response. Search Console eventual coverage is a separate observation.

### SEO-03 — Page metadata and visible search-intent content (P0)

Use Next Metadata exports, server layouts for client-only utility pages, and shared registry/helpers. Keep creative headline typography; add real visible descriptive text, not hidden keyword blocks.

| URL | Candidate title | Candidate description |
| --- | --- | --- |
| / | PILEHEADS – The Card Game for Friends & Game Nights | One pile. One loser. Discover an illustrated card game for 2–5 players. Play free online with friends or bots, or explore the physical deck. |
| /play | Play PILEHEADS Online Free – Multiplayer Card Game | Challenge friends or practice against bots in your browser. Play PILEHEADS for free, with no download or account needed for ordinary play. |
| /how-to-play | PILEHEADS Card Game Rules – How to Play | Learn setup, the six action cards, SNAP, SLAM and Counter DUMP. Read the rules and practice online. |
| /deck | PILEHEADS Card Game – Explore the 54-Card Deck | Meet the 16 illustrated card faces, six special actions and original card back. Explore the physical playtest deck and sign up for updates. |

- [ ] Add homepage descriptive intro (original illustrated shedding card game, 2–5 players); preserve slogan and artwork.
- [ ] /play: render descriptive lobby intro and stable links in initial HTML without cluttering an active tabletop. Do not add a marketing overlay to an active game.
- [ ] /how-to-play: unique descriptive H1, ordered setup/turn/endgame sections, action examples and links to practice. Verify all examples against engine and canonical rule docs.
- [ ] /deck: descriptive H1, correct counts, real artwork alt text, current prototype status, waitlist CTA and links to rules/play. Do not claim retail readiness.
- [ ] Unique OG/Twitter titles and descriptions; canonical absolute OG URLs, appropriate preview artwork and real image dimensions. Use original assets; test actual sharing and favicon.
- [ ] Improve descriptive anchor text and navigation, fix README link to canonical /deck where touched. Add breadcrumbs only where hierarchy is meaningful. Accessibility: logical H1/H2/H3, keyboard, contrast, reduced motion.

**Acceptance:** one meaningful primary heading and unique title/description per indexable route; raw HTML contains useful public content and crawlable links; all OG assets resolve, no visual regression or misleading claims. No hard title/description length rule or guaranteed Google snippet.

### SEO-04 — Structured data and automated quality gate (P0)

- [ ] Add minimal safely serialized JSON-LD: WebSite on home (name/url), truthful Organization or brand entity only if operator identity approved, VideoGame for the playable browser game where accurate, BreadcrumbList only with real hierarchy. Stable absolute @id relationships; no fabricated ratings, awards, developer names or price. Schema.org validity is separate from Google rich-result eligibility.
- [ ] Add Product/Offer only under SEO-09, when truthful supported fields and actual sale availability exist. Do not promise FAQ, HowTo, VideoGame or any other rich result.
- [ ] Proposed tests/seo-static.cjs: parse published vercel-static HTML and XML; verify one canonical, metadata uniqueness, index policies, schema JSON parsing, sitemap membership, public link integrity, OG/asset existence and valid HTML lang; check output not just source.
- [ ] Add negative fixtures: duplicate canonical, leaked utility URL, stale redirects, malformed JSON-LD, missing metadata, private parameter in page location, unknown HTML route. Avoid false positives on assets or intentional external URLs.
- [ ] Run npm test, integrated build, React typecheck and new SEO test locally or exact-SHA CI. Add the build-artifact SEO check to existing CI without introducing a second build or expensive recurring jobs. Use browser tests for changed navigation/consent/gameplay.
- [ ] Add live smoke script (safe GETs only) or extend existing deployment probes for HTTP and HTTPS canonical behavior, final status, sitemap, robots, HTML metadata and cache behavior. Avoid creating real games or sending mail in crawler tests.

**Acceptance:** exact candidate passes static SEO and existing relevant regression checks; live smoke re-run after deployment and recorded independently. Validate schema with Schema Markup Validator and eligible Google Rich Results Test, with no unsupported claims.

### SEO-05 — Mobile performance and image discovery (P1)

- [ ] Baseline cold-cache mobile and desktop runs on identical configuration; use median of repeated lab runs; capture LCP element, TBT (lab proxy, not INP), CLS, JS/CSS transfer and image/font requests.
- [ ] Evaluate splitting root global tabletop CSS into route-specific imports without breaking game, public layout, PWA or shared design tokens. Prefer measured gains.
- [ ] Audit hero image srcset/sizes, preload competition, font WOFF2 conversion with existing license, width/height, lazy loading, below-fold art and individually discoverable card images. Maintain approved art and visual quality.
- [ ] Add stable test budgets after baseline (proposed: no >10% increase in initial public JS/CSS transfer or material lab regressions without explanation). No arbitrary universal Lighthouse score gate; control runner variability.
- [ ] Use CWV field targets at 75th percentile when enough data exists: LCP <=2.5s, INP <=200ms, CLS <=0.1. Report unavailable field data explicitly. Check PWA update/caching and constrained-network behavior.

**Acceptance:** measured before/after evidence for representative pages, mobile and desktop visual checks, no degradation of game/consent flows, performance budget documented and enforced where repeatable.

### SEO-06 — Consent-safe acquisition measurement (P0)

Reuse #138 and existing funnel provider/GA4. Do not enable GA4, alter privacy URLs, expand scope or add a new vendor without operator approval. Existing GA4 path allowlist is intentionally narrow; do not add /play or private paths simply to count sessions.

- [ ] Map existing events and deduplication semantics to proposed business metrics: public landing, play CTA, game start, first round completion, invitation action, return, confirmed waitlist, commerce purchase when enabled. Use existing first-party consent-based aggregated events where available.
- [ ] Define denominator and attribution window for each conversion; document that GSC clicks, consented GA4 visits and first-party events differ. Do not attempt to stitch identifiable users between systems.
- [ ] Confirm accepted campaign values and external referrer sanitization; remove /deck-updates from GA4 public allowlist if policy changes. Do not transmit invite URLs, room IDs, emails, auth/session tokens, game state, customer records or full arbitrary URLs. Do not fire events before consent.
- [ ] Test allow/reject/revoke, client navigation, repeated clicks, blocked storage, private routes, production-only behavior and PWA. No collection from preview.
- [ ] Verify GA4 DebugView/Realtime with consented test traffic, then report aggregate production conversions separately. Retain baseline of current GA4 property privately, not in this public plan.

**Acceptance:** event contract documented, privacy review passed, no duplicate pageviews or private values, measurement works only in intended scope. GSC independent of GA4 consent; no fabricated funnel figures.

### SEO-07 — Intent research and page map (P1)

Treat candidates as hypotheses, not researched volumes/rankings. Use actual English search results, Search Console data when present, Google Trends and optional free keyword tools; record date, country, device, intent, competitor page types and source. Paid keyword tooling is optional and requires approval.

| Cluster | Candidate destination | Intent | Editorial decision |
| --- | --- | --- | --- |
| PILEHEADS / original card game | / | Brand/discover | Preserve brand |
| Free online multiplayer card game | /play | Play | Primary playable URL |
| PILEHEADS rules | /how-to-play | Learn | Definitive source |
| Card game with friends online | /play-with-friends (proposed) | Play | Publish only with unique invitation/help content and working CTA |
| Solo card game practice | /play-against-bots (proposed) | Practice | Distinct real bot/practice content |
| Shithead / Palace rules and alternatives | /guides/shithead-vs-pileheads (proposed) | Compare | Transparent traditional vs original rules; no impersonation or false equivalence |
| PILEHEADS tactics | /strategy (proposed) | Learn | Real examples and strategy |
| 2-player and small-group games | /guides/two-player-card-games (proposed) | Discover | Useful tested recommendations, avoid thin doorway pages |
| Physical game, game nights, travel | /deck; later useful guides | Buy/discover | No invented price, age, duration, stock or shipping |

- [ ] Review competing actual search pages and search intent for priority clusters. Record evidence; assess whether users want a standard-deck simulator rather than PILEHEADS, and avoid misleading title/CTA.
- [ ] Map one main destination per intent; consolidate overlaps (e.g. deck already describes action cards, so expand existing deck/rules before creating /cards).
- [ ] Prioritize by relevance, demonstrated demand, product fit, attainable competition, content cost and conversion potential; do not claim volume or difficulty without data.
- [ ] Create short editorial briefs with reader question, verified facts, original visual/interactive asset, CTA, internal links, and review criteria.

**Acceptance:** an evidence-backed keyword/page matrix with clear publish/defer decisions and no cannibalizing or mass-generated pages.

### SEO-08 — Content delivery (P1)

Release in small slices:
- [ ] A: expand canonical /how-to-play and /deck with accurate examples, accessible card descriptions and links to play; include setup, turn rules, actions, interruptions, endgame and common questions. Use canonical engine/rules as authority.
- [ ] B: /strategy with illustrated tactical examples for card selection, DUMP/counter, SLAM/SNAP, two-player differences and common mistakes. Link to real practice drills where supported.
- [ ] C: publish the Shithead/Palace comparison only after fact-checking traditional rule variants and describing PILEHEADS as a distinct game. Distinguish variants and do not claim official affiliation.
- [ ] D: add /play-with-friends and /play-against-bots only if intent research supports separate useful pages; provide actionable working entry points and real screenshots, not fake functions.
- [ ] E: add limited game-night/travel/two-player guides and brand story when useful; include honest comparison criteria and genuine playtesting. Add printable guide only with operator-approved distribution terms. Preserve existing print kit.
- [ ] Add contextual links from guides to rules/play/deck, from rules to strategy and from deck to play. No orphan indexable routes; navigation and sitemap updated by registry.
- [ ] Editorial release check: current rules, unique reader value, original examples, truthful claims, real assets, rights, accessibility, mobile usability, metadata, canonical, index policy and proofread copy.

**Acceptance:** each published page answers a distinct question with substantive useful content, real CTA and contextual links; generated HTML and screenshots reviewed. Do not invent personal playtest experience or external endorsements.

### SEO-09 — Commerce SEO (P1; blocked by commercial approval)

Reuse #172 and existing /deck + double-opt-in waitlist. Do not implement checkout or activate payments in SEO work.

- [ ] Prelaunch: keep playtest state and waitlist truthful; show original product imagery, deck contents and rules; add measured age/duration only after testing.
- [ ] When operator approves: evolve /deck into canonical product page; use real stock/price/currency, variants where genuine, product IDs/GTIN if assigned, product photos, shipping destinations, tax/return information and customer support. Keep actual inventory/checkout authority with storefront.
- [ ] Add Product and Offer JSON-LD only for real matching visible offers; avoid fake reviews, aggregate rating, GTIN, shipping or availability. Validate product eligibility and use approved feed/merchant data consistent with page/checkout.
- [ ] Operator: set up Merchant Center and domain verification, policies and free listings only when eligible. Keep sandbox and purchase/account/checkout URLs out of index.
- [ ] Establish conversion instrumentation, redirects for future real variants and out-of-stock/discontinued handling without fake availability.

**Acceptance:** prelaunch page remains truthful; commercial activation requires #172 operator/legal/stock/checkout gates and live data validation. No merchant account, payment, mail, migration or provider configuration authorized by this plan alone.

### SEO-10 — Distribution and authority (P1)

- [ ] Research eligibility for BoardGameGeek, indie game catalogs, itch.io demo and relevant card-game communities; post only accurate approved materials and respect platform/community rules.
- [ ] Prepare an original media kit using real product/gameplay assets, rules, fact sheet and public link. Pitch relevant independent game reviewers/creators only after approval and launch readiness.
- [ ] Use contextual campaign attribution for external links without user data, and track relevant referring domains, referral engagement and search discovery.
- [ ] No bought links, link exchanges at scale, spam, fake reviews or duplicate directory submissions. Disclose sponsorships appropriately.

**Acceptance:** approved outreach list and assets; actual placements/links recorded only after verified. No outreach sent as part of this documentation change.

### SEO-11 — Internationalization (P2)

English first; German and Hebrew are candidates, not approved launch markets. Research local search demand, rules terminology, actual supported locale/commerce/legal copy and translation capacity.

- [ ] Keep existing English URLs stable. Proposed localized paths /de/... and /he/...; document locale mapping before implementing.
- [ ] Each locale: actual human-reviewed localization, HTML lang, RTL for Hebrew, self-canonical, reciprocal hreflang plus x-default where useful, localized metadata and crawlable locale switcher. No automatic location redirects or machine-translated placeholder pages.
- [ ] Maintain correct rule/CTA behavior and disclose limitations if game UI is not localized. Include only released translations in sitemap/hreflang.

**Acceptance:** localized pages have equivalent useful content, correct links/directionality, validated reciprocal alternates and real device review. No locale expansion until demand and maintenance capacity justify it.

### SEO-12 — Measurement, reporting and optimization (P1)

Weekly during early launch, monthly thereafter when data stabilizes. Use existing free tools and avoid a new dashboard/service until necessary.

| Metric | Source | Definition / interpretation |
| --- | --- | --- |
| Index coverage | Search Console | Desired canonical URLs indexed vs eligible submitted URLs; account for reporting lag |
| Impressions, clicks, CTR, position | Search Console | Filter by brand/non-brand, page, country and device; CTR = clicks / impressions |
| Organic sessions | GA4 | Consented organic sessions only; not equivalent to GSC clicks |
| Play CTA conversion | Approved funnel | Eligible organic landing sessions with CTA / eligible organic landing sessions, if measurable |
| Game start and completion | Approved game funnel | Starts per eligible play entry; completed first round per started game, with consistent consent/window |
| Invite and return | Approved aggregate funnel | Define eligible events/cohorts; no private identifiers or attribution claims without support |
| Confirmed waitlist | Existing waitlist | Confirmed subscriptions; never publish emails; channel attribution only if lawful and supported |
| Commerce conversion/revenue | Approved storefront | Real paid orders/refunds and attributable organic revenue once active |
| CWV and technical errors | GSC/CrUX/lab/CI | Field vs lab explicitly separate; trend and deployment comparison |
| Referring domains | GSC links/verified referral | Relevant links, not a vanity authority score |

- [ ] Establish baseline period and data availability; no numeric traffic target until baseline exists.
- [ ] Compare equal 28-day periods when enough data exists; annotate releases, seasonality and consent changes. Prioritize impressions without clicks, useful ranking opportunities and low-converting high-intent pages; avoid causal claims from correlations.
- [ ] Track content decisions and technical fixes with before/after evidence. Use Search Console exports privately; public ledger contains non-sensitive summary or links to public evidence only.

**Acceptance:** reporting template, metric definitions, measurement limitations and next actions agreed. Unavailable data recorded as unavailable, not zero.

## 5. Release sequence and definition of done

**Foundation gate:** SEO-01 through SEO-04, SEO-06 relevant privacy checks, and initial mobile baseline from SEO-05. Source changes can be reviewed and merged when exact candidate checks pass; production/search console checks are separately tracked. No need to delay safe metadata improvements for external access.

**Acquisition gate:** SEO-07 and first SEO-08 slice; full navigation and responsive acceptance. Publish only reviewed content and re-submit sitemap as appropriate; indexing/ranking timing is outside our control.

**Commerce gate:** SEO-09 and #172 actual commercial readiness; no activation without explicit approval. SEO-10 can prepare assets earlier, but public outreach depends on launch readiness. SEO-11 follows measured demand. SEO-12 begins as soon as evidence exists.

Each task closes only with: scope/PR link, exact commit and tests, actual deploy/HTTP proof where applicable, privacy/accessibility/content checks, and a short rollback instruction. Record external access blockers separately from implementation bugs.

Rollback: revert specific PR, keep existing canonical URLs and functional invite/confirmation URLs, re-publish last known good sitemap/metadata, inspect redirects/robots on production, verify PWA cache updates through normal lifecycle; never use a site-wide noindex or robots block as a blanket rollback.

## 6. Execution ledger

| Slice | Status | PR / evidence | Next action |
| --- | --- | --- | --- |
| SEO-01 | Open; production/GSC not verified | Source baseline above | Pin deployment, run live crawl, request DNS verification only if needed |
| SEO-02 | Candidate | [PR #237](https://github.com/CartShift/pileheads/pull/237): registry, sitemap generator, utility and legacy noindex, fallback header | Verify exported HTML, redirect/host behavior and live indexing |
| SEO-03 | Candidate | #237: unique metadata, OG/Twitter, visible copy and descriptive rules/deck headings | Verify exact-SHA and browser checks |
| SEO-04 | Candidate | #237: WebSite/VideoGame schema, static regression suite and read-only production smoke | Validate exact export; run live smoke after release |
| SEO-05 | Open | Responsive images already present | Collect baseline before optimization |
| SEO-06 | Candidate privacy narrowing; existing funnel reused | #138, #237, [SEO operations](SEO-OPERATIONS.md) | Verify consent/browser checks, organic attribution and operator configuration |
| SEO-07–08 | Initial candidate | #237: strategy and comparison; [research and content decisions](SEO-OPERATIONS.md) | Browser/editorial acceptance; measure demand before expansion |
| SEO-09 | Prelaunch candidate; commercial activation blocked by #172 | #237: existing waitlist reused on /deck, truthful prototype status | Verify waitlist behavior; actual product data and merchant approval |
| SEO-10–12 | Operations playbook prepared; external gates open | [SEO operations](SEO-OPERATIONS.md) | Obtain verified placements, localized demand and search/analytics baseline |

Update ledger when work actually occurs. Do not mark a task verified based on this plan, historical CI, a mock, a search snippet or provider READY status.

## 7. Reference documentation

- [Google Search Essentials](https://developers.google.com/search/docs/essentials)
- [Sitemaps](https://developers.google.com/search/docs/crawling-indexing/sitemaps/overview)
- [Canonicalization](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls)
- [noindex](https://developers.google.com/search/docs/crawling-indexing/block-indexing)
- [Structured data](https://developers.google.com/search/docs/appearance/structured-data/intro-structured-data)
- [Product structured data](https://developers.google.com/search/docs/appearance/structured-data/product)
- [Localized versions](https://developers.google.com/search/docs/specialty/international/localized-versions)
- [Core Web Vitals](https://web.dev/articles/vitals)
- [Search Console](https://search.google.com/search-console)
- [PageSpeed Insights](https://pagespeed.web.dev/)
- [Schema Markup Validator](https://validator.schema.org/)
- [Rich Results Test](https://search.google.com/test/rich-results)

These are implementation references, not evidence that PILEHEADS passes any external validation.
