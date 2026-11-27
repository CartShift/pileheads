import SiteHeader from "../../components/site-header";
import type {Metadata} from "next";
import PlayerProfile from "../../components/player-profile";
import AccountPanel from "../../components/account-panel";
export const metadata:Metadata={title:"Your profile | PILEHEADS",robots:{index:false,follow:true}};
export default function ProfilePage(){
 return <main className="game-shell stack-lobby">
  <SiteHeader current="/profile"/>
  <section className="entry launch-entry"><div className="entry-intro"><div className="eyebrow">PLAYER PROFILE</div><h1>Your table.<br/><em>Your style.</em></h1><p>Playing never requires a profile.</p></div><div className="entry-options"><h2 className="lobby-choice-heading">Your preferences<span>.</span></h2><AccountPanel/><PlayerProfile/></div></section>
 </main>;
}
