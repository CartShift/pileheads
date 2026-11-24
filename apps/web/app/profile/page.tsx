import Link from "next/link";
import type { Metadata } from "next";
import GuestProfile from "../../components/guest-profile";
export const metadata: Metadata={title:"Your profile | STACK",description:"Manage your optional STACK guest profile."};
export default function ProfilePage(){
  return <main className="deck-catalog">
    <nav className="site-nav"><Link href="/stack" className="logo">STACK<span>.</span></Link><Link href="/play" className="nav-pill">Play now</Link></nav>
    <section className="deck-catalog-intro"><div className="eyebrow">YOUR STACK</div><h1>Make it yours.</h1><p>Playing never requires a profile.</p></section>
    <GuestProfile />
  </main>;
}
