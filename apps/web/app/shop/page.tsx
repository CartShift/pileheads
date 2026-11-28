import type {Metadata} from "next";
import Link from "next/link";
import {PublicShell,PublicCard} from "../../components/public-guide";
import DeckWaitlist from "../../components/deck-waitlist";
import catalog from "../../lib/commerce-catalog.json";
import styles from "./shop.module.css";

export const metadata:Metadata={title:"Shop PILEHEADS",description:"Meet the original physical PILEHEADS deck. Follow its progress from playtest to retail release.",alternates:{canonical:"/shop"}};

export default function Shop(){
 const product=catalog[0];
 return <PublicShell current="/shop">
  <section className="public-hero"><p>THE PHYSICAL GAME</p><h1>Bring the pile<br/>to your table.</h1><p>The illustrated card game, beyond the screen. Our original deck is currently in playtesting.</p></section>
  <article className={styles.product}>
   <div className={styles.art} aria-label="Preview of the original card artwork">
    <PublicCard index={-1} label="Official card back" eager/>
    <PublicCard index={2} label="Number three card" eager/>
    <PublicCard index={14} label="Burn action card" eager/>
   </div>
   <div><p className={styles.status}>IN DEVELOPMENT · NOT YET FOR SALE</p><h2>{product.name}</h2><p>{product.description}</p><p>{product.cardCount} cards · Original illustrated edition</p><p>Pricing, shipping and the release date will be announced before orders open. No payment or reservation is required.</p><DeckWaitlist/><Link href="/deck" className="public-cta">Explore the cards</Link><Link href="/play" className="public-cta">Play online</Link></div>
  </article>
 </PublicShell>;
}
