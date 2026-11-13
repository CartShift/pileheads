# PILEHEAD | Mass-release readiness gate

**Updated:** 2026-11-13  
**Scope:** PILEHEAD v1.2 in this monorepo. Separate launch decisions for (A) public online game and (B) retail printed game.  
**Current verdict:** **NO-GO for public mass launch or commercial print run.** Playtest/beta only. No code-based review alone can establish commercial game quality.

## What was inspected

- The server-authoritative game engine, online room API, lobby and online client, printing, Vercel project metadata and GitHub main branch.
- GitHub main commit at time of review: 67ddba08c2b1195e87353ad79c2ef24eec28db80.
- Last observed READY production Vercel deployment on older commit 4de8d573ad1efb00e6560239bdde47ba30e74b9d.
- Vercel project metadata showed SSO protection for all deployments; public reachability is unverified.
- The Vercel connector returned 403 when asked to list project environment variables. We cannot verify the presence of PILEHEAD_DATABASE_URL and must not infer it is absent or present.
- The online client polls every **1750 ms**. Out-of-turn SLAM is a reaction mechanic, and latency/race fairness is an unresolved design risk.
- API does maintain server authority, seat token hashing, hidden-hand redaction, validation, revision checks and rate limits. That does **not** establish production abuse resistance or scalability.

## Reproducible bot diagnostics (NOT human playtesting)

Executed the checked-in engine and simulator directly at v1.2 on 2026-11-13, seed 20261113, **150 games per seat count**, 1200-action cap, three rotating bots and perfect/immediate bot SLAM reactions.

| Players | Complete | Median actions, complete games | P90 actions, complete games | Mean pickups | Mean SLAMs |
| --- | ---: | ---: | ---: | ---: | ---: |
| 2 | 149/150 | 135 | 218 | 14.92 | 3.04 |
| 3 | 150/150 | 141 | 220 | 15.42 | 3.30 |
| 4 | 149/150 | 162 | 304 | 20.72 | 3.70 |
| 5 | 150/150 | 167 | 349 | 22.76 | 4.02 |

**Interpretation:** Long games and repeated pickups are potential retention problems. Two matches hit the action cap. Action counts are **not minutes** and perfect bot SLAM speed overstates what a polling-based online game can deliver. Must measure real-play duration and fatigue.

Reproduce in existing PILEHEAD simulator with games=150, seed=20261113 and player counts 2,3,4,5.

## Gate A: public online release

- [ ] Run npm test and static Vercel build successfully on the **exact release commit** (record SHA and build logs).
- [ ] Deploy newest main/approved release commit. Record production deployment ID and compare SHA to GitHub.
- [ ] Confirm encrypted PILEHEAD_DATABASE_URL is configured for production/preview **without exposing the value**, and health endpoint returns JSON with ok=true.
- [ ] Expose a deliberately public game hostname/path; protect private SPARK tooling separately. Do not globally disable SSO while the project still contains private surfaces.
- [ ] Run npm run test:pilehead-release against the public alias: HTTP 200, expected assets, CSP, database health.
- [ ] Run npm run test:pilehead-release -- --rooms **only on an authorized test deployment** for real 2-seat server tests; do not display or log player tokens. Test rooms expire after 24 hours.
- [ ] Two actual independent devices complete full games (including setup swaps, special groups, DUMP, blind cards, reconnect, start/finish, concurrent moves and SLAM).
- [ ] Repair or redesign reaction timing: polling at 1.75 seconds can lose SLAM races. Define clear server-authoritative fairness policy and measure on real mobile networks before claiming fast reactions.
- [ ] Accessibility pass: screen reader, keyboard, focus states, reduced motion, narrow portrait, landscape, tablet, desktop.
- [ ] Production readiness: load test, room creation/joins rate limits, abuse controls, cleanup of expired room/member/rate-limit rows, backup/restore, error alerting and rollback procedure. Include cost targets at expected concurrency.
- [ ] Privacy review for public player display names and browser-held seat tokens, data retention and notices, hosting/subprocessor requirements, and no secret data in logs or invite URLs.
- [ ] Only when every blocking gate passes, consider wider beta/public distribution.

## Gate B: physical printed product

- [ ] Freeze a single authoritative rules version, 52-card bill of materials, illustrations, language files, card faces/back and print master.
- [ ] Blind-test **at least 20 independently observed sessions** across 2, 3, 4 and 5 players, with people unfamiliar with the designer. Record actual duration, rule confusion, pickups, SLAM opportunities and successful SLAMs, return-play desire and willingness to pay.
- [ ] Compare fun and strategic choice to the relevant Shithead-family reference, without copying distinctive art/text/branding. Rebalance or cut mechanics only from evidence.
- [ ] Set and meet product targets before print (proposed pilot thresholds, not claims): 80% of first-time groups finish without facilitator intervention after reading the rules; median enjoyment 4/5 or better; no unresolved critical rules ambiguity; play duration acceptable to target buyers.
- [ ] Conduct in-person physical SLAM test: detectability of runs, table size, physical reach, hand concealment, accidental card reveals and ambiguity in simultaneous interventions.
- [ ] Order short-run samples and proof stock, cut, rounded corners, ink durability, color contrast, back alignment, small text and bleed/safe areas per printer specification.
- [ ] Complete trademark clearance for **PILEHEAD** (working name), logos and art rights, similarity review, manufacturing and sale rights; lack of ordinary web hits does not demonstrate trademark clearance.
- [ ] Confirm intended age category. For toys intended for children under 14, EU toy requirements including conformity assessment and CE marking may apply. EU Toy Safety Regulation (EU) 2025/2509 applies from **1 August 2030**; existing toy safety framework applies today.
- [ ] Assess General Product Safety Regulation and online sales disclosure/traceability, instructions and manufacturer details where applicable.
- [ ] For German packaged sales, determine LUCID/packaging producer registration and recycling system participation obligations **before** marketing. Check each additional target country separately.
- [ ] Build SKU/UPC-EAN or other retail identifier as needed, price model (landed cost, VAT, marketplaces, returns, retailer margin), packaging copy, photography, fulfilment and customer support plan.
- [ ] Greenlight print only after a paid/preorder pilot or comparable demand validation and target margin.

## Release smoke command

Read-only (safe default):

    PILEHEAD_BASE_URL=https://example.com npm run test:pilehead-release

Creates one temporary two-seat test room on selected backend:

    PILEHEAD_BASE_URL=https://staging.example.com npm run test:pilehead-release -- --rooms

This does **not** replace a real simultaneous two-device gameplay session or a load test.

## References

- EU toy legislation / CE: https://single-market-economy.ec.europa.eu/sectors/toys/placing-toys-eu-market_en
- New toy safety law timeline: https://single-market-economy.ec.europa.eu/sectors/toys/toy-safety_en
- EU GPSR: https://eur-lex.europa.eu/eli/reg/2023/988/2026-05-29
- Germany packaging register: https://www.verpackungsregister.org/en/registration/find-out-about-registrations
- Trademark clearance search guidance: https://www.wipo.int/en/web/madrid-system/check-availability
