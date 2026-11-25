# Commercial readiness release gates

## Implemented in this branch (not released)
- Public deck catalog and deck links.
- Opt-in aggregate product measurement.
- Optional guest profile, recoverable Google account, explicit preference import.
- Server-authoritative beta entitlements, single-use redemption, code batch generation.
- Physical storefront link; Stripe sandbox checkout and signed test webhook/refund suppression.
- Public partner landing page, configurable published editions and internal aggregate SQL reports.
- Web app manifest, SVG icon, opt-in offline Classic cache; native apps not included.
- Audited operator CLI and entitlement-protected founder scorecard.

## Staging verification (required before merge/enable)
- [ ] Fetch exact branch using authorized GitHub credentials and run npm ci, npm test, npm run build, frontend typecheck and existing integrated/browser tests. Avoid extra CI workflow runs.
- [ ] Verify operator DB permissions, audit atomicity and protected downloads after revocation.
- [ ] Verify offline install/update/remove, local bot gameplay in airplane mode and no caching of private routes.
- [ ] Verify every friendly route, navigation, mobile landscape/portrait, reduced motion and old Classic route.
- [ ] Verify same-room multiplayer with two real devices, reconnect and rematches.
- [ ] Apply all five migrations on an isolated database, verify rollback/backup and run concurrent code redemption tests.
- [ ] Verify consent and opt-out, no analytics IDs or room/card data in measurement.
- [ ] Verify HTTPS cookies, real Google OIDC, canceled login, session expiry, preference import and deletion.
- [ ] Verify Stripe test checkout, mismatched amount, forged/replayed events, refund-before-payment, partial refunds and canceled checkout.
- [ ] Validate provider configuration, retention and privacy; keep features disabled until checks pass.
- [ ] Reconcile the main branch and run final exact-commit release smoke checks before deployment.
- [ ] No real money until paid product terms, taxes, real refund support, account recovery and payment reconciliation are ready.

## Remaining product work
Commercial product content beyond the demo scorecard, production payment integration, storefront merchant setup, partner-specific artwork/configurable themes, isolated partner portal and attribution, admin UI with RBAC (operator CLI and audit log exist), public matchmaking, real-device offline/PWA validation and mobile-store distribution are separate milestones, not complete. No costs incurred by this branch beyond existing infrastructure. No new scheduled jobs or production configuration changes.

## Reproducible verification commands

`npm run build && npm run test:integrated` now checks all seven product routes, real local HTTP routing, offline headers and fail-closed feature defaults without passing database or provider credentials to the server. `npm test` includes migration-harness guard checks. For a separately provisioned disposable LOCAL PostgreSQL database named `stack_test_*`, set `STACK_VERIFY_PG_HOST=127.0.0.1`, `STACK_VERIFY_PG_DATABASE`, `STACK_VERIFY_PG_CONFIRM=disposable-local` and local PostgreSQL credentials, then run `npm run test:commercial:db`. The latter executes the five reviewed migrations and database invariants in one isolated schema and rolls back. It does not cover multi-connection concurrency or deployed role privileges; those remain explicit staging gates. Do not point it at production or a tunnel to production.

## Main integration

The official homepage, canonical refined card artwork and committed-card animation/sound work from main are preserved. Commercial navigation and opt-in controls are added to the official footer; React now has one three-theme registry (refined default, classic characters, original), and API/SQL validation accepts those IDs. The five migrations are still unreleased and their deck constraints/defaults were updated before application. The offline cache includes the new refined face/back assets. Validate exact merged commit and visual layout before release.

The subsequent unified design system and optimized homepage assets from main are preserved; the Classic offline allowlist includes its shared stylesheet, local font, logo and grain. Root MotionProvider remains the single provider for all React routes.

## Browser release coverage

The existing full-acceptance workflow now runs the official homepage tests and `node tests/stack-commercial-browser.cjs` using the existing Playwright installation. The commercial browser test uses a local server with provider credentials stripped, checks the three deck choices and disabled-feature states, then installs the public cache, switches the browser offline, starts a Classic two-player local game and removes the cache. Real device offline gameplay through completion remains a separate release gate. The fast suite also runs the static unified design system checks. Database-only changes are included in CI path detection. No extra workflow, scheduled job or provider is introduced.
