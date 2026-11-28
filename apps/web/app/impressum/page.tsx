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
   <p>Kontakt für Fragen zum Spiel, rechtliche Anliegen und Datenschutz: über die oben genannte E-Mail-Adresse oder postalisch.</p>
   <p><strong>Vor Veröffentlichung:</strong> prüfen, ob weitere gesetzlich erforderliche Angaben, Kennnummern oder eine zusätzliche unmittelbare Kontaktmöglichkeit erforderlich sind.</p>
   <p><Link href="/privacy">Datenschutz / Privacy notice</Link> · <Link href="/terms">Terms of use</Link></p>
  </article>
 </main>;
}
