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

## Increment 3b–4: recoverable accounts and redemption beta

- Google OIDC, durable account and sessions, explicit guest preference import, demo product entitlement, atomic single-use code redemption and batch generation. Disabled until staging verification. See [accounts and redemption](ACCOUNTS-REDEMPTION.md).
- Actual paid content, refunds, admin revocation and commercial launch are not enabled.

## Increment 5: storefront and test checkout

- External physical storefront entry point, isolated Stripe test checkout, signed webhook, refund suppression, install manifest and stronger redemption transaction. See [storefront and checkout](STOREFRONT-CHECKOUT.md).

## Increment 6: partner presentation beta

- Configurable published partner landing pages, inquiry channel and internal aggregate reporting; no customer-specific code forks. See [partner editions](PARTNER-EDITIONS.md) and [release gates](COMMERCIAL-RELEASE-GATES.md).

## Increment 7: operations and offline beta

- Internal audited entitlement CLI, server-protected founder scorecard, opt-in offline Classic cache. See [admin](COMMERCIAL-ADMIN.md) and [offline table](OFFLINE-TABLE.md).

## Next increments

1. Full payment/refund lifecycle and production entitlement administration.
2. Physical commerce via a validated checkout integration; digital commerce only after catalog and entitlement security are verified.
3. Branded partner editions and aggregated reporting; no tenant-specific code forks.

Do not expose premium content or accept money until entitlement verification, payment replay/refund tests, privacy review and deployment smoke tests pass. The deck registry is public presentation metadata, not an access-control boundary.
