# PILEHEADS — canonical engine benchmark, 2026-11-28

## Method

Source pinned to [benchmark candidate c98fbaa](https://github.com/CartShift/pileheads/commit/c98fbaa17a9a8b458332a589cea8fd6e8ff5ed45), engine pilehead-1.7.0. The CommonJS pure engine and benchmark source were loaded into an isolated V8 JavaScript runtime with a restricted module loader. No production rooms, credentials, database or browser involved. This is actual deterministic engine execution, not a Node 24 integrated test, live latency measurement or human preference study. The exported cohort function was exposed in-memory to run the two-player large sample; game logic unchanged. CI separately passed on the candidate: [fast](https://github.com/CartShift/pileheads/actions/runs/46086719187), [full](https://github.com/CartShift/pileheads/actions/runs/46086719152).

Reproduce all cohorts: `node scripts/bench-simulator.cjs 10000 1800 20261128`.
Preliminary run: `node scripts/bench-simulator.cjs 1000 1800 20261128`.
Starter rotates by seed index, policy rotation cycles greedy/saver/random, canonical 2-player SKIP omission, immediate bot priority as server advance: pending DUMP, SNAP, SLAM, ordinary turn/Counter DUMP. Seed sequence first + Math.imul(index, 2654435761), uint32. Every engine step checks invariants. Event history bounded like online. Capped games are not automatically adjudicated. Move counts can be slightly below step cap when a DUMP decision has separate steps.

Actual sample: 8,000 matches (1,000 per player count/variant), plus 20,000 two-player matches (10,000 per variant, including first 1,000 each from the smaller run). 26,000 distinct cohort/seed matches. Full 10,000-seed cohorts for 3–5 seats remain open. No invariant exceptions in these runs.

## Two-player large sample

| Rule | Games | Completed | Cap | Mean observed moves | Observed p50 | p95 | p99 | Max observed | Longest no-progress streak |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Classic | 10000 | 9994 | 6 | 130.7928 | 101 | 289 | 549 | 1800 | 1581 |
| Final Duel | 10000 | 10000 | 0 | 100.0461 | 91 | 166 | 244 | 535 | 253 |

Classic completed-only mean 129.7907, p50 101, p95 288, p99 534, max 1765. Final Duel results are all completed. Mean observed moves reduced 23.5%; p95 reduced 42.6%. Completed first-out wins: Classic [4859,5135], Final Duel [4952,5048]. Starter wins: Classic 5034/9994 completed, Final Duel 5070/10000. No causal claim about seat balance from these bot policies; compare confidence intervals and policy assignments before changing rules.

Classic capped cases (all 1800 steps/moves):

| Seed | Starter | Policy rotation |
| ---: | ---: | ---: |
| 67756809 | 1 | 1 |
| 2569167974 | 0 | 1 |
| 1216671677 | 1 | 2 |
| 3147958191 | 1 | 2 |
| 951830930 | 0 | 1 |
| 1732672000 | 0 | 1 |

Event counts, same large sample (Classic / Final Duel): SNAP 15166 / 15166; SLAM 20577 / 18220; Counter DUMP 201 / 201; DUMP 16859 / 16496; BURN 30848 / 30125; pickup 167934 / 120744.

## Preliminary 3–5 player sample (1,000 each)

| Players | Rule | Completed | Observed mean | p50 | p95 | p99 | Max | Longest stall |
| ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 3 | Classic | 1000 | 145.115 | 119 | 295 | 529 | 1159 | 974 |
| 3 | Final Duel | 1000 | 114.810 | 110 | 169 | 201 | 247 | 77 |
| 4 | Classic | 1000 | 164.605 | 138 | 357 | 534 | 1172 | 841 |
| 4 | Final Duel | 1000 | 134.281 | 127 | 216 | 282 | 390 | 196 |
| 5 | Classic | 999 | 186.855 | 156 | 377 | 657 | 1799 | 1576 |
| 5 | Final Duel | 1000 | 148.857 | 139 | 229 | 315 | 502 | 279 |

Five-player capped Classic case: seed 349080934, starter 3, rotation 2, 1800 steps, 1799 moves. Completed-only mean 185.2412, p95 377, p99 657, max 1783. No Final Duel caps in the tested samples.

## Decision and open work

Keep Classic as the default and Final Duel optional. These synthetic results support investigating long-game experiences and comparing variants during consented human playtests; they do not prove commercial enjoyment, fairness for real users or guaranteed termination. Do not silently force a cap or change rules. Extend 3–5 seats to 10,000 each, investigate capped seeds with state/event traces, compare human duration and preference, and retain raw reports for final acceptance. The old [2026-11-22 benchmark](stack-balance-benchmark.md) remains historical; its policy and rules cohorts are not directly interchangeable.

## Full 80,000 distinct-match acceptance — 2026-11-28

The remaining 3–5 player cohorts completed on Node 24 in [workflow 46088132878](https://github.com/CartShift/pileheads/actions/runs/46088132878), candidate 04e9355. All three matrix jobs succeeded with 10,000 seeds per rule and seat count, identical first seed/cap/policies to the preliminary run. The previously executed two-player large sample remains the two-player evidence. Earlier smaller samples are overlapping, not additional unique matches. No invariant exceptions. Raw JSON includes events, per-seat/starter outcomes and capped seeds.

| Players | Rule | Completed / 10000 | Mean observed moves | Observed p50 | p95 | p99 | Max observed | Longest stall |
| ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 2 | Classic | 9994 | 130.7928 | 101 | 289 | 549 | 1800 | 1581 |
| 2 | Final Duel | 10000 | 100.0461 | 91 | 166 | 244 | 535 | 253 |
| 3 | Classic | 9996 | 148.3209 | 119 | 307 | 567 | 1800 | 1682 |
| 3 | Final Duel | 10000 | 115.1268 | 110 | 171 | 210 | 383 | 231 |
| 4 | Classic | 9997 | 165.4036 | 138 | 334 | 575 | 1800 | 1346 |
| 4 | Final Duel | 10000 | 133.5094 | 125 | 215 | 281 | 701 | 500 |
| 5 | Classic | 9997 | 182.9417 | 155 | 359 | 618 | 1800 | 1621 |
| 5 | Final Duel | 10000 | 148.7391 | 140 | 236 | 315 | 742 | 323 |

40,000 Classic games: 39,984 completed, 16 capped. 40,000 Final Duel games: all completed. Mean observed moves across equally sized cohorts: Classic 156.86475, Final Duel 124.35535 (20.7% shorter). These are observed capped distributions, not human durations or a proof of termination. No rule changes approved or implemented.

Additional capped Classic seeds (players / seed / starter / rotation / moves; all 1,800 steps):
- 3 / 887427994 / 2 / 0 / 1800
- 3 / 96814659 / 2 / 2 / 1800
- 3 / 1095424672 / 1 / 2 / 1800
- 3 / 669317640 / 0 / 2 / 1800
- 4 / 4201457820 / 0 / 2 / 1800
- 4 / 1614910024 / 0 / 2 / 1800
- 4 / 1157790689 / 1 / 1 / 1799
- 5 / 349080934 / 3 / 2 / 1799
- 5 / 2031244791 / 3 / 0 / 1798
- 5 / 1691463555 / 3 / 2 / 1800

Raw artifacts (retention 30 days): [3 seats](https://github.com/CartShift/pileheads/actions/runs/46088132878/artifacts/15239747405), [4 seats](https://github.com/CartShift/pileheads/actions/runs/46088132878/artifacts/15239394680), [5 seats](https://github.com/CartShift/pileheads/actions/runs/46088132878/artifacts/15239652776). Reproduce with `node scripts/bench-simulator.cjs 10000 1800 20261128 3` (or 4/5) on #211 candidate. Full-size S02 benchmark execution is now verified; capped-state trace analysis and human preference remain open.
