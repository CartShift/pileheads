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

## Canonical production evidence — 2026-11-28

Before and after both live runs, Vercel reported the canonical production alias pileheads.com as READY, fra1, commit e14b12a63d4f03d16b838cdf5f12b93019d99f40, deployment [dpl_GSpVNhzrihJuV5mQHMQirRgt85Rx](https://vercel.com/cart-shift/pileheads/dpl_GSpVNhzrihJuV5mQHMQirRgt85Rx). This correlates provider metadata with the live run; the health response itself does not carry a Git SHA. No public traffic or real user rooms were touched.

- [One-move live smoke](https://github.com/CartShift/pileheads/actions/runs/46089052791): database health, two-player room/create/join, authenticated WebSockets, private hand projection, synchronized start, committed move, reaction, reconnect and retained seat all PASS. Single observed command ack 156ms, rival invalidation 782ms, both snapshots 1063ms.
- [20-move live smoke](https://github.com/CartShift/pileheads/actions/runs/46089143540): same checks PASS plus public-state equality, one revision per command, opponent hand/blind-slot redaction, own blind indexes on each committed action. All 20 requested samples recorded. Both tests used separate disposable rooms, no real player identities, no secrets logged. Source candidate 3468128. The one-off same-repo PR trigger was removed in #219; ongoing use is explicit manual dispatch with sample count 1 or 20.

| Metric (ms) | p50 | p95 | Max |
| --- | ---: | ---: | ---: |
| Command acknowledgement | 138 | 158 | 168 |
| Rival invalidation | 461 | 779 | 847 |
| Both HTTP snapshots after notification | 777 | 1010 | 1089 |

Interpretation: acknowledgement below 300ms target in this sample; rival notification below 1000ms; both-snapshot proxy slightly above 1000ms at p95. The snapshot metric includes a 100ms waiter cadence and two presence-refresh requests; it is not equivalent to actual rival browser render latency. Runner location unverified; sequential warm-ish two-client room, not independent samples or cold/weak/mobile network measurements. No latency SLA or commercial acceptance inferred. Need real device and EU-client timings and concurrent interrupt/fallback assessment.

Read-only provider inspection: both known PILEHEADS Neon projects report aws-eu-central-1 and Vercel fra1. Detailed Neon compute/network consumption endpoint returned HTTP 403 (Launch+ only). Do not upgrade or change transport/cadence on that basis; current data does not justify paid services. Resource cost comparison remains open. No schema, rules, region, account, privacy or deployment settings changed.
