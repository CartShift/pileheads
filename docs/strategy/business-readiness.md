# SPARK physical-game commercial readiness (provisional)

**Stage:** discovery. No verified unit production quote, validated consumer demand, trademark clearance, compliance opinion or final retail rules.

## Component-count and packaging scenarios

| Candidate | Normal colored cards | Why test |
| --- | ---: | --- |
| Compact | 120 | Lower print/bulk; higher chance of stock recycle |
| Mid | 132 | Potential balanced production count |
| Low-interruption | 144 | Fewer reshuffles under independent 4-player simulation |

In a separate independent simulation (350 synthetic 4-player games per stock size), the rate of games **requiring reshuffling** was 32.3% at 108, 11.1% at 120, 3.4% at 132 and 1.1% at 144 (see `data/capacity_focused_350.csv`). Do not assume this remains true with the production engine, different win conditions, or the selected physical refill rule. **The live engine today supports only 2–3 players and has 360 virtual cards.**

Also budget for special markers (4 Wild-use, 4 Swap-use for a maximum 4-player prototype), rules cards, optional scoring tracker, box insert and proofs. If Wild is represented by a placed card, count the actual physical Wild components separately and resolve color indicator clarity.

## Economics: direct-to-consumer illustration only

Model assumptions, EUR/order: German 19% VAT, one unit/order, variable production/landed cost €4, shipping €2.70, payment, pick/pack and reserve based on previous working estimates. No fixed-cost recovery, refunds beyond the included reserve, advertising variance, salary or income tax. These figures are **scenarios**, not supplier bids or financial forecasts.

| Consumer price incl. VAT | Contribution before CAC | Contribution with €5 CAC |
| ---: | ---: | ---: |
| €14.90 | €3.47 | **−€1.53** |
| €16.90 | €5.15 | €0.15 |
| €19.90 | €7.67 | €2.67 |
| €22.90 | €10.19 | €5.19 |

See `data/unit_economics.csv`. The actual 120–144-card edition, markers, packaging and fulfillment will have different costs. Include returns and **VAT applicability to the actual business** before using this for prices.

Potential distribution: own storefront + direct demos initially, small independent game stores if wholesale economics work, and only later mass retail or marketplace. Compare contribution after channel margin, packaging/storage and marketing per **paid order**.

- German game bestseller retail context: https://www.thalia.de/spielwaren/kategorien/spiele-34337/kartenspiele-25194/bestseller
- Illustrative custom-card quote, not SPARK-specific: https://gameprintshop.com/custom-100-card-game-printing/
- Postal rules and size constraints: https://shop.deutschepost.de/informationen-zum-warenversand

## Pre-manufacturing requirements

1. **Physical consistency:** 2–4 players across complete plays, no hidden-deck lookahead, finite stock and explicit exhaustion rule; evaluate card size/visibility and table footprint.
2. **Consumer validation:** unassisted explanation, group replay, game length, meaningful decisions, real preorder/willingness to pay. Report exact denominator.
3. **Trademark & originality:** SPARK is a working title; run EUIPO and DPMA clearance, and inspect similar titles and mechanics. Rule similarity requires differentiation; don't assume copyright protection for abstract mechanics.
4. **Compliance:** determine product age classification, toy status, applicable CE requirements, GPSR, traceability, producer/importer labeling, German packaging registration (LUCID), returns and consumer-rights obligations. Consult qualified legal/compliance support before sale.
5. **Supplier RFQ:** request comparable 120/132/144 printed-card quotes at 100/500/1,000/3,000 units, Mini Euro size, paper stock/finish, boxes, inserts/markers, proofing, delivery cost, turnaround, defect/return rates and applicable tests. Check same assumptions across quotes.
6. **Go/no-go economics:** gross contribution positive for wholesale and DTC at defensible selling prices; reserve ad-spend downside; avoid committing to a print run based only on views or likes.

Research references:
- Playtest design: https://updates.kickstarter.com/how-to-playtest-your-board-game-before-you-launch-on-kickstarter/
- EU toy compliance: https://single-market-economy.ec.europa.eu/sectors/toys/placing-toys-eu-market_en
- German packaging obligations: https://www.verpackungsregister.org/en/registration/find-out-about-registrations
- EU consumer product compliance: https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:52025XC06233

## Launch gates

| Gate | Must be true before proceeding |
| --- | --- |
| Rules | Teach and play from physical cards without app or designer |
| Gameplay | Real people request replay and can cite meaningful choices |
| Differentiation | Competing titles/moves researched, value proposition convincing |
| Operations | Production quote, safety/legal plan, inventory logistics |
| Economics | Measured paid demand and contribution margin under downside CAC |
| Marketing | Repeatable low-cost demo channel and creative that shows gameplay |

Business outcome not yet established. Next business step is not manufacturing: choose a ruleset through human playtests and obtain comparable RFQs.
