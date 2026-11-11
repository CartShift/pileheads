# SPARK GAME DESIGN LAB v0.1
## Two separate physical card games, deliberately NOT a commercial rules release

This lab compares **CLAIM**, an open lane-control/push-your-luck game, and **SIGNAL**, a secret simultaneous bidding game. Neither game replaces the previous SPARK Simple+, Momentum, or Duel variants.

Play with paper cards from [print.html](print.html). Print at 100% / actual size, cut apart, and insert into identical **opaque-backed** sleeves. Do not combine the decks: CLAIM and SIGNAL have different distributions.

---

## Game A: SPARK CLAIM

**Concept in one sentence:** Play a card to strengthen one of three lanes, then decide whether to bank an available lane now or risk losing it while trying to make it bigger.

**Players:** 2–4. Begin tests with 2.  
**Components:** 72 cards: Orange, Blue and Purple, ranks 1, 2 and 3, eight copies of each color/rank. Paper score track or pen and paper. Three color-labeled lanes (paper labels optional).

### Setup

1. Shuffle all 72 cards. Deal four cards to each player.
2. Leave three public lanes empty, one for each color.
3. Everyone holds a private four-card hand. All cards played to lanes stay **face up**, arranged by **owner** so their strengths can be totaled.
4. Choose the first player. Play clockwise.

### Each turn, in this order

1. **Play one card** from your hand into the lane matching its color. A Blue 3 must go in the Blue lane. Draw one replacement card, so you return to four in hand.
2. **Overload check.** If that lane now contains **seven cards**, immediately resolve it: sum all visible rank numbers owned by each player in that lane. The unique highest total takes the whole lane and scores; a tie for highest total discards all seven cards with no points. Empty that lane.
3. **Optional bank.** You may now bank **one** of the remaining lanes of any color, including a lane other than the one you played to, if it contains at least three cards AND your total strength is **strictly higher than every other player's**. If you bank, take all of that lane's cards as your captured pile, add its points to your score, and empty the lane. Alternatively, leave everything in place and **press** for a more valuable claim later.

You must play a card every turn. Banking is never a separate turn, and it is never mandatory.

### Points

- Banking or winning an overload of **3 or 4 cards** scores that many points.
- Banking or winning an overload of **5, 6 or 7 cards** scores **twice** the number of cards (5 cards = 10 points; 6 = 12; 7 = 14).
- An overload tie awards **zero** points.
- These are points written on the score sheet, **not** extra physical cards taken from the draw pile.
- Only a **strict** strength leader may bank. Example: your Blue 3 + Blue 1 beats a rival Blue 2 + Blue 1 (4 vs 3), even though both played two cards.

### End

Play 14 turns **per player** for 2 players, 12 turns each for 3 players, or 10 turns each for 4 players. After the final turn, any unclaimed cards left in lanes score nothing. The highest score wins; equal highest scores tie. The 72-card deck supports all these configurations without requiring recycled stock.

**Example:** Orange lane has your Orange 3 and Orange 2, and the opponent's Orange 3, total three cards; you lead 5 to 3. You can play a different card, then bank Orange for 3 points. Instead, you could leave it, hoping both players add two more cards: at five cards, a successful bank is worth 10. You risk a rival taking the strength lead before your next turn.

**Physical friction to observe:** Tracking owners, adding strengths, and knowing when a lane may be banked. If people continually need calculations or forget the doubling threshold, simplify before continuing.

---

## Game B: SPARK SIGNAL

**Concept in one sentence:** Secretly choose one card from your hand and one of three public prizes; win by predicting which prizes your opponent will contest and how strong a bid they will make.

**Players:** 2 for this prototype. A 3–4 player ruleset is a **future design challenge**, not promised by this release.  
**Components:** 60 cards: Orange, Blue, Purple and Green, ranks 1–5, three copies of each color/rank. Six little numbered target markers: P1 has 1/2/3, P2 has 1/2/3 (print or cut from the print-and-play reference sheet). Score sheet or pen and paper.

### Setup

1. Shuffle all 60 cards. Deal **five private cards** to each player.
2. Reveal **three prize cards** in the middle, labeled 1, 2, 3. Each prize is worth the rank number printed on it (1–5).
3. Place the two sets of target markers near their players. Mark round 1 on paper.

### Each round (both players choose simultaneously)

1. **Secretly choose** one card from your hand and one target marker (1, 2 or 3). Put the chosen bid card and target marker **face down**, so the other player cannot tell which prize you selected.
2. Both players **reveal their bid and target at the same time**.
3. If you targeted **different** prizes, each player takes the prize they selected. You both score its printed number.
4. If you targeted the **same** prize, compute bid strength: **your bid card's printed number, plus 2 if its color matches the prize**. The higher bid strength takes the prize. If strengths tie, **neither player takes it**.
5. Discard both bid cards and all prizes that nobody won (including a tied prize). Keep awarded prize cards in each player's visible captured pile.
6. Each player draws **one new hand card**. Reveal **three new prizes** for the next round. Return target markers to each player. After round 10, do not refill; the game is finished.

### End

After ten rounds, sum the printed ranks of all prizes you've won. Highest score wins; equal scores tie. The 60-card deck is sufficient for two five-card starting hands, all thirty public prizes, and twenty spent bids.

**Example:** Three prizes are Blue 5, Orange 3 and Purple 4. You have a Blue 2 in hand, which bids strength 4 for Blue 5 thanks to the matching-color bonus. You can risk that valuable prize, or use a weaker bid to go for Purple 4, hoping the other player fights for Blue.

**Important:** The prize selection is **secret**. Do not announce the slot or put the bid card under the visible prize before revealing. In a real tabletop game, use face-down numbered markers or write choices privately.

**Physical friction to observe:** Comparing bid strengths, keeping the choice secret, retrieving target markers, and doing score addition.

---

## Design standards and ownership

These are prototypes for **finding** a game, not evidence of a new invention. The simultaneous prize selection in SIGNAL overlaps a known mechanism in the existing game *Go Nuts for Donuts*. Rank-based bidding and color matching differentiate the action, but do not establish originality, IP clearance, or retail distinctiveness. Survey the relevant games and have designers unfamiliar with the prototype evaluate novelty before any product claims.

CLAIM also uses established area-majority/press-your-luck mechanisms. What matters is whether the **interaction of rules** produces an enjoyable, distinctive experience, not whether an individual component is new.

No manufacturing, Kickstarter, publisher pitch, paid marketing or production asset should be authorized from bot simulations alone. See [PLAYTEST.md](PLAYTEST.md).
