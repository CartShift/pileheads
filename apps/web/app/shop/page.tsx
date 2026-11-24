import Link from "next/link";
import ShopPanel from "../../components/shop-panel";
export default function ShopPage(){return <main className="deck-catalog"><nav className="site-nav"><Link className="logo" href="/stack">STACK<span>.</span></Link><Link className="nav-pill" href="/play">Play now</Link></nav><section className="deck-catalog-intro"><div className="eyebrow">PHYSICAL & DIGITAL</div><h1>Play it your way.</h1></section><ShopPanel/></main>;}
