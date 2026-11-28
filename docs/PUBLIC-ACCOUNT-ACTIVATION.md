# Public account activation checklist

Status: BLOCKED pending operator privacy review and live OAuth acceptance. No private contact details, account identifiers or credentials belong in this public repository until expressly approved for publication.

## Verified technical evidence
- Production account registration was changed to accept any verified Google email without an invitation list (PR #231).
- Production readiness reported ready for /api/account and /api/player after the owner corrected the player database URL. This proves configuration reads and presence of OAuth credentials, not a successful Google exchange.
- Account, guest and privacy feature switches remain off. Do not set privacy_reviewed=true while the website notice contains draft markers.

## Privacy and Google
- Complete the controller's public identity, working contact and legally appropriate address, processing purposes/bases, provider arrangements and transfers, retention/backup/log deletion policy, rights handling, account age decision and actual growth feature configuration. The draft /privacy page is deliberately not publication-ready.
- Set up the regular retention maintenance described in PLAYER-DATA-RETENTION.md. Expiry is not physical deletion.
- Review the production notice and terms of use; approve their exact content. Resolve the operator name, contact address and email in a private channel before committing approved public details. Remove all draft markers, publish the reviewed page and verify its canonical HTTPS URL and homepage link.
- Google Auth Platform > Branding: app name PILEHEADS, homepage https://pileheads.com/, privacy https://pileheads.com/privacy, terms https://pileheads.com/terms, verified domain pileheads.com and a working user support email. Confirm required fields and any verification requests in the console.
- Google Auth Platform > Audience: verify public external sign-in is appropriate; check the actual publishing status and Google restrictions. Basic openid/email scopes are requested; do not request additional scopes. Do not assume the provider rejects unlisted users solely because a basic-scope app is in testing.
- Google Auth Platform > Clients: exact authorized redirect URI https://pileheads.com/api/account/callback. Match the OAuth client deployed in Vercel without disclosing secrets.
- Official references: https://developers.google.com/identity/protocols/oauth2/policies ; https://developers.google.com/identity/protocols/oauth2/production-readiness/overview ; https://support.google.com/cloud/answer/15549049 ; https://support.google.com/cloud/answer/15549945 . Google basic identity scopes are an exception to the usual test-user allowlist restriction. The public homepage must describe the app and link to privacy and terms on a verified domain. Follow the actual branding verification prompts; never assume approval.

## Retention readiness
Read-only production inspection on 2026-11-28: 47 expired room rows; zero expired account sessions, guest profiles or round receipts. No deletion performed. Verify the dedicated maintenance credentials, bounded expiry-only cleanup, backup/log retention, and an operator-approved maintenance cadence before enabling persistent account collection. Do not treat this point-in-time count as ongoing monitoring.

## Activation and acceptance
After reviewed notice is live, both connections ready, and Google settings confirmed, operator enables privacy_reviewed and accounts in the production singleton settings row. Enable guest_profiles only if its separate notice and retention plan are ready. Keep history, progression, quick_play and growth switches unchanged. Verify enabled=true on the account API, real Google sign-in with a previously unlisted external account, profile refresh, sign-out, repeated sign-in, session persistence on a second device, account deletion, cancelled callback, and uninterrupted guest play. Never claim success from readiness alone. Pause accounts if a live defect appears.
