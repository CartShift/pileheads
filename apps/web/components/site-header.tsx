import Link from "next/link";
import CampaignPlayLink from "./campaign-play-link";

export type SiteRoute = "/" | "/play" | "/quick-play" | "/how-to-play" | "/deck" | "/profile";

const links = [
  { href: "/quick-play", label: "Quick Play" },
  { href: "/how-to-play", label: "How to play" },
  { href: "/deck", label: "The deck" },
  { href: "/profile", label: "Profile" },
] as const;

export function BrandLink({current=false,compact=false,offline=false}: {current?:boolean;compact?:boolean;offline?:boolean}) {
  if(offline)return <span className={(compact?"logo ":"")+"stack-site-brand"}><img src="/stack-media/stack-home-logo-web.webp" alt="PILEHEADS" width={640} height={356}/></span>;
  return <Link href="/" prefetch={false} className={(compact?"logo ":"")+"stack-site-brand"} aria-label="PILEHEADS home" aria-current={current?"page":undefined}>
    <img src="/stack-media/stack-home-logo-web.webp" alt="PILEHEADS" width={640} height={356}/>
  </Link>;
}

/** Shared public/lobby navigation. Active rounds retain their compact game header. */
export default function SiteHeader({current,offline=false}: {current?: SiteRoute;offline?:boolean}) {
  return (
    <header className="pileheads-masthead">
      <nav className="stack-site-nav" aria-label="Main navigation">
        <BrandLink current={current==="/"} offline={offline}/>
        {offline?<span>Offline table</span>:<div className="stack-site-links">
          <CampaignPlayLink href="/play" className="stack-nav-primary" current={current==="/play"}>Play online</CampaignPlayLink>
          {links.map(({href,label})=><Link key={href} href={href} prefetch={false} aria-current={current===href?"page":undefined}>{label}</Link>)}
        </div>}
      </nav>
    </header>
  );
}
