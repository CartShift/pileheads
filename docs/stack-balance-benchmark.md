# STACK Final Duel v1.7 balance benchmark, 22 November 2026

See `docs/stack-balance-benchmark-20261122.json` for reproducible machine-readable data. The earlier v1.6 report remains preserved in `docs/stack-balance-benchmark-20261120.json`.

**12,000 seeded synthetic matches:** 1,000 for each of 2–5 players in three cohorts. `current54` (v1.7) and `classic54` (v1.6) have the **same 54-card deck**; only the Final Duel rule changes. `legacy52` uses the old 52-card deck and classic pickups.

| Players | Classic 54 mean moves | Final Duel 54 mean moves | Classic capped at 1,200 | Final Duel capped at 1,200 |
|---|---:|---:|---:|---:|
| 2 | 128.49 | **107.65** | 1/1,000 | 0/1,000 |
| 3 | 141.09 | **119.26** | 0/1,000 | 0/1,000 |
| 4 | 165.38 | **139.93** | 4/1,000 | 0/1,000 |
| 5 | 187.08 | **156.16** | 3/1,000 | 0/1,000 |

Under these synthetic bot strategies, the new rule eliminated all 1,200-move caps in 4,000 v1.7 simulations while preserving every deck identity. It does not prove every possible game terminates or that players prefer this rule. Complete real-player testing, real-device multiplayer QA and fair-play review before claiming retail readiness.
