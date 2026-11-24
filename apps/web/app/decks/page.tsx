import Link from "next/link";
import type { Metadata } from "next";
import { DECKS, deckPlayHref } from "../../lib/deck-registry";

export const metadata: Metadata = {
  title: "Decks | STACK",
  description: "Explore the official STACK deck collection. Choose an art style and play for free.",
};

export default function DeckCatalogPage() {
  return <main className="deck-catalog">
    <nav className="site-nav"><Link href="/stack" className="logo">STACK<span>.</span></Link><Link href="/play" className="nav-pill">Play now</Link></nav>
    <section className="deck-catalog-intro">
      <div className="eyebrow">ONE GAME · YOUR STYLE</div>
      <h1>Pick your deck.</h1>
      <p>Different artwork. Same game. Every edition below is free to play.</p>
    </section>
    <section className="deck-catalog-grid" aria-label="Official decks">
      {DECKS.map(deck => <article className="deck-edition" key={deck.id}>
        <div className="deck-edition-art" aria-hidden="true">
          {[0, 5, 12].map(index => <div className="deck-edition-card" key={index} style={{backgroundImage: 'url("' + deck.artwork + '")', backgroundPosition: ((index % 4) * 100 / 3) + "% " + (Math.floor(index / 4) * 100 / 3) + "%"}} />)}
        </div>
        <div className="deck-edition-body">
          <div className="eyebrow">FREE EDITION</div><h2>{deck.name}</h2><p>{deck.description}</p>
          <Link className="cta" href={deckPlayHref(deck.id)}>Play with {deck.name} <span aria-hidden="true">→</span></Link>
        </div>
      </article>)}
    </section>
    <footer className="deck-catalog-footer"><Link href="/stack">Back to STACK</Link></footer>
  </main>;
}
