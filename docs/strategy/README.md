# SPARK physical-card-game research & decision pack

**Status:** hypotheses and test plan, **not approved product rules**. Prepared 2026-11-09 against `main` at `c8d9d867`.

Start with:

1. [Design strategy](2026-11-09-game-design-strategy.md): player promise, opportunities, research findings, differentiation and risks.
2. [Physical playtest rules](physical-rulebook-experiment-v0.1.md): a practical tabletop protocol and unresolved physical-mechanics decisions.
3. [Experiment roadmap](experiment-roadmap.md): explicit A/B/C comparison, telemetry, human testing and decision gates.
4. [Commercial viability](business-readiness.md): component counts, price, margins, supply chain and launch criteria.
5. [Data](data/): the original independent-model CSV snapshots used to formulate hypotheses.

## Grounding

The live implementation documented in [README](../../README.md) is **Simple+ v0.5**, modes A/B/C, eight moves/player, 2–3 players (solo with bots or human rooms). It uses a 360-card virtual deck and a `findLastIndex` selective-refill rule. A human-friendly printed game **does not yet exist**. No existing gameplay, save format, online room, Sites deployment, or existing mode is changed by this research PR.

The independent physical-design simulations were developed outside this repository using different assumptions. **Do not compare their absolute rates directly with** `dist/sim-core.js` or describe their results as validation of the live engine.

### Order of work

- First: instrument/measure current production-compatible engine without changing rules.
- Second: implement physical-rule parity and test it as an **opt-in experimental ruleset**, without modifying modes A/B/C or older save/replay behavior.
- Third: evaluate the **AABB** scoring hypothesis and the non-scoring edge-discard alternative *separately* using matched seeds and human blind playtests.
- Fourth: decide whether any change is desirable, manufacturable and commercially viable.

Do not merge a rules change based on simulations alone. Keep experiments behind new rules-version identifiers. No production deployment is implied by a GitHub merge.
