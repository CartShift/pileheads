import Link from "next/link";
import CampaignPlayLink from "./campaign-play-link";
export const actions=[
 {name:"RESET",description:"Any number can follow."},
 {name:"GHOST",description:"Keep the current number restriction."},
 {name:"UNDER",description:"The next number must be 1–4."},
 {name:"SKIP",description:"Skip the next active player. Not used in two-player games."},
 {name:"BURN",description:"Burn the pile and play again."},
 {name:"DUMP",description:"Give the pile to an active opponent. If they already hold DUMP, they can counter or keep it."}
] as const;
export function PublicCard({index,label}:{index:number;label:string}){return <span role="img" aria-label={label} className={"public-card"+(index<0?" public-back":"")} style={index<0?undefined:{backgroundPosition:(index%4*100/3)+"% "+(Math.floor(index/4)*100/3)+"%"}}/>}
export function PublicShell({children}:{children:React.ReactNode}){return <div className="launch-public"><header><nav className="stack-site-nav" aria-label="Main navigation"><Link prefetch={false} href="/" className="stack-site-brand" aria-label="PILEHEADS home"><img src="/stack-media/stack-home-logo-web.webp" width={640} height={356} alt="PILEHEADS"/></Link><div className="stack-site-links"><CampaignPlayLink href="/play" className="stack-nav-primary">Play online</CampaignPlayLink><Link prefetch={false} href="/how-to-play">How to play</Link><Link prefetch={false} href="/deck">The deck</Link></div></nav></header><main className="public-main">{children}</main><footer className="public-footer"><Link prefetch={false} href="/">PILEHEADS</Link><Link prefetch={false} href="/how-to-play">Rules</Link><Link prefetch={false} href="/deck">The deck</Link><a href="/pilehead/playtest.html">Playtest kit</a></footer></div>}
export function PlayButton(){return <CampaignPlayLink href="/play" className="public-cta">Play free online →</CampaignPlayLink>}
