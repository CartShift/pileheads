# Guest player identity (increment 3a)

An optional, browser-bound profile with a durable internal UUID and saved preferred deck. Anonymous gameplay still works with no profile. No account recovery, email, passwords, cross-device sync, purchases, match history or analytics association yet.

## Security boundaries
- Create only on explicit request from /profile; visiting the page does not create a row or cookie.
- 256-bit random session secret in a __Host- cookie (Secure, HttpOnly, SameSite=Strict, Path=/, no Domain); only SHA-256 digest stored. Never return the secret or internal UUID in JSON. Fixed 90-day server expiry; expired cookies cleared on lookup. Cookie loss means no recovery.
- Same-origin POST, JSON-only bounded request body, method/field allowlist, process-local rate limits. No user-supplied identity or foreign profile IDs accepted. Queries parameterized.
- Delete removes that guest's database row, then clears the cookie; no effect on room sessions, local saves or separately collected analytics.
- No link between profile and multiplayer identity. Never use the guest cookie to authorize a room or treat local game results as authoritative.
- No payment/entitlement grants to this temporary profile. Before selling, add durable account linking with a verified authentication provider, session rotation, recovery, transactional ownership migration and account deletion.

## Enablement
1. Apply db/migrations/002_guest_players.sql to the existing database explicitly.
2. Set STACK_PLAYER_ORIGIN to the exact HTTPS origin (no trailing slash), STACK_PLAYER_ENABLED=true on Render. Default off.
3. Test creation, reload, preference change, cookie isolation, deletion, expiration, blocked cookies, concurrent creation and gameplay with DB unavailable. Verify actual Set-Cookie behavior over HTTPS.
4. Review privacy notice and expiration policy, especially for a family audience. Before enabling, configure an approved expiry cleanup process: `DELETE FROM stack_guest_players WHERE expires_at <= now();` and verify backup retention. No cron added by this change.
5. Review limits before public traffic; process-local quotas do not prevent deliberate abuse from non-browser clients or coordinate across replicas. Add shared rate limiting if needed.

Known limitations: browser tabs making simultaneous first-time create requests can create multiple guest rows; the last cookie wins. Orphaned profiles expire and must be pruned. No hard dependency from gameplay. Guest profile is intentionally not a purchase wallet.
