# Production runtime settings (single environment)

Owner requested one environment, not staging and not a long list of environment variables. Production feature configuration lives in the existing Neon database. No new service, domain, deployment target or paid resource.

## Environment variables

Only these five application variables are needed for the account/pilot subsystem on Vercel Production:
- PILEHEAD_DATABASE_URL: existing multiplayer connection, do not overwrite.
- PILEHEAD_PLAYER_DATABASE_URL: distinct least-privilege player/account connection to that same database.
- PILEHEAD_GOOGLE_CLIENT_ID and PILEHEAD_GOOGLE_CLIENT_SECRET: existing Google OAuth client.
- PILEHEAD_ACCOUNT_FLOW_SECRET: independently generated random secret (at least 32 characters). HKDF-SHA256 with a domain-specific context derives the v1 room-seat key; do not rotate this master while any pilot seats need recovery. The existing OAuth flow uses this secret and seat keys never enter source or logs.

The canonical origin and privacy route are code constants. Old production operational env variables are ignored; non-production legacy configuration remains for existing tests/local workflows. Other unrelated existing application or hosting variables are unaffected. No new operational env flags. Both runtime connections must read the same singleton UUID and see matching feature settings/schema metadata before anything enables. The marker is not a substitute for confirming the configured endpoints if a database has been cloned. Failures disable new features, not private game logic. Each instance caches a result for 3 seconds, so toggling is near-real-time, not instantaneous; an already-started request can finish under its earlier snapshot. On cold cache, one small metadata query per connection (and one invite read when accounts are on). Benchmark real latency before broad release.

## Operator workflow

Apply db/product-runtime-settings.sql after the existing player and room schemas and group grants. The singleton row has every flag off. Both runtime roles can read settings, neither can write them; only player runtime can read hashed email invitations. Hashes are pseudonymous personal data, not anonymous. Maintain them using admin SQL, with the operator's authorization. Do not copy real invitations into CI or source control. Add a verified Google email's SHA-256 hash of trimmed lowercase UTF-8 address to pileheads_pilot_invites. The OAuth flow requests openid email and verifies signed email_verified and the hash before creating a session; raw email is not persisted. Google Cloud must allow the corresponding test users.

The privacy notice at /privacy must actually be published and reviewed, including controller/contact information, retention and deletion, before setting privacy_reviewed=true. This migration does not approve or publish a legal notice. The account pilot remains off until this review, invited emails and both valid runtime credentials are in place. Example feature switches (operator-only, not automatically executed):
- SELECT privacy_reviewed,guest_profiles,accounts,round_history,private_history,progression,quick_play FROM pileheads_product_settings;
- UPDATE pileheads_product_settings SET accounts=true WHERE singleton=true; -- requires reviewed notice and verified invite hashes
- UPDATE pileheads_product_settings SET quick_play=false WHERE singleton=true; -- independent kill switch
- UPDATE pileheads_product_settings SET accounts=false,private_history=false,progression=false,quick_play=false WHERE singleton=true; -- account pause with dependencies

Quick Play additionally requires pilot_accounts containing actual signed-in internal account UUIDs and the deadline/recovery and two-device release acceptance. Never put IDs or secrets in public logs. Removing an invitation prevents subsequent sign-in, not existing sessions; revoke sessions through authorized operator procedure and remove affected matchmaking UUIDs as needed. Settings are managed by the operator directly for now, not exposed to a public admin API. No account, XP or matchmaking activation is included in this refactor. The earlier preview and environment-based pilot runbooks describe historical implementation, not current production configuration.
