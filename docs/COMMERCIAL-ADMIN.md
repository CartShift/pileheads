# Commercial administration

Run through a trusted operator's terminal, not a public web endpoint. Apply migration 005 after 001–004 on staging. The function uses invoker rights and revokes PUBLIC execute; explicitly grant execution and the minimum required table/sequence privileges to a dedicated operator role. Do not grant this function to the application role. Test the deployed role policy in PostgreSQL. Supply STACK_ADMIN_DATABASE_URL only in the operator environment. Never commit it or print it.

- `node scripts/commercial-admin.cjs report` shows aggregate entitlement and batch counts.
- `node scripts/commercial-admin.cjs grant ACCOUNT_UUID founder-supporter promotion` is a dry run, requiring no DB access.
- Append `--apply` and set STACK_ADMIN_ALLOW_MUTATIONS=true for an authorized real mutation.
- Actions: grant, revoke, restore. Reasons: support, promotion, correction, refund, abuse. Account row lock serializes with redemption. No-op changes do not add audit rows. Audit records use database current_user, not a claimed individual operator; use distinct operator credentials when possible. Account deletion nulls the audit account reference. Define audit retention before enabling.

The account page displays its own support reference (UUID, not an authentication secret). The demo Founder scorecard download at /api/account/bonus checks a current server-side entitlement on every request, returns a private/no-store attachment and denies sandbox purchase IDs. Downloaded content can be shared; this is access enforcement, not DRM. No live paid product is created.

Before release: verify real database permissions, mutation and audit atomicity, account deletion, revocation immediately denying future downloads, concurrency, and support identity verification. No admin dashboard or partner tenancy is claimed.
