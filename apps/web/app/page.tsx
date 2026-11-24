import Link from "next/link";
import MeasurementPreference from "../components/measurement-preference";

export default function HomePage() {
  return (
    <main className="landing">
      <div className="landing-glow" aria-hidden="true" />
      <nav className="site-nav"><Link href="/stack" className="logo">STACK<span>.</span></Link>
        <Link className="nav-pill" href="/play">Play now</Link></nav>
      <section className="hero">
        <div className="eyebrow">54 CARDS · 2–5 PLAYERS · ONE PILE</div>
        <h1>Play your cards.<br /><em>Not your friends.</em></h1>
        <p>Make bold moves, burn the pile, and be the first to escape. Play STACK with bots or invite your friends to the table.</p>
        <div className="hero-buttons"><Link className="cta" href="/play">Enter the table <span aria-hidden="true">→</span></Link>
          <Link className="subtle-link" href="/decks">Explore decks →</Link>
          <Link className="subtle-link" href="/account">Your account →</Link>
          <Link className="subtle-link" href="/shop">Physical game →</Link>
          <Link className="subtle-link" href="/partners">For business →</Link>
          <a className="subtle-link" href="/pilehead/index.html">Original Classic ↗</a></div>
        <div className="hero-cards" aria-hidden="true">
          <div className="hero-card hero-card-a" /><div className="hero-card hero-card-b" /><div className="hero-card hero-card-c" />
        </div>
      </section>
      <footer>STACK · The tabletop is yours <MeasurementPreference surface="landing_view" /></footer>
    </main>
  );
}
