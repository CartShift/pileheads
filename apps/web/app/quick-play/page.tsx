import {routeMetadata} from "../../lib/seo";
import SiteHeader from "../../components/site-header";
import QuickPlayPreview from "../../components/quick-play-preview";
export const metadata = routeMetadata("/quick-play");
export default function QuickPlayPage(){return <main className="game-shell stack-lobby">
 <SiteHeader current="/quick-play"/>
 <section className="entry launch-entry"><div className="entry-intro"><div className="eyebrow">QUICK PLAY</div><h1>New rivals.<br/><em>Same chaos.</em></h1><p>Find another player and battle over three rounds.</p></div><div className="entry-options"><QuickPlayPreview/></div></section>
 </main>}
