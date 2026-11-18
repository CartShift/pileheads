# PILEHEAD — official external playtest kit

**Freeze:** 2026-11-18. **Canonical rules:** `docs/pilehead-design.md` (engine `pilehead-1.3.0`). **Status:** controlled human test, **not** manufacturing / commercial approval.

## Goal and scope

Find out whether unfamiliar players can learn PILEHEAD, choose to replay it, and prefer its purpose-built deck to traditional Shithead. Evaluate **the game itself**, separately from the browser simulator's look and feel. Do not change the deck or core rules within a cohort. The digital engine remains unchanged; only clearly labeled trials may use experimental rules in physical play.

## Ready-to-use assets

- Online or solo play: `/pilehead/index.html`
- Print all 52 playable cards: `/pilehead/print.html` (print at 100%, preferably in opaque sleeves)
- Print one-page player rules and a paper/digital scorecard: `/pilehead/playtest.html`
- Canonical edge cases: `docs/pilehead-design.md`
- Human/bot and online implementation notes: `docs/pilehead-online.md`

## How to run a session

1. Recruit people who **did not build the game**. Use a distinct session ID, no full names or other identifying information.
2. Seat 2–5 people. Record whether they already know Shithead, plus **canonical** or **final-duel experiment**. Start with canonical and only change variant between complete rounds.
3. Hand them the printed deck and quick rules. Do **not** explain unprompted. Time how long they take to begin a valid game.
4. Play at least one complete round. Observe first unassisted SLAM, SNAP confusion, chosen DUMP targets, reactions, pickups, misread action cards, and endgame stalls. Record clock time and approximate move count where possible.
5. Ask **before offering**: “Would you like to play again?” Record whether the group initiates another round, not just whether individuals say they enjoyed it.
6. Collect scorecard data and verbatim confusion notes, without coaching participants toward favorable answers.
7. If appropriate, teach or replay ordinary Shithead with the **same group**, and ask which they would choose for their next card night; alternate play order across groups.

## Recruitment / test matrix

- Aim for at least **12 independent groups** initially, including **4+ two-player** sessions, **4+ three/four-player** sessions, and **2+ five-player** sessions.
- Mix novices and Shithead veterans. Avoid counting repeated sessions with the same people as independent groups.
- Alternate printed and digital tests; clearly tag medium.
- Record platform and screen width for digital sessions; test at least two distinct actual phones for online.
- Keep both positive and negative sessions in the sample.

## Scorecard metrics (one record per completed round)

- `sessionId`: random code, no participant names
- `players`: 2–5
- `experience`: none / some / Shithead regulars
- `medium`: physical / digital local / digital online
- `variant`: canonical / final-duel-triple experiment
- `learnMinutes`: minutes until a group starts playing without assistance
- `roundMinutes`: total duration from first move to last player identified
- `ruleClarifications`: count of external help requests
- `slamsObserved`, `slamsMissed`, `dumpMoments`, `endgameStalls`: observational counts (not bot estimates)
- `spontaneousReplay`: did they ask for or start another game before prompting?
- `fun`, `clarity`, `agency`, `tension`: ratings from 1 (low) to 5 (high)
- `wouldChooseOverShithead`: yes / no / undecided / not compared
- `notes`: what was confusing, funny, unfair, or a reason not to replay

No personal data should be collected or entered into the scorecard. The printable page exports a local JSON file; **nothing is automatically uploaded**. Collect the downloaded JSON files voluntarily and consolidate them offline.

## Hypotheses and decision gates (pre-registered, not universal benchmarks)

- **Learnability:** median time to independent play at most 5 minutes; fewer than two rule clarifications per round after the first.
- **Retention intent:** at least 70% of groups initiate a replay without being asked.
- **Gameplay:** no unresolved match after 40 real-time minutes unless participants actively choose to keep playing; inspect any repeated 10-turn endgame loop.
- **Distinctiveness:** among groups that play both games, more than half should prefer PILEHEAD for another session.
- **Trust:** no hidden-card or move-validation failures across actual two-device multiplayer tests.

These thresholds are **decision criteria**, not statistically conclusive proof of commercial demand. Do not quote them as externally verified success rates.

## Controlled experiment: Final Duel Triple

**Default OFF. Physical playtest ONLY**, with an explicit facilitator explanation. Do not change the online or canonical engine.

When the **draw stock is empty** and **exactly two players remain**, three consecutive number cards of the same rank at the **very top** of the pile burn it, granting the acting player another turn. An eligible player may complete that top run out of turn with matching cards from their currently playable visible layer. A **full four of a kind** remains a legal independent SLAM against any nonempty pile; a nonmatching triple is **not** an independent SLAM. All other rules stay identical.

Compare canonical and variant across separate complete rounds, with roughly balanced player counts and counterbalanced order. Observe whether it shortens tedious endings **without** making the finish anticlimactic.

## Engineering / release gates

- Automated: GitHub Actions Node 24 `npm test`, `npm run build:vercel`, `npm run build` on relevant changes.
- Rules: preserve 52 unique card IDs and identical result across local, server and print examples.
- Bot SLAM: detect a complete independent four even when `slamOpen === false`.
- Online: complete two-device joins, SNAP priority, concurrent SLAM, reconnect, rematch, and final results on actual phones.
- Browser: 360px portrait, tablet, desktop and landscape; mouse, touch, keyboard and reduced-motion.
- Print: card fronts and backs align, text readable, shuffled cards indistinguishable from backs.
- Retail approval: check trademark, artwork licenses, packaging, safety/compliance and printing economics **after** human results.

## Stop/iterate criteria

If players repeatedly ask for rules, no one spontaneously replays, or the endgame stalls persist, address the **specific observed issue** rather than adding more action cards. A satisfactory bot simulation cannot override a poor human playtest.

### Manual next actions

1. Print the cards and at least two copies of `/pilehead/playtest.html` with the desired language.
2. Run three pilot sessions with people unfamiliar with the rules.
3. Save or collect their scorecards; preserve the original responses.
4. Review the results before considering a final-duel rule change or bulk manufacturing.
