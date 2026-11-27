import Link from "next/link";
import type {Metadata} from "next";
import PlayerProfile from "../../components/player-profile";
import AccountPanel from "../../components/account-panel";
export const metadata:Metadata={title:"Your profile | PILEHEADS",robots:{index:false,follow:true}};
export default function ProfilePage(){
 return <main className="game-shell stack-lobby">
  <header className="lobby-masthead"><nav className="stack-site-nav" aria-label="Main navigation"><Link href="/" className="stack-site-brand" aria-label="PILEHEADS home"><img src="/stack-media/stack-home-logo-web.webp" alt="PILEHEADS" width={640} height={356}/></Link><div className="stack-site-links"><Link href="/">Home</Link><Link href="/play">Play online</Link></div></nav></header>
  <section className="entry launch-entry"><div className="entry-intro"><div className="eyebrow">PLAYER PROFILE</div><h1>Your table.<br/><em>Your style.</em></h1><p>Playing never requires a profile.</p></div><div className="entry-options"><AccountPanel/><PlayerProfile/></div></section>
 </main>;
}
