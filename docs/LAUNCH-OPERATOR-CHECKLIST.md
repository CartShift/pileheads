# Operator launch checklist (public-safe template)

This is a checklist, not a privacy policy, legal notice or legal advice. Do not put personal addresses, identification numbers, credentials, contracts, customer information or private legal drafts in this public repository. Store actual answers in an owner-controlled private location.

## Required operator decisions
- Confirm legal operator/controller, applicable business form, service address, contact and registration/tax disclosure requirements with appropriate local advice.
- Establish jurisdiction and intended audience, including any age policy; review applicable consumer, accessibility, privacy, and online-service obligations before public promotion.
- Confirm name/art/font/sound rights and commercial hosting eligibility. Record evidence privately.
- Approve public privacy notice and applicable legal/contact pages before broad promotion. No fake contact details, unapproved legal claims or placeholder policy links.
- Verify current processors, contractual arrangements, hosting regions, international transfer assessment if applicable, access controls, retention and deletion including backups/logs.
- Establish working rights-request, abuse/security-report, support and incident handling routes.

## Technical inventory to verify against current deployed version
| Surface | Known implementation | Operator must verify |
| --- | --- | --- |
| Local play | Local game saves and presentation preferences in browser storage | Accurate storage disclosure and reset behavior |
| Online private rooms | Nickname, seat token hash, room state, revision, presence, bounded event history; per-room token held locally | Actual room expiry, cleanup jobs, logs, backups, user rights and retention |
| Rate limits | Hashed request/seat buckets, expiry columns | Real cleanup/retention, platform logs, abuse handling |
| Host/CDN, DB | Vercel, Neon; Render fallback retained | Actual contracts, locations, retention, access, cost/plan eligibility |
| Voluntary reports and funnel | Gated; current production status false | Consent/notice version, minimization, withdrawal, aggregate reporting limitations, isolated staging tests |
| Email waitlist | Gated; current production status false | Verified sender, double opt-in, unsubscribe, deletion, mail processor and retention |
| Sharing | Explicit native share or copy, no seat token in link | Actual platform share behavior; users choose destination |

Use source and current production config to confirm the inventory; it is not exhaustive. Do not query or expose live participant records to verify it. Use disposable synthetic accounts and staging only for migrations and email.

## Promotion approval
- [ ] Manual QA and technical evidence in PUBLIC-LAUNCH-ACCEPTANCE.md
- [ ] Actual operator details and legally reviewed disclosures approved privately
- [ ] Growth flags stay off unless individually authorized after their own deployment gates
- [ ] Creative/brand approvals, support path and rollback plan recorded
- [ ] Owner explicitly authorizes soft launch
