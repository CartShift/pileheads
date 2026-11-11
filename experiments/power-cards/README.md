# TILT ONE · Power Cards Lab

**Stage:** experimental 2-player physical card game, three alternative Joker rules.  
**Date:** 11 November 2026.  
**Design goal:** create moments of suspense, reversal, and laughter *inside an individual match*, without extra turn bookkeeping or remembering cards from past turns.

## Core insight

Shithead's full-pile Joker creates a memorable social event: everybody watches a discard pile get larger and knows a dramatic punishment might be imminent. The original ONE quick variant only forces pickup of the **top** card when stuck, so its pile lacks that escalating threat.

We need the right **counterplay**, not merely bigger punishment.

## How to physically play

- 2 players only. Use the **32 CORE cards**, containing **30 numbered-and-arrow cards and exactly 2 Jokers**. Set the 16 EXTRA cards aside.
- Deal 4 to each player. The other 24 form the face-down stock.
- Number cards: play a number in the direction shown on the top card. Matching rank clears the pile. If you cannot play, take only the top card; the rest clears.
- Joker: playable over any card. **Place it SIDEWAYS to the pile, so the previous top number remains visible**. The next player must respond to the threat; otherwise they take the *entire pile*, consume their turn and the attacker leads again. The Joker is burned permanently, not put into either hand.
- Draw back to 4 after playing any card while the stock lasts; never draw after taking cards. First player with no hand cards after stock depletion wins. **A pending Joker must resolve before victory**.
- An early Joker played onto an empty pile functions as a zero-damage skip. This is a known experimental edge case, **not** an endorsed final rule.

The current 48-face custom prototype retains all 16 EXTRA cards and replaces 2 CORE numbered cards, rather than appending Jokers to an ordinary poker deck. Specifically, one 1↑ and one 8↓ were replaced. That changes the regular number distribution slightly; those removed cards are both very flexible.

### Three variants available for A/B tests

| Mode | What the defender can do | Design hypothesis |
|---|---|---|
| **Plain** | Take the whole pile; no counter | Maximum emotional impact; risks excessive luck and helplessness |
| **Joker counter** | Counter with the second Joker; reflected pile goes to attacker; defender leads | A dramatic rare surprise, but depends on drawing the other Joker |
| **Match counter** | Play the SAME rank printed on the visible top card beneath the Joker to reflect the entire pile | More accessible and potentially skillful counterplay using ordinary cards |

After a successful counter, the counter card and Joker are burned, the attacker's hand receives the pile, the attacker loses their next lead, and the defender opens a fresh pile.

Crucially, the challenged number **never becomes hidden**; a player does not need to remember what happened in an earlier round. The Joker stays to the side until the threat resolves.

## Experiments and results

All bot comparisons run the actual deterministic rules engine with 48-card conservation checks, count 16 unplayed EXTRA cards, rotate policy seat assignments across identical seed pairs, and preserve the deck's physical stock/refill mechanics. The selected policy is a transparent heuristic based on own hand, currently visible pile, and stock size. It **never reads hidden opponent cards or unrevealed stock order**.

One 450-game same-policy timing-bot cohort:

| Metric | Original Quick | Plain Joker | Joker counter | Match counter |
|---|---:|---:|---:|---:|
| Median simulated actions | 36 | 44 | 43 | 44 |
| Counter reactions per game | 0 | 0 | ~0.1 | ~0.6 |
| Full-pile attacks per game | 0 | 2.0 | ~1.7 | ~1.4 |
| Large attacks (4+ cards) per game | 0 | ~1.2 | ~1.0 | ~0.8 |
| First-seat win share | ~60% | ~51% | ~51% | ~50% |
| Safety-limit draws in these samples | 0 | 0 | 0 | 0 |

Separate cohorts with 500 held-out seeds and 3 different pairs of normal cards replaced by Jokers reproduced broadly similar counter rates and no safety-cap draws. Replacing highly restrictive ordinary cards with Jokers made matches considerably longer than replacing flexible or middle cards, so **which exact cards are replaced matters**. The CORE configuration remains an experiment.

One early 900-game seat-rotated timing-vs-greedy comparison found:
- Plain Joker timing bot: ~56% wins
- Joker-counter timing bot: ~56% wins
- Rank-counter timing bot: ~51% wins

**Important:** The match-counter rule *increased the frequency of reactions*, but **did not clearly increase skill advantage in these simple bot-vs-bot matchups**. It may primarily add exciting reversals, or it may reward tracking publicly revealed rank counts; we have not demonstrated the latter yet. Neither a win rate against Random nor more legal reactions proves fun or depth.

All gameplay-test suites passed in an isolated Vercel Node runner:
- Core rules, pending Joker, rank defense, Joker defense, pickup and counter-turn transitions
- 2,550 complete mixed-bot games with physical card conservation
- Six UI regression scenarios, including a visible challenged number and private hotseat handoff
- Print layouts with **48 faces = 30 ordinary CORE + 2 JOKER CORE + 16 EXTRA**
- A repeatable short-batch simulation across variants

These checks do not substitute for real Android visuals/touch/audio or manual physical playing.

## Related existing games

The full-pile Joker mechanic already appears in Shithead house variants, including [Pagat's superjoker](https://www.pagat.com/invented/sh_vars.html) and several [online Shithead variants](https://www.shithead.eu/). Countering with a Joker is already known. Our visible-rank match counter is a specific prototype hypothesis, **not** a verified novel idea, and there is no legal/IP clearance yet.

Custom cards and a unique graphic identity alone cannot establish commercial differentiation.

## Human experiment (do this before adding more power cards)

Recruit 8–12 independent 2-player pairs, preferably not already aware of our preferred rules. Randomize the sequence in which pairs try the three variants; rotate the starting player.

During each match, record:

1. Match duration in actual minutes, not simulated turns.
2. How many cards were in the pile when a Joker was played and how many the victim actually took.
3. Whether the Joker was held intentionally, and whether the player can explain the timing.
4. Did the threat create suspense **before** the Joker was played?
5. Did defending by matching the *visible* rank feel intuitive or like a second rule to memorize?
6. Did any reflection feel like a deserved comeback versus a random punishment?
7. Which version did players choose voluntarily to replay? Compare this with familiar Shithead, not just our previous ONE prototype.

**Kill conditions:** Players spend more time processing Joker exceptions than anticipating opponents; the same card always dominates once drawn; attacks on empty piles feel cheap; or the game routinely turns into a tedious 10-card hand for the victim.

## Research next, not implemented

- Whether one Joker is sufficient, given two Jokers produce around two threat moments per match.
- Whether the only defense should be a universal **clear** card or a successful ordinary-rank match.
- Public-card-counting and information-set Monte Carlo agents to test whether a skilled player can actually select high-value Joker timing.
- Redesigning the CORE count distribution after choosing the special cards, to avoid unfairly allocating the strongest normal ranks.
- Human testing of the shared pile's emotional visibility and its increasing threat.
- Familiar Shithead numbered powers 2/3/7/8/10 were **not** copied into this prototype; accumulating more rules is a conscious non-goal.

## Run locally

From the repository root:

    npm run test:power-cards
    npm run simulate:power-cards

Or use:

    node experiments/power-cards/simulate.cjs --seeds 500 --seed 20261111

The isolated browser preview uses:
- \`?rule=plain\` no counter
- \`?rule=joker\` counter with a second Joker
- \`?rule=match\` counter with a visible matching rank (default)

Each rule variant has a **different local save key**. Existing ONE, Zigzag and production SPARK are not changed. This is a draft research branch, not an approved physical product.
