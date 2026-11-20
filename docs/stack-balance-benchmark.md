# STACK synthetic balance benchmark — 20 November 2026

The machine-readable evidence is in \`docs/stack-balance-benchmark-20261120.json\`. This is an **engineering diagnostic**, not a live-player win-rate or retention study.

- 1,000 seeded games per player count (2, 3, 4, 5) and deck variant (historical 52 versus current 54): 8,000 total.
- Same seeded bot policy rotation and probabilistic reaction profile across cohorts.
- Current 54-card games averaged fewer simulated actions in all four player-count cohorts, but both deck variants retained occasional rounds that hit the 1,200-action simulation cap.
- Higher BURN availability changes both the number of burns and the occurrence of out-of-turn SLAMs. Those shifts are not sufficient evidence that players enjoy the game more or less.
- The older deck is reconstructed by removing the additional two BURN identities from a shuffled current deck while preserving the original 52 identities. This compares **deck composition** with stable engine mechanics rather than emulating every historical UI/rule revision.

## Next human-study questions

1. In 2-player play, do long pickup cycles feel tense or tedious? Observe any 10-turn repeated endgame state.
2. After a BURN play, does the actor feel strategic agency or just luck?
3. How often do real players miss a SNAP/SLAM that a simulated attentive player would claim?
4. Do groups voluntarily start a new round, without prompting?

Do not change canonical cards or rules inside a test cohort; clearly label the variant and preserve comparable observations.
