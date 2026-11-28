import type { Metadata } from "next";
import Link from "next/link";
import SiteHeader from "../../components/site-header";
import styles from "./privacy.module.css";

export const metadata: Metadata = {
  title: "Privacy notice | PILEHEADS",
  alternates: { canonical: "/privacy" },
  robots: { index: false, follow: true }
};

// RELEASE BLOCKER: replace draft controller and review fields with verified
// public details and reviewed text before merging or enabling accounts.
export default function PrivacyPage() {
  return <main className="game-shell stack-lobby">
    <SiteHeader />
    <article className={styles.document} aria-labelledby="privacy-title">
      <Link href="/">← Back to PILEHEADS</Link>
      <p className={styles.eyebrow}>YOUR DATA. YOUR CHOICE.</p>
      <h1 id="privacy-title">Privacy notice</h1>
      <p className={styles.draft} role="note">Draft for operator review. Not a published or approved privacy notice. Account registration must remain disabled until review is complete.</p>
      <p>You can play PILEHEADS without creating an account. This notice explains the data involved in the website, online games, and optional player features.</p>
      <h2>1. Who is responsible?</h2>
      <p>PILEHEADS is currently operated by an individual. <strong>Before publication: insert the verified controller name, appropriate contact address and working privacy email.</strong></p>
      <h2>2. Playing without an account</h2>
      <p>Local play uses browser storage for game state and preferences. Online private tables require room and seat identifiers, player nicknames, game state and actions, and credentials that allow you to reconnect. Other players at your table can see your nickname and the game information available to them under the rules. Avoid using your real name in a nickname or sharing an invitation publicly if you want a private game.</p>
      <h2>3. Optional Google sign-in</h2>
      <p>If account registration is enabled and you choose to sign in, you are redirected to Google. PILEHEADS requests OpenID Connect identity and email information to verify your identity and that your email is verified. It receives and validates an identity token and uses Google's stable account identifier to create or locate your PILEHEADS account.</p>
      <p>The account database stores an internal account ID, Google account identifier, nickname, preferences and account/session records. The account system does not store your Google email address or Google access or refresh tokens, and does not request access to Gmail, Drive or contacts. Google processes information according to its own <a href="https://policies.google.com/privacy">privacy policy</a>.</p>
      <h2>4. Cookies and device storage</h2>
      <p>Sign-in uses a short-lived secure cookie (up to 10 minutes) to protect the authentication flow. Account session cookies expire after 30 days; optional guest profile cookies expire after 90 days. Session tokens are stored as hashes on the server. Your browser also stores local game preferences and saves, and may store public game assets if you choose to download offline play. Clearing browser data removes local information, but does not itself delete a server-side account.</p>
      <h2>5. Optional features</h2>
      <p>Guest profiles, personal round history, progression, matchmaking, voluntary playtest reports, measurement and deck-update emails are separate features. Their availability depends on release settings. If offered, personal round history is linked only to your own account and opted-in round; optional session measurement requires an affirmative choice and can be stopped. A deck-update waitlist, if offered, uses email confirmation and an unsubscribe mechanism. You can play without signing up for these optional measurement or email features.</p>
      <h2>6. Hosting and service providers</h2>
      <p>Vercel hosts the website and application endpoints; Neon provides database services; Google provides sign-in. These services may process technical request information such as IP addresses and browser details in delivering and securing their services. If deck-update email delivery is activated, the relevant email provider must also be disclosed.</p>
      <p><strong>Before publication: verify processor arrangements, hosting-log retention, recipients, international transfers and safeguards for the actual production configuration.</strong></p>
      <h2>7. Why information is processed</h2>
      <p><strong>Proposed bases, subject to operator review:</strong> providing a requested game or account service where contract necessity applies; protecting the service and preventing abuse where a documented legitimate interest applies; consent for genuinely optional measurement and deck-update emails; compliance with applicable legal obligations where required. Consent can be withdrawn for processing based on consent, without affecting prior lawful processing.</p>
      <h2>8. How long data is kept</h2>
      <p>Account sessions expire after 30 days; guest profiles expire after 90 days. Persistent accounts are not automatically deleted by the existing cleanup tool. When personal round history is enabled, linked records are subject to the 90-day receipt expiry. Expired records are excluded from relevant reads; expiry does not guarantee immediate physical deletion. Account deletion removes the account and linked sessions and personal history from the active account database; local saves and separate guest profiles are not the same account.</p>
      <p><strong>Before publication: confirm room and provider-log retention, backup retention, actual cleanup cadence and any exceptions required by law.</strong></p>
      <h2>9. Your choices and rights</h2>
      <p>When account features are enabled, you can change your nickname, sign out, or delete your account in <Link href="/profile">your profile</Link>. Under applicable data protection law you may have rights of access, correction, erasure, restriction, portability, objection, withdrawal of consent and complaint to a supervisory authority.</p>
      <p><strong>Before publication: confirm processing purposes and lawful bases, rights-request contact and handling, applicable supervisory authority, and account eligibility for younger players.</strong></p>
      <h2>10. Changes</h2>
      <p>This notice must be updated when processing practices change. <strong>Publication date and approved version: pending review.</strong></p>
      <p><Link href="/terms">Terms of use</Link></p>
    </article>
  </main>;
}
