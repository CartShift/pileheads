# PILEHEADS commerce foundation

## Scope and launch state
The shop is a branded, static-export-compatible product preview. It reuses the existing double-opt-in deck waitlist when configured. No sales, preorders, deposits or delivery promises are accepted. One stable draft SKU, PH-ORIGINAL-01; no approved retail price or stock. EUR and direct sales are proposed initial defaults, not commitments.

## Architecture
- Next.js static /shop route; shared navigation and existing artwork.
- Vercel API functions for future checkout and webhook endpoints; use a distinct least-privilege commerce database role and connection.
- Neon commerce schema is a proposed owner-run migration, never a build or runtime migration. It creates draft catalog, inactive offers, zero inventory, order/line snapshots and processed-event IDs. No buyer PII or runtime grants yet.
- Server-authoritative merchandise quote rejects client prices, duplicate/unknown SKUs, unavailable offers, noninteger quantities, out-of-stock requests and unsupported currencies. It is not a payable quote or a stock reservation.
- Stripe Checkout is the proposed payment provider, subject to seller onboarding and test-mode acceptance. No provider credentials or products created. Do not enable payments in this phase.

## Next implementation milestones
1. Confirm legal seller, Germany-first shipping scope, tax treatment, return address, landed unit cost, price, packaging, inventory and launch date. Approve consumer information, cancellation/returns, privacy, terms, product safety/labeling and packaging obligations before launch.
2. Approve migration in development database; test constraints and add separate runtime role. Define required minimal order contact/address retention and access controls; no marketing enrollment from purchase without separate consent.
3. Build cart and checkout API with strict origin/body limits, server-side published offers, transactional expiring stock reservations, idempotency keys and rate limits. Determine inclusive tax/shipping calculation and reconcile total against Stripe session.
4. Create test-mode Stripe products/prices and Checkout Sessions. Verify signed raw webhook bodies, livemode/account, session/order linkage, amount/currency and eligible payment status. Record event and transition atomically; handle duplicate/out-of-order events, asynchronous payment, expiry, cancellations and refunds. Do not fulfill from browser redirects.
5. Provide order lookup through authenticated account or expiring high-entropy guest link, transactional receipts, fulfillment queue, tracking, returns and refund reconciliation. Guest checkout should not require game account.
6. Implement optional single-use physical-deck redemption separately: random codes, hashes at rest, batch association, atomic claim to account, revocation rules; never print real codes until manufacturing feasibility is agreed.
7. Add separate digital entitlement and wholesale workflows later. Digital sales tax, withdrawal handling, entitlements and wholesale pricing need independent review.

## Acceptance and rollout
Unit tests: node tests/pilehead-commerce.cjs. Run npm test, frontend typecheck/build and responsive browser tests. Test shop links, mobile nav, enabled/disabled waitlist, and PWA network-only checkout. Validate migration against isolated Postgres; no production DB changes before approval. Checkout launch gate defaults OFF until test-mode purchases, failure/retry/refunds, stock concurrency, privacy/legal review and fulfillment rehearsal pass. Monitor operational failures without logging secrets or buyer PII.
