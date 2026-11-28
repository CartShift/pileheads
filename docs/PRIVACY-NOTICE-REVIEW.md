# Privacy notice review — release blocker

This is a draft, not legal advice or an assertion of GDPR compliance. Do not merge this draft page as an approved notice, set privacy_reviewed=true, or enable new data collection before the operator confirms the missing information. Do not commit any private residential address or invitee email to this public repository.

## Required operator decisions

1. The owner confirmed operation as a private individual, not a registered business. Confirm the full legal name and appropriate public contact/address and working privacy contact for rights requests; the proposed Gmail address was incomplete, and the planned pileheads.com mailbox is not yet confirmed active. Do not publish either an unverified mailbox or a private home address without explicit confirmation. Confirm any representative/DPO obligations and competent supervisory authority. For Germany, review applicable imprint obligations and language requirements as well.
2. Confirm purposes and lawful bases, including essential game operation, security, optional accounts, invitations, round receipts, optional history/progression, optional reports, consented measurement and email updates. Verify terminal storage rules under §25 TDDDG; distinguish necessary storage and optional consent. Draft UI wording is factual, not a lawful-basis conclusion.
3. Confirm actual processors/recipients and contractual roles: Vercel, Neon, any active Render relay, Google sign-in, and Resend only if activated; review DPAs, regions, subprocessors, international transfers and safeguards. Do not claim Frankfurt function/database placement proves all data remain in the EU.
4. Verify actual room, rate limit, guest, session, receipt, invite, waitlist, report and measurement expiry/physical cleanup. Current scripts are manual. Establish a maintenance cadence and backup/log retention, verify deletion and access/export handling. Decide invitation retention and handling of existing sessions after invite withdrawal.
5. Confirm whether children are targeted or permitted to create accounts and appropriate age/consent handling. Open account registration is the planned rollout; no registration, purchases, advertising profiles or ranked system are enabled by this draft.
6. Confirm actual active growth flags and consent flow. Existing growth has separate legacy config. Do not activate it by implication.
7. Replace draft banner with confirmed information including notice version/date, controller/contact, purposes/bases, recipients/transfers, retention and rights request method. Review the final language and accessibility. Confirm /privacy returns the actual approved notice on production, then use an explicit operator action to set privacy_reviewed and accounts for Open Beta, only after the actual Google and database connection checks. Keep the public queue off until actual two-account tests.

## Technical sources in this repository
- api/pilehead.js, db/room-schema-development.sql, docs/ROOM-DATA-RETENTION.md (if present), scripts/room-retention.cjs
- api/player.js, scripts/account-api.cjs, scripts/google-oidc.cjs, scripts/account-store.cjs, docs/PLAYER-DATA-RETENTION.md
- scripts/private-history.cjs, scripts/player-progression.cjs, db/room-round-receipts.sql, docs/PUBLIC-MATCHMAKING-QUEUE.md
- api/growth.js, docs/GROWTH-SESSION-FUNNEL.md, apps/web/components/funnel-provider.tsx, apps/web/lib/room.ts

Official legal sources for review: GDPR Articles 5, 6, 12–14, 15–22 and 44–49 (https://eur-lex.europa.eu/eli/reg/2016/679/oj/eng); German TDDDG §25 (https://www.gesetze-im-internet.de/ttdsg/__25.html). Requirements depend on the operator and actual processing; seek appropriate legal review.
