# Production security operations

## Database lifecycle

Room expiration is enforced by the API, independent of physical cleanup. The operator-only maintenance script defaults to dry-run and prints aggregate counts, never room codes, state, names, credentials or tokens. No public maintenance endpoint and no automatic deployment hook exist.

1. Verify the target database, backups and approved retention policy.
2. Apply the expiry index in db/room-retention-index.sql separately, outside a transaction. Verify the index is valid.
3. Provision a separate maintenance role with SELECT on rooms and rate limits and DELETE on those two tables. Room members are removed through the existing cascading foreign key. Do not grant the maintenance role to the public API.
4. Inject PILEHEAD_MAINTENANCE_DATABASE_URL locally using the secrets manager. Run node scripts/room-retention.cjs to inspect aggregate counts.
5. After explicit operator approval, run node scripts/room-retention.cjs --apply. Each invocation deletes at most 500 expired rooms and 500 expired rate buckets. Active records are never selected. Verify counts after execution.
6. Only schedule after isolated testing and approval; choose a low-frequency job and account for database wakeups.

## Runtime credentials

Provision a separate non-owner, non-superuser application role with CONNECT, schema USAGE, SELECT/INSERT/UPDATE on the three game tables only. Check actual privileges and test all API operations in an isolated branch before switching. Remove unnecessary inherited grants. Do not give the app schema creation, role administration, deletion or maintenance access. Keep growth credentials separate. Verify Preview does not use Production credentials; do not copy production data into untrusted previews.

## Edge and budget controls

Confirm deployment protection for previews and restricted fork deployment permissions. Inspect custom firewall rules and provider limits; start in log mode where available, observe legitimate multiplayer polling and WebSocket reconnect rates, and only then enforce. Edge rate limits supplement database quotas, not replace them. Scope rules to API paths, avoid blanket blocks, and exclude internal health monitoring only when authenticated. Set usage alerts and hard limits where supported, with explicit owner approval for any paid feature. Confirm both primary and fallback host behavior.

## Incident response

If abnormal cost or abuse occurs, inspect aggregate usage, limit the affected endpoint at the edge, preserve minimal evidence privately and rotate compromised credentials. Do not publish incident details, secrets, or player data in public issues or logs. Restore access gradually and verify live gameplay. Never treat passing CI as evidence that provider-side controls are configured.
