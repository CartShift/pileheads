# Public launch acceptance

Updated 2026-11-27. This is a technical evidence ledger, not authorization for a commercial launch. Canonical domain: https://pileheads.com. Keep the approved physical card art and original game rules. No collection flags or paid campaigns are enabled by this release.

## Verified technical evidence

| Capability | Evidence | Status |
| --- | --- | --- |
| Canonical routes, public deck/rules, SEO, quick play and focused invitation | [#150](https://github.com/CartShift/pileheads/pull/150), [full CI](https://github.com/CartShift/pileheads/actions/runs/45915411157) | shipped |
| Interactive DUMP/BURN/SLAM examples | [#153](https://github.com/CartShift/pileheads/pull/153), [full CI](https://github.com/CartShift/pileheads/actions/runs/45915724219) | shipped |
| Room-scoped cumulative scoring | [#152](https://github.com/CartShift/pileheads/pull/152), [full CI](https://github.com/CartShift/pileheads/actions/runs/45915538667) | shipped |
| Private 3/5/10-round tournaments, final podium | [#154](https://github.com/CartShift/pileheads/pull/154), [full CI](https://github.com/CartShift/pileheads/actions/runs/45916217568) | shipped |
| All-human continuation votes, withdrawal of vote, native share API with copy alternative | [#156](https://github.com/CartShift/pileheads/pull/156), [full CI](https://github.com/CartShift/pileheads/actions/runs/45916563527) | shipped |
| Synthetic performance harness, optimized responsive public cards, stable mobile nav | [#155](https://github.com/CartShift/pileheads/pull/155), [#157](https://github.com/CartShift/pileheads/pull/157), [#159](https://github.com/CartShift/pileheads/pull/159), [latest performance run](https://github.com/CartShift/pileheads/actions/runs/45916949496) | shipped; four tested mobile routes meet lab targets |
| Explicit tournament withdrawal | [#158](https://github.com/CartShift/pileheads/pull/158) | see PR for current integration and deployment status |

Verified production baseline at time of writing: `20eeb6b64aa8d372cf349e8e7b04f220c5eded30`, [Vercel deployment](https://vercel.com/cart-shift/spark-card-game/7hRD5wmhBwphRxcYLJzxeaMEVsFk) READY. Canonical /deck returned 200 with individual card asset URLs. /api/growth?status=1 returned 200 with reports, waitlist and funnel all false, privacyUrl/noticeVersion null. CI uses mocked persistence and browser automation; it is not proof of actual two-device production play, live mail, visual quality or field Core Web Vitals.

## Release gates still open

- [ ] Review saved browser screenshots and social preview image visually, including authentic artwork, logo, spacing, text contrast and 320/390/768/1440 px layouts. Automation is not a visual sign-off.
- [ ] Complete [manual playtest runs A and B](LAUNCH-PLAYTEST-READINESS.md) on real iOS Safari, Android Chrome and at least two physical clients; test in-app invite and actual native share sheet, reconnect, complete rounds, tournament continuation and withdrawal. Record only non-sensitive evidence.
- [ ] Run the existing manual [canonical live smoke workflow](https://github.com/CartShift/pileheads/actions/workflows/vercel-live-smoke.yml) for the actual deployed release. Earlier staged six-assertion pass is historical, not current live acceptance.
- [ ] Conduct invited first-time playtest with 10–20 consenting adults and resolve critical issues.
- [ ] Confirm legal/operator details, applicable disclosures, data processing, retention and hosting plan eligibility. Use [operator evidence checklist](LAUNCH-OPERATOR-CHECKLIST.md). Do not publish placeholder details.
- [ ] Keep growth flags OFF until all applicable [growth gates](GROWTH-INFRASTRUCTURE.md) pass, including isolated DB migration, email verification, deletion and consent tests. Public game access does not imply consent to measurement.
- [ ] Owner approves branding, asset/name rights and approved promotional content before broad promotion.
- [ ] Record exact final candidate, live deployment, manual evidence and rollback target. Do not retire fallback hosting until physical-device and live acceptance pass.

Ranked matchmaking, global identity, durable progression, physical deck commerce and native apps are not part of this release gate. Private tournament scores expire with the room. Keep unrelated work out of this gate.
