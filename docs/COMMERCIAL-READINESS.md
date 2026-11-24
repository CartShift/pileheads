# Commercial readiness

## Increment 1: public deck collection

- The React tabletop and public /decks route share a typed deck registry.
- Existing deck IDs, artwork, rules and free access are preserved.
- Explicit deck links override saved presentation preferences; invalid IDs safely fall back.
- Static export and same-origin Render routing support the new page.
- No payment, account, tracking, new hosting service or background job is introduced.

## Next increments

1. Anonymous opt-in product measurement: documented event taxonomy, retention and deletion policy, server-validated ingestion, deduplication and metrics; measure completed games, rematches and invitations without recording room tokens or cards.
2. Durable player identity: guest-to-account linking with secure sessions and database migrations; keep anonymous play available.
3. Server-authoritative entitlements and redemption: transactional grant/revoke, audit, rate limits and single-use physical codes.
4. Physical commerce via a validated checkout integration; digital commerce only after catalog and entitlement security are verified.
5. Branded partner editions and aggregated reporting; no tenant-specific code forks.

Do not expose premium content or accept money until entitlement verification, payment replay/refund tests, privacy review and deployment smoke tests pass. The deck registry is public presentation metadata, not an access-control boundary.
