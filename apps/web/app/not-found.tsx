import Link from "next/link";
import SiteHeader from "../components/site-header";
import UniverseIllustration from "../components/universe-illustration";

export default function NotFound(){
  return <div className="launch-public"><SiteHeader/><main className="public-main"><section className="public-hero universe-not-found"><div><p>404 · OFF THE TABLE</p><h1>Wrong turn?</h1><p>That page isn’t on the table anymore. Let’s get you back into the game.</p><Link className="public-cta" href="/">Back home</Link></div><UniverseIllustration name="state-explorer-lost"/></section></main></div>;
}
