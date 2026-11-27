import Link from "next/link";
import type {Metadata} from "next";
import QuickPlayPreview from "../../components/quick-play-preview";
export const metadata:Metadata={title:"Quick Play | PILEHEADS",robots:{index:false,follow:false}};
export default function QuickPlayPage(){return <main className="game-shell stack-lobby">
 <header className="lobby-masthead"><nav className="stack-site-nav" aria-label="Main navigation"><Link href="/" className="stack-site-brand" aria-label="PILEHEADS home"><img src="/stack-media/stack-home-logo-web.webp" alt="PILEHEADS" width={640} height={356}/></Link><div className="stack-site-links"><Link href="/play">Play</Link><Link href="/profile">Profile</Link></div></nav></header>
 <section className="entry launch-entry"><div className="entry-intro"><div className="eyebrow">QUICK PLAY</div><h1>New rivals.<br/><em>Same chaos.</em></h1><p>Find another player and battle over three rounds.</p></div><div className="entry-options"><QuickPlayPreview/></div></section>
 </main>}
