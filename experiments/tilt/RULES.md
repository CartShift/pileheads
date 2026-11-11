# TILT Mechanics Lab, paper-playable rules v0.1

**Two independent competing prototypes. They use the same purpose-designed 48-card test deck, NOT a standard 52-card pack. They are not a retail product.**

## Physical deck

48 unique cards, each printed with **CREST ↑ (1–8)** and **SHADE ↓ (1–8)**. The two values have different mechanical meaning, and neither is a conventional playing-card rank. Every value of CREST occurs exactly six times; every value of SHADE occurs exactly six times. Exactly **12 cards have a visible LINK ↔ symbol**, which matters in CROSS only.

All cards have identical backs. Print [print.html](print.html) on A4 at 100% size and put them in identical opaque sleeves. You don't need a phone to play. A simple scorecard or extra tokens are not required; everyone can count the draw stock and burned pile.

Use both values as printed. If one card shows CREST 7 and SHADE 2, it is **not interchangeable with** a card showing CREST 2 and SHADE 7.

### Common setup

- Two players for the primary test; software engine also supports 3–4, but those table configurations are NOT yet human-tested.
- Shuffle all 48 cards and deal **four private hand cards per player**.
- Place the remaining **40 cards** face down as stock (for two players).
- Select the game, CROSS or FORGE, before dealing. Never play the two rulesets together.
- The winner is the first player with **no cards in hand** after the stock has run out. FORGE adds one condition: your prepared slot must also be empty.
- After any **successful play or preparation**, draw back up to **four cards while stock remains**. You do not draw replacements after a failed pickup/crack. After stock empties, your hand can shrink.
- If your cards don't fit on the table, you may not freely skip your turn: use the mandatory pickup/crack rules.
- The browser has an emergency limit of 320 turns; reaching it is a **draw and a failed pacing test**, not a valid physical-game end condition.

---

## CROSS: two linked dangers

**One sentence:** Put one of your cards on either of two piles, using a different value on each pile, and set up a LINK to force an opponent toward danger.

There are two public piles, initially empty:

1. **SUN ↑:** A new card's **CREST** must be **greater than or equal to** the currently visible top card's **SHADE**.
2. **MOON ↓:** A new card's **SHADE** must be **less than or equal to** the currently visible top card's **CREST**.
3. Either empty pile accepts any card.

On your turn, play **exactly one** card from your hand onto a legal pile. Then refill to four while stock remains.

**LINK ↔:** If your played card has the LINK symbol, the **next player's move is restricted to the other pile** (SUN → MOON, or MOON → SUN). A normal card ends any prior LINK restriction. If a LINK card is the third card and shatters its pile, its LINK effect still applies to the next player.

**Danger / pickup:** If you cannot make any legal play, you must take one complete eligible pile into your hand. If LINK is active, you must take the **forced** pile; otherwise you choose which pile to take. Taking the pile ends your turn, empties the chosen pile, and clears the LINK restriction. You cannot voluntarily take a pile if any legal play exists.

**Shatter:** After a card is played, if that pile now contains **three cards**, all three immediately leave play into a common face-up ashes/discard area. That pile becomes empty. Shattering does not grant a bonus turn. The LINK effect of the last played card still takes effect if present.

**Example:** SUN's top card has SHADE 6. You hold CREST 7 / SHADE 2 with LINK. You play it to SUN because 7 ≥ 6. Now the next player must use MOON; if the MOON top has CREST 2 and none of that player's SHADE numbers are ≤ 2, that player must take MOON. You made them face danger using two independent card values.

**Critical hypothesis:** Are the crosswise comparisons easy to remember after 2 minutes, and do LINK plays feel deliberate? If the comparisons turn into math homework, this concept fails its product goal.

---

## FORGE: prepared escape

**One sentence:** Spend a turn preparing a visible card so you can release it under an easier condition later instead of being trapped by the danger pile.

There is one shared face-up danger pile, initially empty.

On each turn you choose a legal action:

1. **STRIKE from your hand:** Choose a card with **CREST ≥ current top card's SHADE**. An empty pile accepts any card. Place the card on the pile, then refill your hand to four if stock remains.
2. **PREPARE from your hand:** Instead of a strike, move one hand card face up into your **one personal prepared slot**. This spends your entire turn, and you refill your hand to four if stock remains. You cannot prepare another card until your current prepared card is released.
3. **RELEASE your prepared card:** On a later turn, place it onto the pile if its **SHADE ≥ max(1, current top SHADE − 3)**. The card then acts as the new top. Release cannot occur on the same turn as preparation. Even when the pile is empty, your prepared card can be released. This action is public and does not require playing another hand card.
4. **CRACK** (if you cannot STRIKE or RELEASE): Take the **top card** of the pile into your hand, move every other card from that pile to the ashes/discard area, and end your turn. If your prepared slot is empty, you may choose CRACK instead of PREPARE when you cannot strike. No voluntary crack is allowed if a strike or release is legal.

**Automatic crack:** The danger pile also shatters and empties into the ashes whenever it reaches **six cards** after a STRIKE or RELEASE. There is no extra turn. The hand of the player who played does not gain those cards.

The first player to have **neither a hand card nor a prepared card**, after stock runs out, wins. A card in the prepared slot is **not** gone until you release it.

**Example:** The pile's top SHADE is 7, so you need a CREST of 7 or 8 to strike. Earlier you prepared a CREST 2 / SHADE 5 card. You may now RELEASE it because 5 ≥ 7−3=4. You spent one earlier turn creating an escape, and everybody could see the future rescue.

The LINK ↔ icon printed for CROSS has **no effect in FORGE**. If FORGE wins the prototype comparison, the retail deck will be redesigned to support only FORGE's final requirements.

**Critical hypothesis:** Does deliberate advance preparation beat immediate play, or is the best move simply to prepare whenever possible? When does the visible prepared card create actual tension rather than busywork?

---

## Design decisions already tested

- Original versions with unlimited pile growth stalled in hundreds of turns. That's not acceptable.
- CROSS now shatters at three cards to reduce very long pickup loops. This also reduces the size of dramatic pickups: it must be examined in a real table session.
- FORGE uses a weaker release condition (top SHADE minus three) and a one-card crack penalty; without these controls, two-player matches frequently stalled. Making release completely unconditional removed nearly all danger and was rejected.
- The paired-value deck and the precise ratios are **experimental**, not final art, quantities, names or package specification.
- The reference Shithead house rules (2 reset, 3 transparent, 7 next card below 7, 8 skip, 10 burn plus bonus turn) are **inspiration for emotional beats**, not powers mechanically copied into CROSS/FORGE.

## What this is NOT

- Not a replacement for existing SPARK game or its online rooms.
- Not a claim that two piles or a prepare mechanic are original by themselves.
- Not a game that is demonstrably fun, balanced, manufacturable, IP-cleared or profitable.
- Not a promise of 2–4-player retail balance; we are starting with controlled two-player human tests.

## Rules issues to watch in physical trials

- Whether crosswise comparison arrows are visually understandable.
- Whether players can remember LINK's forced pile after a shatter.
- How many pickups happen in the last third; repeated pickup loops are a kill warning.
- Whether empty piles and prepared slots are clearly visible.
- Whether the end feels like a comeback is still possible.
- Whether card values 1–8 and LINK frequency need changing based on real player decisions.
