import type { Metadata } from "next";
import Link from "next/link";
import SiteHeader from "../../components/site-header";
import styles from "../privacy/privacy.module.css";
import OperatorContact from "../../components/operator-contact";

export const metadata: Metadata = {
  title: "Terms of use | PILEHEADS",
  alternates: { canonical: "/terms" },
  robots: { index: false, follow: true }
};

// Draft only: owner and legal review required before publication.
export default function TermsPage(){
  return <main className="game-shell stack-lobby">
    <SiteHeader/>
    <article className={styles.document} aria-labelledby="terms-title">
      <Link href="/">← Back to PILEHEADS</Link>
      <p className={styles.eyebrow}>PLAY FAIR. HAVE FUN.</p>
      <h1 id="terms-title">Terms of use</h1>
      <p className={styles.draft} role="note">Draft for operator review. Not approved terms.</p>
      <h2>1. About PILEHEADS</h2>
      <p>PILEHEADS is a free browser card game in development. Play locally against bots or invite others to a private table. Creating an account is optional. No physical purchase, subscription or premium benefit is promised by these terms.</p>
      <OperatorContact/>
      <p><strong>Before publication: confirm account eligibility and effective date.</strong> See the <Link href="/impressum">Impressum</Link>.</p>
      <h2>2. Fair play and private rooms</h2>
      <p>Respect other players. Do not harass others, impersonate someone, access another player's account or private room without permission, exploit security defects or interfere with the service. Keep room invitations private when you intend to play privately.</p>
      <h2>3. Accounts and preferences</h2>
      <p>If account features are offered, Google sign-in allows you to keep preferences across devices. Keep access to your Google account and device secure. You can play without signing in and can delete your account through your profile when accounts are enabled.</p>
      <h2>4. Changes and availability</h2>
      <p>The game is under active development. Features may change or be temporarily unavailable. This does not limit mandatory rights or remedies under applicable law. If paid features are introduced, their separate terms and pricing must be presented before purchase.</p>
      <h2>5. Privacy and contact</h2>
      <p>See the <Link href="/privacy">privacy notice</Link> for information about data and account choices. <strong>Before publication: complete the support and complaints process, and review the terms against applicable consumer law.</strong></p>
      <h2>6. Your legal rights</h2>
      <p>Nothing in these draft terms is intended to waive rights that cannot lawfully be waived. <strong>Before publication: obtain appropriate review of contract formation, age eligibility, suspension and liability provisions.</strong></p>
    </article>
  </main>;
}
