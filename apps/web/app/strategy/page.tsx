import Link from "next/link";
import {routeMetadata} from "../../lib/seo";
import {PublicShell, PublicCard, PlayButton} from "../../components/public-guide";

export const metadata = routeMetadata("/strategy");
export default function Strategy() {
  return <PublicShell current="/strategy">
    <section className="public-hero"><p>THE ART OF THE PILE</p><h1>PILEHEADS<br/>card game strategy.</h1><p>Think about the cards you will need later, not just the ones you can play now. These examples use the current PILEHEADS rules, not a standard deck.</p><PlayButton/></section>
    <h2>Prepare your three face-up cards</h2>
    <div className="public-steps">
      <article><PublicCard index={14} label="BURN action card"/><h3>Keep a way out</h3><p>Before the first move, you may exchange cards in your hand and face-up row. A flexible action such as BURN or RESET in the face-up row can help if you reach that layer under a difficult restriction. You still need to finish hand play first, except for a legal final hand combo.</p></article>
      <article><PublicCard index={9} label="Number 10"/><h3>High cards are useful, not magical</h3><p>A 10 meets any ordinary numeric threshold, but it does not burn the pile by itself. UNDER can still make a 10 illegal. Balance high ranks with actions instead of relying on rank alone.</p></article>
    </div>
    <h2>Play the pile, not just your hand</h2>
    <div className="public-steps">
      <article><PublicCard index={12} label="UNDER action card"/><h3>Change the restriction</h3><p>If the active rank is 9, a 3 cannot follow normally. UNDER changes the next number requirement to 1–4. GHOST and SKIP do not remove that condition; RESET and BURN do.</p></article>
      <article><PublicCard index={15} label="DUMP action card"/><h3>Consider who receives DUMP</h3><p>Choose an active opponent to collect the existing pile. The DUMP card itself is discarded. An opponent already holding DUMP can counter, returning the transferred cards to you and taking the next turn. Consider the risk before targeting a large pile.</p></article>
      <article><PublicCard index={6} label="Number 7"/><h3>Watch matching runs</h3><p>If the top three cards are sevens and you hold the fourth in your active visible layer, you may complete a SLAM, even outside your turn. A special card between the sevens breaks the run. Four copies in your active layer can also SLAM on a nonempty pile.</p></article>
      <article><PublicCard index={4} label="Number 5"/><h3>Use SNAP when it is offered</h3><p>Play a five from your hand and draw another five during that move: the freshly drawn match can SNAP before another action resolves. Old matching hand cards are not eligible. There is no guaranteed waiting window.</p></article>
    </div>
    <h2>When taking the pile makes sense</h2>
    <p>Taking a nonempty pile is an option on your turn, even if a legal card is available. You might recover useful matches or save an action for later, but you also increase the number of cards you must shed and give up your turn. If Final Duel is enabled, once the stock is empty and exactly two active players remain, the top card burns before the rest is collected.</p>
    <h2>Practice the endgame</h2>
    <p>When the stock is empty, look for a complete matching final hand that can be played together with matching face-up cards, up to four total. Otherwise finish your hand before using face-up cards. Blind cards are played one at a time; an illegal reveal sends you back to hand play.</p>
    <p>In a two-player game, SKIP is not used, so plan around the remaining actions. Final Duel is optional and off by default. These are tactical considerations, not guarantees of winning.</p>
    <p>New to the game? Read the <Link href="/how-to-play">complete rules</Link>, see the <Link href="/deck">illustrated deck</Link>, or compare <Link href="/guides/shithead-vs-pileheads">PILEHEADS and traditional Shithead</Link>.</p>
    <PlayButton/>
  </PublicShell>;
}
