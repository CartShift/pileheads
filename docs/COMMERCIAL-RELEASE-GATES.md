# Commercial readiness release gates

## Implemented in this branch (not released)
- Public deck catalog and deck links.
- Opt-in aggregate product measurement.
- Optional guest profile, recoverable Google account, explicit preference import.
- Server-authoritative beta entitlements, single-use redemption, code batch generation.
- Physical storefront link; Stripe sandbox checkout and signed test webhook/refund suppression.
- Public partner landing page, configurable published editions and internal aggregate SQL reports.
- Web app manifest and SVG icon (not offline PWA or native apps).

## Staging verification (required before merge/enable)
- [ ] Fetch exact branch using authorized GitHub credentials and run npm ci, npm test, npm run build, frontend typecheck and existing integrated/browser tests. Avoid extra CI workflow runs.
- [ ] Verify every friendly route, navigation, mobile landscape/portrait, reduced motion and old Classic route.
- [ ] Verify same-room multiplayer with two real devices, reconnect and rematches.
- [ ] Apply all four migrations on an isolated database, verify rollback/backup and run concurrent code redemption tests.
- [ ] Verify consent and opt-out, no analytics IDs or room/card data in measurement.
- [ ] Verify HTTPS cookies, real Google OIDC, canceled login, session expiry, preference import and deletion.
- [ ] Verify Stripe test checkout, mismatched amount, forged/replayed events, refund-before-payment, partial refunds and canceled checkout.
- [ ] Validate provider configuration, retention and privacy; keep features disabled until checks pass.
- [ ] Reconcile the main branch and run final exact-commit release smoke checks before deployment.
- [ ] No real money until paid product terms, taxes, real refund support, account recovery and payment reconciliation are ready.

## Remaining product work
Real paid product content and access enforcement, production payment integration, storefront merchant setup, partner-specific artwork/configurable themes, isolated partner portal and attribution, admin UI with RBAC and audit logs, public matchmaking, full offline-capable PWA and mobile-store distribution are separate milestones, not complete. No costs incurred by this branch beyond existing infrastructure. No new scheduled jobs or production configuration changes.
