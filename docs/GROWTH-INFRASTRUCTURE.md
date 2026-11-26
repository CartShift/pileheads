# Growth infrastructure v1 (disabled by default)

This release adds an optional central submission of the existing voluntary playtest report, a protected aggregate dashboard, fixed-category campaign attribution, and a double opt-in physical-deck update list. It is not passive visitor tracking or an ecommerce launch.

## Operator deployment gates

- Approve the actual privacy notice, controller details, processor arrangements, retention, lawful basis, withdrawal and rights handling with appropriate advice. Publish a real same-origin HTTPS privacy URL; do not use placeholder legal copy. Ensure infrastructure logs are minimized and retention/deletion are verified.
- Apply `db/growth-v1.sql` explicitly to an isolated development database/branch first. Use a scoped database role with only the required growth table permissions; keep the game-room credentials separate. No migration runs automatically.
- Verify the production and fallback host behavior, database limits, backup/deletion procedure, monitoring, rate limits, email delivery, abuse response and operator access with real test accounts before public enablement. Global request quotas are deliberately conservative (300 report attempts/day, 50 signup attempts/day) and can be exhausted by abuse; add reviewed edge abuse protection before wider promotion.
- Configure server-only environment variables via the hosting provider; never put credentials into the repository or a NEXT_PUBLIC variable. Keep Preview disabled unless using isolated test services.
  - `PILEHEAD_GROWTH_DATABASE_URL`: scoped Neon connection.
  - `PILEHEAD_GROWTH_PRIVACY_URL`: approved same-origin HTTPS privacy URL.
  - `PILEHEAD_GROWTH_NOTICE_VERSION`: stable version label (1–40 letters, numbers, dot, underscore or hyphen).
  - `PILEHEAD_GROWTH_ORIGIN`: optional trusted origin; default `https://pileheads.com`.
  - `PILEHEAD_GROWTH_OPERATOR_TOKEN`: randomly generated secret with at least 32 characters. Enter on /growth only over HTTPS, never send by chat or commit. Data API returns aggregate rows only. Rotate after suspected exposure.
  - `PILEHEAD_GROWTH_ENABLED=1`: permits voluntary report submission after the above gates.
  - `PILEHEAD_WAITLIST_ENABLED=1`: separately permits signup, also requires `RESEND_API_KEY` and `PILEHEAD_WAITLIST_FROM` with an approved verified sending domain. No provider account, cost, API key or sender has been provisioned by this change.
- Use the retention SQL in the migration comments as a reviewed recurring cleanup operation. The 30-day report query window does not itself delete old records. Set actual deletion/backup retention before enablement. Confirmed emails must have an agreed retention policy.
- Confirm that consent notice and version are visible in both forms. Test rejection of stale notice versions. Test new signup, duplicate/pending signup, expired token, confirmation, unsubscribe even when new signups are disabled, and mail failure.
- Keep both flags OFF until all gates pass. Existing local download and all gameplay remain usable without growth infrastructure. Turn off flags to stop new collection; do not disable deletion links while keeping stored emails.

## Measurement

Reports are snapshots explicitly submitted by participants from one browser page. Only the fixed UTM source/medium/campaign categories are accepted, no arbitrary referrer, URL, room or display name. No cookies or persistent marketing identifier. Browser memory holds a random submission UUID solely for idempotent retry; reports are self-selected and untrusted, not authoritative unique-player counts. One snapshot per opt-in session; repeated sessions or copied payloads cannot be deduplicated across people. Dashboard summarizes last 30 days of observations, with waitlist current totals separate. Missing completions are not proven dropouts. Stated replay intent is not actual retention. No visitor conversion or D1/D7 claim.

Public share links can point to /play directly. Homepage links preserve allowlisted UTM parameters after hydration; an early click can lose attribution. No capture of raw campaign or personal strings. Browser capability requests use no-referrer; platform infrastructure may have its own access logs.

## Waitlist

Email verification is required before an address is counted as confirmed. Pending requests expire after 24 hours, with at least 15 minutes between replacements. Confirmation and removal tokens are random, hashed at rest, passed in the link fragment and processed only after explicit user action. No bulk marketing sender is implemented. Keep email requests and delivery records private. Before sending a future campaign, implement verified-recipient selection, a new unsubscribe token mechanism for each mailing, suppression/consent lifecycle and the operator review gate. No preorder or manufacturing promise.

## Testing

`npm test` exercises strict allowlists, API gates, mock persistence and mail delivery, idempotency and operator access; these are not a live PostgreSQL or email-provider acceptance test. Run the existing full browser CI and complete a real isolated end-to-end migration/confirmation/deletion test before enabling either flag.
