# STACK Endgame Lab

An **isolated local-only playable experiment** comparing two anti-loop rules. Classic engine, production local saves, multiplayer API and existing rooms remain unchanged.

## Play and compare

- **Final Burn:** \`/pilehead/endgame-lab.html?rule=final-burn\`
- **Final Duel:** \`/pilehead/endgame-lab.html?rule=final-duel\`
- **Classic control:** \`/pilehead/index.html\`

The experiment chooses a reproducible deal seed and puts it into the URL. Switching the rule preserves that seed and has a separate save per variant and seed. **New deal** starts a fresh seed. Local bots and pass-and-play work; online multiplayer is intentionally unavailable in the lab. To see the difference, test 3–5 players; with 2 players both variants activate at the same time.

### Experimental rules

**Final Burn:** Once the draw stock is empty, every pickup burns the **visible top card** permanently. The remaining cards are added to the recipient's hand.

**Final Duel:** The same rule, but only when the draw stock is empty **and exactly two active players remain**.

The trigger is checked at the instant the pile is collected. The rule covers regular take, failed blind flips and DUMP (both direct targeting and pending blind DUMP). Before activation, the game behaves like Classic. A one-card pile can be taken and burned without receiving any cards, but the pickup consumes the turn. This *may* create a strategy to deliberately take small piles, so it requires human testing before release.

The events expose \`erodedCount\` and the actual \`takenCount\`, and the UI shows the newest burned card on the right. BURN, SLAM, four-of-a-kind and other base actions remain unchanged.

### Isolation and reproducibility

- \`endgame-lab-engine.js\` is the experimental \`pilehead-lab-1.6.1\` engine with centralized \`collectPile()\` handling.
- \`endgame-lab-app.js\` stores to \`pilehead-endgame-lab-v1-{rule}-{seed}\`, not Classic's \`pilehead-playtest-v11\`.
- \`endgame-lab.html\` loads neither production \`app.js\` nor authoritative \`online.js\`.
- \`tests/pilehead-endgame-lab.cjs\` is automatically included in \`npm test\`, covering both activation rules, normal take, no erosion before the stock is empty, one-card piles, blind failure and finishing, both DUMP pathways, card conservation and the two known infinite-loop seeds.
- \`scripts/bench-endgame-lab.cjs\` compares both modes with Classic across the same seeded games.

### Simulation results

250 deterministic bot games per row, 2–5 players, cap 1,800 moves. These are **not** human playtests and do not verify the live browser deployment.

| Players | Rules | Finished /250 | Median moves | p95 moves | >200 moves |
|---|---|---:|---:|---:|---:|
| 2 | Classic | 248 | 91 | 138 | 3 |
| 2 | Final Burn | 250 | 85 | 122 | 0 |
| 2 | Final Duel | 250 | 85 | 122 | 0 |
| 3 | Classic | 250 | 135 | 264 | 37 |
| 3 | Final Burn | 250 | 112 | 161 | 1 |
| 3 | Final Duel | 250 | 124 | 208 | 16 |
| 4 | Classic | 250 | 136 | 265 | 41 |
| 4 | Final Burn | 250 | 103 | 140 | 0 |
| 4 | Final Duel | 250 | 129 | 204 | 16 |
| 5 | Classic | 248 | 158 | 317 | 69 |
| 5 | Final Burn | 250 | 102 | 137 | 0 |
| 5 | Final Duel | 250 | 147 | 235 | 42 |

Known pathological 2-player seeds \`20263535\` and \`20264844\` remained playing after 2,000 Classic moves. Both lab variants finished them at moves 89 and 62 respectively.

**Interpretation:** Final Burn shortens long multiplayer games more aggressively, while Final Duel preserves more of the original early-game pacing. Neither guarantees that the resulting physical-card game is more fun or balanced. Player exploitation, especially voluntary takes of one-card piles, still needs testing.

### Before shipping a canonical rule change

1. Real browser checks on Android and desktop: deal, setup, move, take, DUMP, blind fail, mode selection, separate saves, visible burned pile.
2. Human playtests of both variants, comparing duration, comebacks, strategic small-pile pickups and enjoyment.
3. Choose a rules version and pin previously created rooms to the original rules; update server engine, physical deck rules, history and animations in one coordinated release.

No production or online rules were modified by this experiment.
