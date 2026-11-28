# PILEHEADS SEO operations and launch evidence

Updated 2026-11-28. Companion to [SEO implementation plan](SEO-IMPLEMENTATION-PLAN.md). No private dashboard tokens, customer data or DNS verification tokens belong here.

## Baseline and intent research

- Source baseline: main before implementation 2a790c32884d7fec7fa5a19d9c08826f46bad8b6; plan merged at 2fa5fc6b860ebc838afdadb823f78a6b8d1bfc2f.
- Live web retrieval for homepage, sitemap and robots failed in this audit environment; local shell could not resolve the public domain or GitHub. This is not a downtime or deindexing diagnosis. Node 22 local shell is not the project's Node 24 CI environment.
- Initial English web search on 2026-11-28: query families around Shithead/Palace rules and free browser play. Search tool geography/device are unspecified; results are qualitative examples, not a local Google rank report, keyword volume or difficulty.

| Observed competitor/reference | Observed intent | PILEHEADS decision |
| --- | --- | --- |
| [Pagat Shithead rules](https://www.pagat.com/beating/shithead.html) | Traditional rules and house variations | Distinct comparison guide with source, no claim of official affiliation |
| [Shithead.app rules](https://shithead.app/rules), [Shithead.app](https://shithead.app/) | Classic online rules and instant play | Canonical /play stays original PILEHEADS; avoid targeting standard-deck simulator demand with misleading copy |
| [Shithead.eu variants](https://www.shithead.eu/variants) | Local variants and special-card rules | Explain named actions and canonical rules; use actual examples |
| [Play.cards Palace](https://play.cards/palace) | Named-game play intent | Prioritize a truthful playable destination over generic keyword pages |
| [Tavern Jack](https://tavernjack.com/en) | Many browser card games | Differentiate via original mechanics, physical deck, artwork and sharing |
| [Joker Palace](https://jokerpalace.com/) | Modern app variant | Present web-first product clearly without claiming native availability |

Initial candidate pages: /strategy and /guides/shithead-vs-pileheads, alongside expanded /how-to-play and /deck. Defer /play-with-friends, /play-against-bots, separate /cards, general travel/game-night lists, and locales until useful distinct content or measured intent supports them. Avoid doorway pages. The comparison uses traditional rules sources and project rules; strategy is editorial advice not claimed playtest data.

## Search Console operator runbook

1. Open https://search.google.com/search-console and add Domain property pileheads.com if not already present.
2. Copy Google's actual TXT challenge into the authoritative DNS zone; preserve existing TXT/MX/SPF/DKIM records. Verify in Search Console. Do not put the challenge in public source.
3. Submit https://pileheads.com/sitemap.xml after candidate release; inspect /, /play, /how-to-play, /deck, /strategy and /guides/shithead-vs-pileheads. Observe URL Inspection, coverage and canonical selection. Indexing requests are optional and do not guarantee indexing.
4. Link existing GA4 to Search Console only after confirming ownership/consent scope. Do not change consent or tracking configuration merely for SEO.

## Safe verification and performance

- Build via npm run build on Node 24, then node tests/seo-static.cjs. Existing CI build/full-core stages run the new test. For a live release run node scripts/check-seo-production.cjs; no write APIs.
- Independently inspect www/http redirects, clean URL variants, deployment preview protection, fallback noindex, and real invite behavior. Test mobile and desktop with https://pagespeed.web.dev/ or installed Lighthouse; record three comparable cold runs per route, median LCP/TBT/CLS and transfer bytes. Record CrUX field data only when available.
- Preserve existing responsive assets and preloaded font pending measured waterfall; do not make route CSS splits blindly. Compare exact candidate against baseline and existing PWA/browser/performance tests.

## Existing acquisition event contract

GA4 public page allowlist is intentionally narrow. Candidate removes /deck-updates from it; /play, /growth, /profile, /quick-play and new guides are excluded. Expand public-page analytics only after operator privacy scope review. Current GA4 event play_cta_click observes eligible consented public-page links to /play or /quick-play. It is an event count, not a deduplicated person conversion rate. Existing core sanitizes campaign source/medium/campaign to fixed categories and strips referrer paths.

First-party funnel provider (separate explicit consent) covers /, /stack and /play, 24-hour temporary browser session, not unique users. Existing events: play_opened, first_started, first_completed, rematch_started, invite_copied, room_joined, result_shared. The existing observer excludes practice drills where applicable. Existing dashboard /growth is noindex, operator-token gated for data, aggregated. Do not join private identifiers between GA4, GSC and first-party reports. No organic-search source in the campaign allowlist currently; direct organic-to-first-round attribution is therefore unverified/unavailable. Do not append fake UTMs to organic search traffic. A future privacy-reviewed coarse referrer category can be evaluated; no new tracking in this slice.

## Weekly/28-day report template (private copy)

Period: ___; compare: ___; release SHA: ___; device/country filters: ___; consent/config changes: ___.

| KPI | Baseline | Current | Source |
| --- | --- | --- | --- |
| Eligible vs indexed public URLs | unavailable | unavailable | GSC |
| Brand/nonbrand impressions and clicks, CTR | unavailable | unavailable | GSC |
| Page/country/device query opportunities | unavailable | unavailable | GSC |
| Consented organic sessions and CTA event count | unavailable | unavailable | GA4 |
| Opted-in sessions / starts / completions / rematches | unavailable | unavailable | Existing growth dashboard |
| Confirmed deck subscriptions | unavailable | unavailable | Existing waitlist |
| Referring domains / referral engagement | unavailable | unavailable | GSC/approved analytics |
| Field CWV / comparable lab results | unavailable | unavailable | GSC/CrUX/PSI |
| Paid orders/refunds/revenue | not launched | not launched | Approved storefront |

Review data sufficiency, privacy, denominator consistency, top query-page pair, actual conversion opportunity, one actionable change, next measurement date. Separate GSC clicks from consented sessions and voluntary funnel observations. No invented numbers or zero where data is missing.

## Commerce and outreach readiness

Reuse existing [commerce #172](https://github.com/CartShift/pileheads/issues/172). Prelaunch deck page describes 54 cards / 2–5 players / playtesting, uses real art and existing double-opt-in waitlist. Do not publish price, delivery, tested age, availability, ratings or Merchant Center feed before actual product readiness. Prepare a media kit from existing real gameplay screenshots and canonical art, with a fact sheet (rules, player count, online availability, prototype status), source/licensing approvals and links to canonical pages. Suggested outreach channels to assess: BoardGameGeek game submission, itch.io browser demo, relevant game-review creators and community groups. Eligibility and outreach approval are open; no accounts, submissions, emails or external postings made. Use approved campaign categories only, never private user data.

English-first; German/Hebrew candidate localization deferred until demand and review capacity. Keep existing root English URLs, use /de and /he only for fully reviewed content, reciprocal hreflang, correct lang/RTL, no auto geo redirects. No translation placeholder or unsupported commerce locale.
