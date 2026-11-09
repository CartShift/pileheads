# Physical SPARK rules: opt-in simulation sandbox

This directory is a **standalone experiment**, not linked to dist/, web UI, Sites, D1, human rooms, or archived saves. See related design/research [draft PR #1](https://github.com/yotamon/spark-card-game/pull/1).

## Run

    node tests/physical.cjs
    node experiments/physical/simulate.cjs --games 300 --seed 620000 --deck 144 --turns 8 --output

No installation or CI required. The runner prints JSON and writes reproducible files in results/ with --output. It runs 12 matched-seed arms (2/3/4 players × triples/AABB × forced-right/choose-end). Each experiment is tagged separately from v5.

## Mechanics

- Finite face-down stock (120/132/144/etc), 3 colors, 9-card row, 3-card hand, 8 turns/player by default.
- One regular card placement per turn, matching triples and optionally AABB.
- Simultaneous triple priority, then non-overlapping AABB left-to-right; repeats after collapse.
- Overflow: remove rightmost on zero-score turns, optional choose end.
- Refill: top-card rejection for a new free match; rejected cards enter discard. Bound retries by available stock; force-accept a card when all available candidates are unsafe. Force-accepted matches are scored only when resolved during a subsequent regular move.
- Discard can be reshuffled; removed scoring cards are owned and never re-enter stock.
- Wild and Swap not modeled; physical pieces and economics must be resolved later.

## Design warning

**Not a final physical rulebook.** Forced-refill fairness, finite-stock exhaustion, ability-piece representation, arbitrary overlaps, turn duration and deck cost are unresolved. A human player must not have to peek inside the future stock to follow a rule.

Latest results and caveats: [research-findings.md](research-findings.md). This experiment must remain isolated until real-player validation.

## Guardrails

- Never modify v5 engine, current A/B/C modes, private online-room API or production Sites from this folder.
- Do not alter existing saved-game/replay formats.
- Do not interpret bot statistics as validation of fun, balance or market demand.
