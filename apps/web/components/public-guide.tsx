import Link from "next/link";
import SiteHeader, {type SiteRoute} from "./site-header";
import CampaignPlayLink from "./campaign-play-link";
export const actions=[
 {name:"RESET",description:"Any number can follow."},
 {name:"GHOST",description:"Keep the current number restriction."},
 {name:"UNDER",description:"The next number must be 1–4."},
 {name:"SKIP",description:"Skip the next active player. Not used in two-player games."},
 {name:"BURN",description:"Burn the pile and play again."},
 {name:"DUMP",description:"Give the pile to an active opponent. If they already hold DUMP, they can counter or keep it."}
] as const;
export function PublicCard({index,label,eager=false}:{index:number;label:string;eager?:boolean}){
 const base="/stack-media/cards/"+(index<0?"back":"face-"+index);
 return <img role="img" alt={label} className={"public-card"+(index<0?" public-back":"")} width={140} height={197} src={base+"-140.webp"} srcSet={base+"-140.webp 140w, "+base+"-280.webp 280w"} sizes="140px" loading={eager?"eager":"lazy"} fetchPriority={eager?"high":"auto"} decoding="async"/>;
}
export function PublicShell({children,current}:{children:React.ReactNode;current:SiteRoute}){return <div className="launch-public"><SiteHeader current={current}/><main className="public-main">{children}</main><footer className="public-footer"><Link prefetch={false} href="/">PILEHEADS</Link><Link href="/quick-play">Quick Play</Link><Link prefetch={false} href="/how-to-play">Rules</Link><Link prefetch={false} href="/deck">The deck</Link><Link prefetch={false} href="/strategy">Strategy</Link><Link prefetch={false} href="/guides/shithead-vs-pileheads">Shithead comparison</Link><Link href="/profile">Profile</Link><a href="/pilehead/playtest.html">Playtest kit</a></footer></div>}
export function PlayButton(){return <CampaignPlayLink href="/play" className="public-cta">Play free online →</CampaignPlayLink>}
