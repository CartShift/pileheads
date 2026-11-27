# Player data retention runbook
Manual operator-only maintenance, disabled from deploy and API execution.
## Scope and policy
- Guest profiles and account sessions: delete only rows whose expires_at has passed (90 and 30 days respectively). Persistent accounts are never automatically deleted by this tool. Guest creation quota: retain the current day plus the previous seven calendar days.
- Anonymous round receipts and linked personal results: delete only expired receipts (90 days); the history association FK, when installed, cascades. Pending consent remains scoped to room/member expiry. The existing room retention script handles room expiry separately.
- Backups and provider/hosting access logs require their own documented retention policy. Expired data is filtered from reads even before physical cleanup. This script does not purport to erase backups.
## Run
1. Verify the intended database and schema. Apply only the appropriate grant file: db/player-retention-access.sql on the player database, db/room-receipt-retention-access.sql on the room database. Provision separate maintenance login(s) securely; never use a runtime or admin URL.
2. Set PILEHEAD_PLAYER_MAINTENANCE_DATABASE_URL for profile/session cleanup and PILEHEAD_MAINTENANCE_DATABASE_URL for receipt cleanup. They may refer to different databases for an unlinked pilot. Linked history requires the same database with appropriate separate roles.
3. Dry run: node scripts/player-retention.cjs profiles ; node scripts/player-retention.cjs receipts . Review counts only.
4. Explicit approved apply: append --apply to the relevant command. Each invocation removes at most 500 expired rows per table and rechecks expiry at DELETE. Run one operator invocation at a time; repeat as needed after verifying aggregate counts. No automatic job or new paid service is provisioned.
5. Apply only after privacy/retention approval and isolated tests. Establish a maintenance cadence before enabling data collection.
## Acceptance
Exact statements run against a disposable PostgreSQL database with scoped roles, >500 synthetic expired rows, active rows, seven-day quota cutoff, dry-run, bounded repeat, no account deletion, and denied cross-role access. Production migration, backup review and operator schedule are not performed by this change.
