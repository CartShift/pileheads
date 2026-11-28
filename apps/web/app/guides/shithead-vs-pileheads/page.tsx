import Link from "next/link";
import {routeMetadata} from "../../../lib/seo";
import {PublicShell, PublicCard, PlayButton} from "../../../components/public-guide";

export const metadata=routeMetadata("/guides/shithead-vs-pileheads");
export default function Comparison() {
  return <PublicShell current="/guides/shithead-vs-pileheads">
    <section className="public-hero"><p>FAMILIAR ROOTS. NEW MOVES.</p><h1>Shithead vs.<br/>PILEHEADS.</h1><p>Know the traditional card game sometimes called Palace or Karma? PILEHEADS is a distinct, illustrated shedding game inspired by that family, not a standard-deck simulator.</p><PlayButton/></section>
    <h2>What the games have in common</h2>
    <p>In widely played Shithead variants, players work through cards in hand, exposed table cards and hidden table cards. Players try to empty their cards; the last player remaining loses. Many versions use an equal-or-higher rule and require a blocked player to pick up the pile. See <a href="https://www.pagat.com/beating/shithead.html">Pagat’s guide to traditional Shithead</a> for rule variations.</p>
    <h2>What changes in PILEHEADS?</h2>
    <div className="public-steps">
      <article><PublicCard index={9} label="PILEHEADS number 10"/><h3>A purpose-built 54-card deck</h3><p>Traditional Shithead commonly uses ordinary playing cards, with special ranks that depend on the house rules. PILEHEADS has four copies of each number from 1 to 10 and 14 action cards. A single 10 is an ordinary number, not a burn card.</p></article>
      <article><PublicCard index={14} label="BURN action card"/><h3>Six named actions</h3><p>RESET removes the restriction, GHOST preserves it, UNDER restricts the next number to 1–4, SKIP skips the next active player (not used in two-player games), BURN clears the pile and DUMP sends the existing pile to a chosen opponent.</p></article>
      <article><PublicCard index={15} label="DUMP action card"/><h3>A chosen opponent can counter</h3><p>DUMP is discarded rather than transferred with the pile. If the recipient already holds DUMP, they can spend it to return the transferred cards and take the next turn.</p></article>
      <article><PublicCard index={6} label="Number 7 card"/><h3>SNAP and SLAM</h3><p>SNAP lets you immediately play a freshly drawn matching number before another move resolves. SLAM lets an active player complete four matching numbers on the pile, or play an eligible complete set of four onto a nonempty pile, to burn it and take the turn.</p></article>
    </div>
    <h2>Can I use a standard playing-card deck?</h2>
    <p>Traditional Shithead can be played with regular cards. PILEHEADS is designed for its own numbered and action cards; it is not an exact replacement for every Palace or Karma rule set. Try the browser game before deciding which version you prefer.</p>
    <h2>Play the original PILEHEADS game</h2>
    <p>Invite friends to a private browser table or try bot opponents. Explore the <Link href="/how-to-play">PILEHEADS rules</Link>, <Link href="/strategy">tactical examples</Link> and <Link href="/deck">54-card deck</Link>. The physical edition is in playtesting.</p>
    <PlayButton/>
  </PublicShell>;
}
