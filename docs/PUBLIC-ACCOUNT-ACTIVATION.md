# Public account activation checklist

Status: BLOCKED pending operator privacy review and live OAuth acceptance. No private contact details, account identifiers or credentials belong in this public repository until expressly approved for publication.

## Verified technical evidence
- Production account registration was changed to accept any verified Google email without an invitation list (PR #231).
- Production readiness reported ready for /api/account and /api/player after the owner corrected the player database URL. This proves configuration reads and presence of OAuth credentials, not a successful Google exchange.
- Account, guest and privacy feature switches remain off. Do not set privacy_reviewed=true while the website notice contains draft markers.

## Privacy and Google
- Complete the controller's public identity, working contact and legally appropriate address, processing purposes/bases, provider arrangements and transfers, retention/backup/log deletion policy, rights handling, account age decision and actual growth feature configuration. The draft /privacy page is deliberately not publication-ready.
- Set up the regular retention maintenance described in PLAYER-DATA-RETENTION.md. Expiry is not physical deletion.
- Owner supplied the public operator address on 2026-11-28 and requested that the details not be stored in environment variables. The public legal contact record is centralized in `apps/web/lib/site-operator.ts` and rendered by the shared `OperatorContact` component. No Vercel variables are required. These details are public website content, not secrets; they also remain in public Git history. Confirm the contact method and any required business identifiers. Review the production notice, Impressum and terms of use; approve their exact content. Remove all draft markers, publish the reviewed page and verify its canonical HTTPS URL and homepage link.
- Google Auth Platform > Branding: app name PILEHEADS, homepage https://pileheads.com/, privacy https://pileheads.com/privacy, terms https://pileheads.com/terms, verified domain pileheads.com and a working user support email. Confirm required fields and any verification requests in the console.
- Google Auth Platform > Audience: verify public external sign-in is appropriate; check the actual publishing status and Google restrictions. Basic openid/email scopes are requested; do not request additional scopes. Do not assume the provider rejects unlisted users solely because a basic-scope app is in testing.
- Google Auth Platform > Clients: exact authorized redirect URI https://pileheads.com/api/account/callback. Match the OAuth client deployed in Vercel without disclosing secrets.
- Official references: https://developers.google.com/identity/protocols/oauth2/policies ; https://developers.google.com/identity/protocols/oauth2/production-readiness/overview ; https://support.google.com/cloud/answer/15549049 ; https://support.google.com/cloud/answer/15549945 . Google basic identity scopes are an exception to the usual test-user allowlist restriction. The public homepage must describe the app and link to privacy and terms on a verified domain. Follow the actual branding verification prompts; never assume approval.

## Provider and legal review evidence
- GDPR Articles 5, 6, 12–14, 17, 21, 28 and 44–49: https://eur-lex.europa.eu/eli/reg/2016/679/oj
- German provider identification: https://www.gesetze-im-internet.de/ddg/__5.html
- Berlin supervisory authority complaint route: https://www.datenschutz-berlin.de/buergerinnen-und-buerger/beschwerde/
- Vercel DPA: https://vercel.com/legal/dpa (published terms specify Pro and Enterprise coverage; actual team plan was not available via the connector). Confirm actual coverage rather than assuming it. Log drains could not be enumerated through the connector. Do not purchase or change a plan automatically.
- Neon security and privacy: https://neon.com/security ; verify the actual accepted agreement and configured restore window in the account. EU database location alone does not establish transfer compliance.
- Google user-data policy: https://developers.google.com/terms/api-services-user-data-policy ; branding verification: https://developers.google.com/identity/protocols/oauth2/production-readiness/brand-verification .
- The legal drafts now include proposed Article 6 bases, optional/required data distinctions, objection, complaint and Google data-use limitations. Owner-supplied contact details are centralized. Remaining approval items: provider DPA/transfer and retention settings, age/contract policy, actual contact/rights workflow and final legal copy review. Do not mark the database privacy gate as reviewed simply because the UI builds.

## Integration with SEO and GA4
The legal routes are classified as noindex/follow with self-canonical URLs in the SEO registry and excluded from the sitemap. GA4 has a separate consent and provider review gate; its draft disclosure is incorporated, but do not activate analytics or alter analytics flags as part of account activation. See GA4-PRIVACY-NOTICE-DRAFT.md.

## Retention readiness
Read-only production inspection on 2026-11-28: 47 expired room rows; zero expired account sessions, guest profiles or round receipts. No deletion performed. Verify the dedicated maintenance credentials, bounded expiry-only cleanup, backup/log retention, and an operator-approved maintenance cadence before enabling persistent account collection. Do not treat this point-in-time count as ongoing monitoring.

## Activation and acceptance
After reviewed notice is live, both connections ready, and Google settings confirmed, operator enables privacy_reviewed and accounts in the production singleton settings row. Enable guest_profiles only if its separate notice and retention plan are ready. Keep history, progression, quick_play and growth switches unchanged. Verify enabled=true on the account API, real Google sign-in with a previously unlisted external account, profile refresh, sign-out, repeated sign-in, session persistence on a second device, account deletion, cancelled callback, and uninterrupted guest play. Never claim success from readiness alone. Pause accounts if a live defect appears.
