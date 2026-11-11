# SPARK GAME DESIGN LAB: test protocol and stop/go decisions

## Decision we are trying to make

**Do we have a core game people voluntarily want to replay?** If yes, which prototype is clearer, tenser and more skill-rewarding? If no, stop improving code and explore a third core.

Neither code completion nor bot wins are evidence of fun. Keep original SPARK games untouched until a prototype demonstrates repeat human demand. The evaluation is **head-to-head** between two distinct prototypes, not a ranking based on a developer's favorite.

## Stage 0: internal mechanic sanity (automated)

- Run the pure engines against each other for seeded matches in both player orders.
- Check physical card conservation, rank/color multiplicity, all claims/bids legal, 2–4 players for CLAIM, 2 for SIGNAL, bounded game end, score calculation, secret-choice isolation, and fair visibility.
- Measure repeat state loops, role asymmetry, autopilot move frequencies, runaways, absence of contested interactions and stalled endgames.
- Flag but do not automatically reject a low score-turn rate: in CLAIM, putting a strong card in a lane can be a meaningful strategic turn even without points.

Reproduce with node experiments/game-lab/test.cjs and node experiments/game-lab/simulate.cjs --games 200 --seed 20261111. Bot differences only diagnose probable rule problems; no numerical metric alone proves human skill.

## Stage 1: creator and trusted-playtester trials

Play 6+ matches of each **physical** game (2–4 players for CLAIM, start at 2; 2 players for SIGNAL).
Before changing rules, note every example of:
- Two actually viable moves with different consequences
- Choosing a weak immediate reward to set up a stronger later one
- Changing a plan due to the opponent's visible or expected action
- A player saying "I should have done X"
- A forced or dull move that seemed to have no consequence
- A winner determined largely by an initial deal or automatic dominant action
- Time consumed by bookkeeping rather than decisions

Do not modify three mechanics after one disappointing match. Write a single testable hypothesis and change one variable in an isolated experiment.

## Stage 2: independent comparative human trials

Recruit **at least 12 independent two-person groups** not involved in the design. Each group plays CLAIM and SIGNAL, with alternating concept order (6 start CLAIM, 6 start SIGNAL), and rotate first player. Use a short written explanation, *not* a designer teaching every turn. Also record both preferred and rejected candidate.

For each participant, privately collect:
- Could they correctly explain the basic turn and winning condition without prompting? (yes/no)
- Time to first legal independent move, and number of rules interventions
- For each match, at least one rejected plausible move and the cost of rejecting it
- Would they immediately replay without being asked or paid? (yes/no)
- Overall enjoyment and perceived strategic agency, each 1–5
- Tension: was the final third more exciting or less than the first?
- One confusing mechanic; one memorable action; who they believe outplayed whom and why
- Optional willingness to pay only **after** trying both games, not before

### Session data sheet

| Field | Example |
|---|---|
| Anonymous session ID | P07 |
| Ruleset, seed, print version | CLAIM v0.1, seed 2307 |
| Player count and turn order | 2, CLAIM first |
| Minutes to first move | 1.5 |
| Full match duration | 16 minutes |
| Number of rules interventions | 1 |
| Number of meaningful sacrifices described | 2 |
| Number of reversals attributed to player decisions | 1 |
| Winner score / seat | 20 / seat 2 |
| Voluntary replay | Yes |
| Enjoyment / strategic agency (1–5) | 4 / 4 |
| Exact confusing or memorable quote | (verbatim) |

Capture the players' own words. Do not call a prototype "strategic" in advance of the preference survey.

## Suggested internal go/no-go tests (hypotheses, NOT published norms)

**Early teaching:** 80% of first-time testers should complete a legal move without intervention after a two-minute teach. If fewer, fix rules and onboarding first.

**Replay:** A clear majority (target around 2/3) should voluntarily choose to replay the prototype, ideally after both concepts. Not a guarantee of purchase.

**Agency:** Most players should describe a real sacrifice and a consequence, not just point to a move that scored.

**Pacing:** Most match endings should feel like meaningful decisions remain; avoid endgames where players only wait for stock exhaustion or an inevitable winner.

**Fairness:** Investigate consistent first-seat advantage and dominant strategies with **both** balanced agents and seat-rotated humans; small samples cannot settle it.

**Physical feasibility:** Card counts, privacy, arithmetic, scorekeeping and duration must work without an app or facilitator.

**Novelty:** Search commercial games, read rules, play references, and document substantive mechanical overlap. SIGNAL's simultaneous selection overlaps *Go Nuts for Donuts*, so it faces a higher differentiation bar. No originality claim is authorized at this stage.

**Commercial fit:** Only after gameplay passes should we compare production quotes, box dimensions, manufacturing MOQs, distributor margins, retail positioning, fulfillment, customer acquisition and potential licensing. Draft pricing without quotes is not a business case.

No threshold is a statistically powered proof; in 12 small groups, a few people can change the conclusion. Treat this as a fast kill/continue decision, then expand samples.

## Stage 3: blind playtest and publisher readiness

Once rules stabilize, give new players only a complete print-and-play pack and a rulebook. No verbal explanation. Record disagreements, hidden assumptions and where they refer back to instructions. The goal of blind testing is to prove the **rules packet** survives without the designer.

Before considering a commercial pitch:
- Independent validation from multiple blind groups
- Credible evidence of repeated enjoyment, not only one exciting first round
- Originality and name/trademark review
- Printable physical prototype and tested 2–4-player claim or a documented 2-player positioning decision
- Actual manufacturing/fulfillment costs and an economically viable channel
- Optional clean digital demo, only if it helps teach the game, not as a prerequisite

## Kill criteria

Pause or discard a candidate when:
- Most players cannot explain why they made a move after two independent revision cycles
- The dominant strategy remains to immediately take any visible points, with no meaningful sacrifices
- The outcome depends mainly on uncontrolled hidden replacement randomness
- The last third routinely deteriorates into powerless, scoreless turns
- The mechanic is substantially indistinguishable from an established game without a differentiated reason to exist

## Sources consulted (market/mechanism context, not proof of originality)

- https://tabletoprunner.com/learn/playtesting/blind-playtesting
- https://tabletopmakerlab.com/guides/board-game-playtest-plan.html
- https://boardgamegeek.com/boardgamemechanic/2661/push-your-luck
- https://www.ultraboardgames.com/go-nuts-for-donuts/game-rules.php
