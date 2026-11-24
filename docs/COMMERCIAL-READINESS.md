# Commercial readiness

## Increment 1: public deck collection

- The React tabletop and public /decks route share a typed deck registry.
- Existing deck IDs, artwork, rules and free access are preserved.
- Explicit deck links override saved presentation preferences; invalid IDs safely fall back.
- Static export and same-origin Render routing support the new page.
- No payment, account, tracking, new hosting service or background job is introduced.

## Increment 2: opt-in product measurement

- First-party, server-validated aggregate event observations and explicit consent controls; off by default.
- Migration and reporting SQL, no new services or scheduled jobs.
- See [product measurement](PRODUCT-MEASUREMENT.md) for enablement gates and metric limitations.

## Increment 3a: optional guest identity

- Browser-bound guest profiles, secure cookies, saved deck preference and deletion; disabled by default.
- No connection to analytics or game room authority. See [guest identity](GUEST-IDENTITY.md).

## Next increments

1. Durable registered accounts: verified authentication, guest-to-account linking and cross-device recovery; keep anonymous play available.
2. Server-authoritative entitlements and redemption: transactional grant/revoke, audit, rate limits and single-use physical codes.
3. Physical commerce via a validated checkout integration; digital commerce only after catalog and entitlement security are verified.
4. Branded partner editions and aggregated reporting; no tenant-specific code forks.

Do not expose premium content or accept money until entitlement verification, payment replay/refund tests, privacy review and deployment smoke tests pass. The deck registry is public presentation metadata, not an access-control boundary.
