import type {Metadata} from "next";
import Link from "next/link";
import SiteHeader from "../../components/site-header";
import OperatorContact from "../../components/operator-contact";
import styles from "../privacy/privacy.module.css";

export const metadata:Metadata={
 title:"Impressum | PILEHEADS",
 alternates:{canonical:"/impressum"},
 robots:{index:false,follow:true}
};
export default function ImpressumPage(){
 return <main className="game-shell stack-lobby">
  <SiteHeader/>
  <article className={styles.document} aria-labelledby="impressum-title" lang="de">
   <Link href="/">← PILEHEADS</Link>
   <p className={styles.eyebrow}>ANBIETERKENNZEICHNUNG</p>
   <h1 id="impressum-title">Impressum</h1>
   <p className={styles.draft} role="note">Entwurf zur Prüfung vor Veröffentlichung.</p>
   <h2>Angaben zum Anbieter</h2>
   <p>PILEHEADS wird von einer natürlichen Person betrieben.</p>
   <OperatorContact/>
   <p><strong>Vor Veröffentlichung:</strong> weitere gesetzlich erforderliche Angaben und eine schnelle unmittelbare Kontaktmöglichkeit prüfen und gegebenenfalls ergänzen.</p>
   <p><Link href="/privacy">Datenschutz / Privacy notice</Link> · <Link href="/terms">Terms of use</Link></p>
  </article>
 </main>;
}
