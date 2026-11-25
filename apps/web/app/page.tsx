import type { Metadata } from "next";
import Link from "next/link";
import MeasurementPreference from "../components/measurement-preference";
import OfflineControl from "../components/offline-control";
import styles from "./official-home.module.css";
import polish from "./homepage-refinement.module.css";

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
  return <span className={styles.brand}><img src="/stack-media/stack-home-logo-web.webp" alt="STACK" width={220} height={185}/></span>;
}
function Button({href, children, kind = "red"}: {href: string; children: React.ReactNode; kind?: "red"|"cream"|"yellow"}) {
  const cls = styles.button + " " + styles[kind];
  return href.startsWith("/play") ? <Link className={cls} href={href} prefetch={false}>{children}</Link> : <a className={cls} href={href}>{children}</a>;
}
function BenefitIcon({kind}: {kind: "bolt"|"friends"|"repeat"}) {
  return <svg viewBox="0 0 48 48" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" strokeWidth="3.6" strokeLinecap="round" strokeLinejoin="round">
    {kind==="bolt" ? <path d="M27 4 11 27h13l-3 17 17-25H25z" fill="currentColor" strokeWidth="2"/> : kind==="friends" ? <><circle cx="24" cy="14" r="6" fill="currentColor"/><circle cx="10" cy="18" r="4" fill="currentColor"/><circle cx="38" cy="18" r="4" fill="currentColor"/><path d="M13 38v-4a11 11 0 0 1 22 0v4zM4 34v-3a7 7 0 0 1 8-7m32 10v-3a7 7 0 0 0-8-7" fill="currentColor"/></> : <path d="M24 24c-7-13-19-13-19 0s12 13 19 0 19-13 19 0-12 13-19 0Z"/>}
  </svg>;
}
const actions = ["BURN", "DUMP", "GHOST", "RESET"];
export default function HomePage() {
  return <main className={styles.home + " " + polish.refined} data-testid="official-home">
    <a href="#main-content" className={styles.skip}>Skip to content</a>
    <header className={styles.header}><div className={styles.nav}>
      <Link href="/stack" className={styles.homeLink}><Brand/></Link>
      <nav aria-label="Main navigation">
        <Link href="/play" className={styles.navPlay} prefetch={false}>Play online</Link>
        <a href="/pilehead/playtest.html">How to play</a><a href="/pilehead/gallery.html">The deck</a><a href="#physical">The game</a>
      </nav>
    </div></header>
    <section className={styles.hero} id="main-content" aria-labelledby="home-heading" tabIndex={-1}>
      <div className={styles.heroInner}>
        <div className={styles.heroCopy + " " + polish.heroEditorial}>
          <p className={styles.kicker}>The card game with character</p>
          <h1 id="home-heading">STACK<br/><span className={polish.headlineLine}>THE ODDS<span>.</span></span></h1>
          <p className={styles.lead}>A fast, chaotic and delightfully tactical card game for friends, family and friendly revenge.</p>
          <div className={styles.buttons + " " + polish.heroActions}><Button href="/play"><span aria-hidden="true">▶</span> Play free online</Button><Button href="#physical" kind="cream">Discover the deck <span aria-hidden="true">↘</span></Button></div>
          <div className={styles.facts + " " + polish.heroFacts}><span>2–5 players</span><span>54 cards</span><span>Play with friends</span></div>
        </div>
        <div className={styles.heroArt + " " + polish.heroComposition} aria-label="Illustrated STACK cards and deck" role="group">
          <span className={styles.burst} aria-hidden="true"/><span className={polish.sunRays} aria-hidden="true"/><span className={polish.cloudLeft} aria-hidden="true"/><span className={polish.cloudRight} aria-hidden="true"/>
          <Card name="BURN" className={styles.heroBurn}/><Card name="DUMP" className={styles.heroDump}/><Card name="GHOST" className={styles.heroGhost}/><Card name="RESET" className={styles.heroReset}/>
          <img className={styles.explorer} src="/stack-media/stack-home-explorer-web-desktop.webp" srcSet="/stack-media/stack-home-explorer-web-mobile.webp 360w, /stack-media/stack-home-explorer-web-desktop.webp 600w, /stack-media/stack-home-explorer-v2.webp 797w" sizes="(max-width: 600px) 45vw, 310px" alt="" width={797} height={1000} fetchPriority="high"/><Card name="7" className={styles.heroSeven + " " + polish.heroRankSeven}/><Card name="3" className={polish.heroRankThree}/><Card name="2" className={styles.heroTwo + " " + polish.heroRankTwo}/>
          <div className={styles.backStack + " " + polish.heroDeck} aria-hidden="true"/>
          <span className={styles.artCaption}>MAKE YOUR MOVE!</span>
        </div>
      </div>
    </section>
    <section className={styles.benefits + " " + polish.paperEdge} aria-labelledby="why-stack">
      <h2 id="why-stack">Why STACK?</h2><div className={styles.benefitGrid}>
        <article><span aria-hidden="true"><BenefitIcon kind="bolt"/></span><div><h3>Easy to learn</h3><p>Play a card. Change the game.</p></div></article>
        <article><span aria-hidden="true"><BenefitIcon kind="friends"/></span><div><h3>Better together</h3><p>Surprise your friends at every turn.</p></div></article>
        <article><span aria-hidden="true"><BenefitIcon kind="repeat"/></span><div><h3>One more round</h3><p>Every hand brings new decisions.</p></div></article>
      </div>
    </section>
    <section className={styles.deck} id="the-deck"><div className={styles.split}>
      <div><p className={styles.kicker}>10 numbers. 6 action cards.</p><h2>Meet<br/>the cards<span>.</span></h2><p>Numbers keep the game moving. Action cards shake things up.</p><Button href="/pilehead/gallery.html" kind="cream">Explore the full deck →</Button></div>
      <div className={styles.actionFan + " " + polish.actionFan}>{actions.map((name,i)=><Card key={name} name={name} className={styles["fan"+i]}/>)}</div>
    </div></section>
    <section className={styles.online} id="how-to-play"><div className={styles.split + " " + polish.onlineLayout}>
      <div className={styles.gamePreview + " " + polish.gameShowcase}><div className={styles.previewBurst} aria-hidden="true"/><figure className={styles.phone + " " + polish.gameDevice}><picture><source media="(min-width: 851px)" srcSet="/stack-media/stack-home-gameplay-desktop-v2.webp" width={731} height={620}/><source media="(min-width: 601px)" srcSet="/stack-media/stack-home-gameplay-wide-v2.webp" width={507} height={600}/><img src="/stack-media/stack-home-gameplay-v2.webp" alt="Actual STACK browser game with the Illustrated V2 deck, showing cards in hand, draw deck and turn controls" width={321} height={860} loading="lazy" decoding="async"/></picture></figure><div className={styles.previewLabel}>Actual gameplay<br/><small>Illustrated V2 deck</small></div></div>
      <div className={polish.onlineCopy}><p className={styles.kicker}>No download needed</p><h2>Play online.<br/>Anytime, anywhere<span>.</span></h2><p>Try STACK in your browser. Challenge the bots or invite your friends to a private table.</p><div className={styles.buttons}><Button href="/play">Play now →</Button><a className={styles.textLink} href="/pilehead/playtest.html">Learn the rules</a></div></div><img className={polish.beachMascot} src="/stack-media/stack-home-burn-beach.webp" alt="" width={277} height={235} loading="lazy"/>
    </div></section>
    <section className={styles.physical} id="physical"><div className={styles.split + " " + polish.physicalLayout}>
      <div className={styles.productArt} aria-label="STACK card deck illustration" role="group"><div className={styles.productBox + " " + polish.box}><img src="/stack-media/stack-home-box-web.webp" alt="STACK packaging concept, 54 cards for 2–5 players" width={440} height={607} loading="lazy"/><img className={polish.boxSide} src="/stack-media/stack-home-box-side-v2.webp" alt="" width={242} height={1000} loading="lazy"/><img className={polish.boxTop} src="/stack-media/stack-home-box-top-v2.webp" alt="" width={720} height={240} loading="lazy"/></div><div className={styles.productBack}/></div>
      <div><p className={styles.kicker}>From screen to table</p><h2>The physical<br/>game<span>.</span></h2><p>Small box. Big fun. Made for game nights, holidays and spontaneous showdowns. The physical deck is currently in playtesting.</p><Button href="/pilehead/playtest.html" kind="yellow">Explore the playtest edition →</Button><p className={styles.releaseNote}>Physical retail launch to be announced.</p></div><div className={polish.physicalFan} role="group" aria-label="Three illustrated numbered cards">{["2","3","1"].map((name,i)=><Card key={name} name={name} className={polish["physicalCard"+i]}/>)}</div>
    </div></section>
    <section className={styles.closing}><div className={styles.closingArt} aria-hidden="true"><img src="/stack-media/stack-home-sunset.webp" alt="" width={700} height={165} loading="lazy"/></div><div className={styles.closingCopy}><p className={styles.kicker}>Good games. Great company.</p><h2>Bring STACK<br/>to your table<span>.</span></h2><Button href="/play" kind="yellow">One more round? →</Button></div></section>
    <footer className={styles.footer}><Link href="/stack" aria-label="STACK home"><Brand/></Link><nav aria-label="Footer navigation"><Link href="/play" prefetch={false}>Play online</Link><a href="/pilehead/playtest.html">Rules & playtest</a><a href="/pilehead/gallery.html">The deck</a><a href="/pilehead/index.html">Classic game</a><Link href="/decks" prefetch={false}>Digital editions</Link><Link href="/account" prefetch={false}>Your account</Link><Link href="/shop" prefetch={false}>Shop</Link><Link href="/partners" prefetch={false}>For business</Link></nav><small>© STACK</small><div style={{flexBasis:"100%",display:"flex",gap:24,flexWrap:"wrap",justifyContent:"center"}}><MeasurementPreference surface="landing_view" /><OfflineControl /></div></footer>
  </main>;
}
