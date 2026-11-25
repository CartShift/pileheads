import type { Metadata } from "next";
import Link from "next/link";
import styles from "./official-home.module.css";

export const metadata: Metadata = {
  title: "STACK | Play with character",
  description: "A social card game for 2–5 players. Make clever moves, surprise your friends and play STACK free online."
};

const faces = ["1","2","3","4","5","6","7","8","9","10","RESET","GHOST","UNDER","SKIP","BURN","DUMP"];
function Card({name, className = ""}: {name: string; className?: string}) {
  const index = faces.indexOf(name);
  return <span role="img" aria-label={name.length > 2 ? name + " action card" : "Number " + name + " card"} className={styles.card + " " + className} style={{backgroundPosition: (index % 4 * 100 / 3) + "% " + (Math.floor(index / 4) * 100 / 3) + "%"}} />;
}
function Brand() {
  return <span className={styles.brand} aria-label="STACK"><span aria-hidden="true" className={styles.brandCards}><i/><i/><i/></span><span className={styles.brandWord}>STACK</span></span>;
}
function Button({href, children, kind = "red"}: {href: string; children: React.ReactNode; kind?: "red"|"cream"|"yellow"}) {
  const cls = styles.button + " " + styles[kind];
  return href.startsWith("/play") ? <Link className={cls} href={href}>{children}</Link> : <a className={cls} href={href}>{children}</a>;
}
const actions = ["BURN", "DUMP", "GHOST", "RESET"];
export default function HomePage() {
  return <main className={styles.home}>
    <a href="#main-content" className={styles.skip}>Skip to content</a>
    <header className={styles.header}><div className={styles.nav}>
      <Link href="/stack" className={styles.homeLink}><Brand/></Link>
      <nav aria-label="Main navigation">
        <Link href="/play" className={styles.navPlay}>Play online</Link>
        <a href="#how-to-play">How to play</a><a href="#the-deck">The deck</a><a href="#physical">The game</a>
      </nav>
    </div></header>
    <section className={styles.hero} id="main-content">
      <div className={styles.heroInner}>
        <div className={styles.heroCopy}>
          <p className={styles.kicker}>The card game with character</p>
          <h1>STACK<br/>THE ODDS<span>.</span></h1>
          <p className={styles.lead}>A fast, chaotic and delightfully tactical card game for friends, family and friendly revenge.</p>
          <div className={styles.buttons}><Button href="/play"><span aria-hidden="true">▶</span> Play free online</Button><Button href="#physical" kind="cream">Get the deck <span aria-hidden="true">↘</span></Button></div>
          <div className={styles.facts}><span>2–5 players</span><span>54 cards</span><span>Play with friends</span></div>
        </div>
        <div className={styles.heroArt} aria-label="Illustrated STACK cards and deck" role="group">
          <span className={styles.burst} aria-hidden="true"/>
          <Card name="BURN" className={styles.heroBurn}/><Card name="DUMP" className={styles.heroDump}/><Card name="GHOST" className={styles.heroGhost}/><Card name="RESET" className={styles.heroReset}/>
          <Card name="1" className={styles.heroOne}/><Card name="2" className={styles.heroTwo}/><Card name="7" className={styles.heroSeven}/>
          <div className={styles.backStack} aria-hidden="true"/>
          <span className={styles.artCaption}>MAKE YOUR MOVE!</span>
        </div>
      </div>
    </section>
    <section className={styles.benefits} aria-labelledby="why-stack">
      <h2 id="why-stack">Why STACK?</h2><div className={styles.benefitGrid}>
        <article><span aria-hidden="true">ϟ</span><div><h3>Easy to learn</h3><p>Play a card. Change the game.</p></div></article>
        <article><span aria-hidden="true">✦</span><div><h3>Better together</h3><p>Surprise your friends at every turn.</p></div></article>
        <article><span aria-hidden="true">∞</span><div><h3>One more round</h3><p>Every hand brings new decisions.</p></div></article>
      </div>
    </section>
    <section className={styles.deck} id="the-deck"><div className={styles.split}>
      <div><p className={styles.kicker}>16 personalities. One pile.</p><h2>Meet<br/>the cards<span>.</span></h2><p>Numbers keep the game moving. Action cards shake things up.</p><Button href="/pilehead/gallery.html" kind="cream">Explore the full deck →</Button></div>
      <div className={styles.actionFan}>{actions.map((name,i)=><Card key={name} name={name} className={styles["fan"+i]}/>)}</div>
    </div></section>
    <section className={styles.online} id="how-to-play"><div className={styles.split}>
      <div className={styles.device} role="img" aria-label="Illustrative STACK tabletop preview with a pile and three cards">
        <div className={styles.deviceHeader}><strong>STACK</strong><span>YOUR TURN</span></div><div className={styles.table}><span className={styles.seat}>Opponent</span><div className={styles.tablePile}><span className={styles.tableBack}/><Card name="7"/></div><div className={styles.hand}>{["2","3","9"].map(n=><Card key={n} name={n}/>)}</div></div>
      </div>
      <div><p className={styles.kicker}>No download needed</p><h2>Play online.<br/>Anytime, anywhere<span>.</span></h2><p>Try STACK in your browser. Challenge the bots or invite your friends to a private table.</p><div className={styles.buttons}><Button href="/play">Play now →</Button><a className={styles.textLink} href="/pilehead/playtest.html">Learn the rules</a></div></div>
    </div></section>
    <section className={styles.physical} id="physical"><div className={styles.split}>
      <div className={styles.productArt} aria-label="STACK card deck illustration" role="group"><div className={styles.productBox}><Brand/><span>THE CARD GAME</span><Card name="1"/><span>54 CARDS · 2–5 PLAYERS</span></div><div className={styles.productBack}/><Card name="3" className={styles.productFace}/></div>
      <div><p className={styles.kicker}>From screen to table</p><h2>Small box.<br/>Big fun<span>.</span></h2><p>Made for game nights, holidays and spontaneous showdowns. The physical deck is currently in playtesting.</p><Button href="/pilehead/playtest.html" kind="yellow">Explore the playtest edition →</Button><p className={styles.releaseNote}>Physical retail launch to be announced.</p></div>
    </div></section>
    <section className={styles.closing}><p className={styles.kicker}>Good games. Great company.</p><h2>Bring STACK<br/>to your table<span>.</span></h2><Button href="/play" kind="yellow">One more round? →</Button></section>
    <footer className={styles.footer}><Link href="/stack" aria-label="STACK home"><Brand/></Link><nav aria-label="Footer navigation"><Link href="/play">Play online</Link><a href="/pilehead/playtest.html">Rules & playtest</a><a href="/pilehead/gallery.html">The deck</a><a href="/pilehead/index.html">Classic game</a></nav><small>© STACK</small></footer>
  </main>;
}
