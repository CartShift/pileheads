# TILT ONE · Design Review: Experience Before Complexity
**Date:** 2026-11-11  
**Scope:** ONE's balanced two-player 32-card CORE experiment and optional best-of-three format.  
**Status:** Controlled synthetic tests and software alpha. Not independently playtested or commercially validated.

## What we are optimizing

We want a purpose-built physical shedding game with the immediacy people love in Shithead, but with meaningful decisions, opponent pressure, satisfying rematches and a compelling final act. The customer must understand a turn without learning a chart of special powers.

Our guiding question is **"Would you prefer another round of this over your favorite Shithead variant?"**, not "Can we produce clever-looking win-rate numbers?"

### Working definition of a good decision

For a turn to be genuinely strategic, at least two legal actions must have a plausible and visibly different consequence, and a person should be able to explain why they rejected one. A bot seeing several legal options does *not* establish this. Nor does beating a deliberately poor bot.

The ONE prototypes already have a useful core: one number, one arrow, one shared pile, a matching clear, and a straightforward pickup when blocked. We are preserving that simplicity.

## The accepted changes in this alpha

### 1. Short game (unchanged rules, purpose-designed deck)

- **Regular:** 48 numbered/directional cards, three-card hand.
- **Quick:** 32 balanced CORE cards (two of each unique number/arrow), four-card hand, 16 EXTRA cards aside.
- **Quick short-game target:** approximately 38 simulator turns (not minutes). A separate simulation showed ~24% of turns occur after the stock empties, versus ~11.5% in Regular.
- The physical print pack supports both without requiring a standard poker deck or inventing an extra card power.

**Caution:** Synthetic length is not actual play duration. Quick is still a hypothesis: 38 turns may be too short for a social group or just the right pace.

### 2. Best-of-three set, not extra in-turn mechanics

The best-of-three format adds social stakes without increasing per-turn cognitive load:

1. Flip or randomly select who leads round 1 (the simulator uses the seed parity).
2. The *other* player leads round 2.
3. If tied 1–1, the **loser of round 2** leads the deciding round.
4. First player to win two rounds wins the set; shuffle and deal anew for every round.

The rulebook can teach that in one short paragraph.

Across one early 1,100-set equal-agent batch, player-zero win share was about **47.7% with Strategic, 51.7% with Basic, and 50.5% with Random**. A smaller server-side verification cohort of 180 sets recorded **46.1% Strategic, 52.8% Basic, and 52.2% Random**. These are imperfect samples and no amount of session alternation fixes the **per-round** first-seat bias (which can reach roughly 60% or more under some policies).

The right product framing is "a more even contest across a short match series," not "every individual round is balanced."

### 3. Adaptive AI opponent as an experiment

The original Strategic bot made a sound two-player plan: play flexible cards during stock refills, then restrict the opponent when the stock is empty. But in three-player games, identical bots could circulate 1↓ and 8↑ forever: repeatedly taking a pile top, resetting the pile, and then attacking again.

An experimental **Adaptive** policy now watches only the *public six most recent moves*. If the stock is empty and at least two of those moves are pickups, it temporarily favors more flexible cards instead of immediately playing the most restrictive option. It does not read opponent hands or the unrevealed stock.

In a separate 1,200-seed three-player comparison, 309 Strategic-only matches reached the 240-turn safety cap, versus 1 Adaptive-only match. In the smaller new verification cohort of 180, the figures were 59 versus 0. This shows the *agents* can avoid many repetitive cycles; it does **not** prove the underlying 3-player rules are safe for an actual retail product. The game still lacks formal termination guarantees.

For two-player Quick, Adaptive won only about **46.7% head-to-head** against the existing Strategic bot in one 1,300-match seat-rotated study. Therefore, keep Strategic as the recommended default and offer Adaptive separately. Do not call it an upgrade in competitive strength.

## Experiments we rejected or postponed

We ran isolated mutations of the actual pure game engine rather than merely imagining outcomes. **These experiments are not merged into the ONE ruleset.**

| Candidate | Measured/observed issue | Judgment |
|---|---|---|
| One public starter card before the first move | Flipped the first-mover advantage: about 43% Quick seat-zero wins for Strategic-vs-Strategic instead of about 60% without it, on a 700-match batch | Does not solve fairness robustly |
| Two public starter cards | Quick opening-seat wins roughly 59%; requires extra setup without meaningful new play | Not enough reason to add |
| Extra initial card for one side | Largely unchanged Quick results, still about 59–61% first-seat wins | Poor balance correction |
| Give the first finisher's opponent one "reply" turn | Could move Quick Strategic seat-zero wins near 51%, but often flipped advantages with simpler policies; also produced last-turn ties or an awkward win override | Keep as research, not rules |
| Public face-up opponent card | Under a deliberately simple information-aware bot, the tactical benefit was marginal (best observed ~51–52% vs a conservation-only bot), while stronger focus on blocking the known card often made strategy worse | Prototype for humans only if players demand mind games |
| Spend one resource to reverse an arrow | Mostly spent early, low incremental strategic advantage for added bookkeeping | No |
| Choose face-up replacement vs blind draw | Added an action nearly every turn; tested policies could not reliably outperform blind drawing | No |
| Take two or three cards when stuck | Increased match length and triggered 240-turn stalls in bot batches | No |
| Let a match keep the pile instead of clearing | Made one response too often preferable, an illusion of choice | No |
| Allow pair-card combo plays | Offered extra actions but naive pair-first agents performed worse than card conservation | No |
| Burn pile instead of pickup when stuck | Greatly shortened matches and nearly removed first-seat asymmetry, but also removed the very risk of a pickup | Reject as a default until human trials |
| Burn/pickup behavior changes only after the stock runs out | Reduced some long loops but did not solve all passive bot failure modes, particularly before stock depletion | Do not silently change stage rules |

The correct response to a failed heuristic is not necessarily "this rule can never work." It means the tested implementation failed to earn inclusion. Avoid tuning experiments on the same small seed cohorts until they look good; verify on independent seeds and with human opponents.

## Why 3–4 players are not ready

The current engine can run 3–4 bots for diagnostics, but the user-facing table and recommended retail test are **two-player only**.

Three-player pickup cycles remain a **rules/agent interaction risk**. Adaptive behavior can reduce them dramatically, but human tactics may deliberately trigger other patterns. Before enabling a 3–4-player mode:
- Model the full state transitions of the finite card deck, look for short cycles and non-progress states.
- Establish an accessible physical anti-stall rule *only if necessary*, then verify it doesn't make pickups irrelevant.
- Test human players who deliberately try to stall; do not rely exclusively on greedy or random bots.
- Validate turn order, typical duration, number of accessible choices and comprehension.

## What is implemented and isolated

- Classic and Quick modes remain unchanged.
- \`?mode=quick&series=3\` adds **best-of-three** with a visible scoreboard and rematch flow.
- \`engine.create({firstSeat})\` allows controlled, balanced alternation; older saves with no \`firstSeat\` still open with seat 0.
- \`series.js\` is a small rules-independent helper for seeded rounds, alternate starts, scoring and retrying rare unresolved rounds.
- The series uses a **new local save key**: original Regular and Quick saves are never overwritten.
- An Adaptive bot is available in the opponent selector, but Strategic remains default.
- Printable rules include the optional set format.
- Automated tests cover exact deck invariants, hand privacy, long games, resume/retry, and a real three-round set in the simulated DOM.
- A reproducible \`series-simulate.cjs\` reports per-round leading advantage, equal-policy set win shares, session duration, and 3–4-player adaptive stress diagnostics.

## Mandatory real-player gate

At least **12 independent two-person groups** should try the 32-card Quick game, then a full best-of-three set. Randomize who starts and observe without coaching. Collect:

- Actual **minutes** per round and set, not only turn counts
- Number of teaching interruptions in round 1 versus round 2
- Exact moments of **tactical anticipation** rather than simply saving extreme arrows
- Whether players feel a pickup is threatening or merely a nuisance
- A specific alternative move someone deliberately rejected
- Whether the third round feels tense, predictable, or exhausting
- If one player is better, does their skill overcome the opening advantage?
- If offered a choice between "ONE again," "Shithead," and "stop," what do people actually choose?

**Go/no-go**: proceed to original visual identity, manufacturing quotes and direct-to-consumer plans only if users can teach each other the game, the set length is pleasant, and a meaningful share voluntarily asks for another set. We should not commit to a 32-card retail product, brand, or art style without that evidence.

## Implementation boundary

This remains an isolated experiment in the **same repository**. Production SPARK and older prototype URLs remain unchanged. Do not automatically merge these branches into main, publish a store, order stock, run expensive CI, or imply there is already evidence of market demand.
