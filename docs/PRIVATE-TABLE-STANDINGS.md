# Private table standings (increment 1)
Unranked room-scoped cumulative scoring; not full tournaments or durable player progression.
- Every completed round awards N minus 1-based position. The engine is authoritative; first out wins, last scores zero.
- Tie-break: wins, then shared rank. Bots are scored as seats. No account or additional identity.
- Finalize atomically in existing revision-checked room JSON update. A duplicate or stale command cannot award twice. Bounded aggregates, no extra database table or migration.
- Older rooms start tracking at their first observed round; never synthesize missing history. Rematch preserves the aggregate and previous winner starts. Existing room TTL still applies.
- Public DTO only contains points, wins, placements and seat indices. No private cards or credentials. Settings can vary between rounds; this is a casual table, not a ranked competition.
- UI shows standings on round completion. Acceptance: 2–5 seats, legacy rooms, real terminal mutation, stale duplicate, reconnect/state, rematch preservation. Verify live devices after CI.
- Remaining: locked tournament formats/rosters, durable history, consented rematch lifecycle, ranking, explicit tournament resets and complete result-stage design; see MULTIPLAYER-MASTER-PLAN.md.
