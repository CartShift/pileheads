# Product measurement (increment 2)

First-party, opt-in, no advertising SDK, no persistent player/device identifier. Only the React experience is instrumented. Existing Classic and gameplay endpoints are unchanged.

## Enablement
1. Apply `db/migrations/001_product_events.sql` to the existing Neon DB using an authorized migration connection.
2. Review the privacy notice and retention obligations for the intended audience (including minors); verify consent presentation.
3. Set `STACK_ANALYTICS_ORIGIN` to the exact public origin (scheme and host, no trailing slash) and `STACK_ANALYTICS_ENABLED=true` on Render. Without both settings and DB credentials, ingestion is disabled. Do not set these before the migration and launch review.
4. Verify opt-in, revocation, valid and invalid ingestion, and gameplay with analytics offline. Run `db/reports/product_events.sql` for aggregated observations.

## Event contract
| Event | Meaning |
| --- | --- |
| landing_view / catalog_view / lobby_view | Consenting browser observed the surface, once per mounted preference component |
| deck_selected | Explicit in-game theme change |
| round_started | Client observed setup -> play for the same game |
| round_completed | Client observed play -> over for the same game |
| rematch_requested | User requested a new round; not confirmation |
| invite_copied | Clipboard write succeeded; not invite delivery or join |

Events have a random one-event UUID for deduplication, allowlisted event name, mode and deck where applicable, and server receipt time. No IP, room code, token, nickname, URL, hand, analytics cookie or stable analytics ID is stored in this table. Hosting/network infrastructure may separately process network metadata. Browser preference is local; withdrawal stops future measurement, does not retroactively remove unlinkable events. No retries or background polling. The GET capability check does not record events.

A global in-process write cap and exact origin check reduce abuse; these do not prove events are genuine. Metrics are approximate, consent-biased and per-client observations, not distinct players or authoritative rounds. Rematch/completion ratios are directional only; unique players, conversion attribution and retention require a separately reviewed identity design. No direct cross-platform comparisons.

## Retention
Ingestion attempts a 30-day expiry cleanup once per active UTC day; use the manual DELETE in the report during inactive periods, and verify backup retention separately. The current feature is intentionally disabled by default. No new cron or paid service. If strict time-based deletion is required, configure an approved scheduled cleanup before enablement. No third-party analytics SDK.

## Failure behavior
Invalid data is rejected, duplicate event IDs are ignored atomically, analytics database failures do not block gameplay. A shared rate limiter is necessary before horizontal scaling. Monitor write volume and DB costs before enabling broadly.
