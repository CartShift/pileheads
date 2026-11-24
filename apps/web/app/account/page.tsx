import Link from "next/link";
import type {Metadata} from "next";
import AccountPanel from "../../components/account-panel";
export const metadata:Metadata={title:"Account | STACK",description:"Manage your STACK account and unlocked extras."};
export default function AccountPage(){return <main className="deck-catalog"><nav className="site-nav"><Link className="logo" href="/stack">STACK<span>.</span></Link><Link className="nav-pill" href="/play">Play now</Link></nav><section className="deck-catalog-intro"><div className="eyebrow">YOUR COLLECTION</div><h1>Make STACK yours.</h1></section><AccountPanel /></main>;}
