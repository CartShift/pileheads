# Multiplayer latency: first optimization pass (2026-11-27)

## Observed baseline
- Production deployment 4b36e5dfa1212e97dfd2e7155b7fc0ca76205b9a reports region iad1. Both known PILEHEADS Neon projects (development and multiplayer) report aws-eu-central-1. Configure Vercel functions in fra1 and verify the resulting deployment metadata. Do not change database regions or credentials.
- Separate serverless HTTP and WebSocket instances share PostgreSQL, not process memory. The original hub checked every 2,500 ms; each notification then triggered an authenticated HTTP snapshot with a presence write.
- Authenticated commands previously loaded room and membership in two sequential requests. A revision-checked move still needs quota, persistence, and seat-private projection; correctness takes precedence over speculative moves.

## Changes
- Default Vercel region: Frankfurt. Static assets remain CDN-served. Region is not a measured latency guarantee; regional billing may differ.
- Load room and authenticated seat together in one SQL request, preserving missing/expired/incompatible room and invalid seat handling.
- Batch due rooms. During the first 30s after connection or observed activity, target 750ms polls; idle rooms return to 2,500ms. No query without a connected room, no overlapping reconciliation, at most one query per room per 750ms, 2,500ms failure backoff. An authenticated sync hint can expedite the sender's hub, but cannot specify a revision or publish state; other instances still independently reconcile. The first update after a long idle period can still take the idle interval. Active polling may increase read frequency up to 3.33x relative to the old schedule; check Neon/Vercel usage before further tuning.
- Coalesce concurrent snapshot refreshes per room/session into one trailing request. Push-driven refreshes are read-only; periodic presence updates continue, with an 8s minimum interval for quiet heartbeats. Guard stale sockets/room epochs. Render's immediate notifications also cover tournament voting and withdrawal.
- No changes to engine, SNAP/SLAM priority, revision CAS, authentication boundaries, card visibility, database schema, paid services or retention.

## Evidence and acceptance
- Automated policy tests use a deterministic clock; real local WebSockets across two independent hubs exercise external commit convergence, invalid hints and duplicates. API mocks check the single authenticated lookup and private-seat isolation. These are not deployed network benchmarks.
- The existing live smoke emits a single monotonic-clock sample for command acknowledgement, rival invalidation and both clients' HTTP snapshots. Snapshot timing includes the smoke wait loop. The script creates one disposable room and does not print room codes, sessions or private state.
- Run full CI on the exact PR head. Verify preview deployment region and isolated database before any live smoke; run the canonical smoke after merge only when authorized.
- For credible performance evaluation, collect repeated samples from real EU and non-EU clients (warm and cold starts separately), report p50/p95 for acknowledgement and rival state delivery, and compare Neon reads/compute and Vercel usage. Proposed warm EU targets: acknowledgement p95 <300ms; opponent state p95 <1,000ms during active play. These are targets, not observed results. Verify reconnect, stale revisions, simultaneous interrupts, private hands, mobile UX.
- Next phase if observed p95 is still unacceptable: evaluate durable cross-instance event fanout (e.g. PostgreSQL LISTEN/NOTIFY with a direct session connection, or managed pub/sub). Prove lifecycle, reconnect, delivery and cost before adopting it. Keep database reconciliation as recovery, never use client hints as authoritative data. Avoid paid infrastructure without approval.
