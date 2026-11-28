"use client";
import { createContext, useContext, useEffect, useRef, useState } from "react";

type InstallPrompt = Event & {
  prompt: () => Promise<unknown>;
  userChoice: Promise<{outcome:"accepted"|"dismissed"}>;
};
const enabled = process.env.NEXT_PUBLIC_PILEHEADS_PWA === "1";
type State = {ready:boolean; installed:boolean; available:boolean; ios:boolean; busy:boolean; requestInstall:()=>Promise<boolean>};
const InstallContext = createContext<State>({ready:false,installed:false,available:false,ios:false,busy:false,requestInstall:async()=>false});

/** Root-lifetime listener: preserve the single-use browser prompt across route changes.
 * The flagged worker is network-only, not an opt-in offline download.
 */
export function PwaProvider({children}:{children:React.ReactNode}) {
  const prompt = useRef<InstallPrompt | null>(null);
  const inFlight = useRef(false);
  const [available,setAvailable] = useState(false);
  const [installed,setInstalled] = useState(false);
  const [ready,setReady] = useState(false);
  const [ios,setIos] = useState(false);
  const [busy,setBusy] = useState(false);
  useEffect(() => {
    if (!enabled) return;
    const mode = window.matchMedia("(display-mode: standalone)");
    const nav = navigator as Navigator & {standalone?:boolean};
    const detect = () => setInstalled(mode.matches || nav.standalone === true);
    const onPrompt = (event: Event) => {
      event.preventDefault();
      prompt.current = event as InstallPrompt;
      setAvailable(true);
    };
    const onInstalled = () => {prompt.current = null;setAvailable(false);setInstalled(true);};
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    mode.addEventListener("change", detect);
    detect();
    setIos(/iPad|iPhone|iPod/.test(nav.userAgent) || (nav.platform === "MacIntel" && nav.maxTouchPoints > 1));
    setReady(true);
    // Register before the browser evaluates installability, never from a game
    // action. The flag is off by default. No cache, push permission or reload.
    if ("serviceWorker" in nav && window.isSecureContext &&
        ["/","/play","/play/"].includes(location.pathname) && !location.search) {
      void nav.serviceWorker.register("/pwa-sw.js",{scope:"/",updateViaCache:"none"}).catch(() => {});
    }
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
      mode.removeEventListener("change", detect);
    };
  }, []);
  const requestInstall = async () => {
    const event=prompt.current;
    if (!event || inFlight.current) return false;
    inFlight.current=true;
    setBusy(true);
    prompt.current=null;
    setAvailable(false);
    try {
      await event.prompt();
      return (await event.userChoice).outcome === "accepted";
    } catch {return false;}
    finally {inFlight.current=false;setBusy(false);}
  };
  return <InstallContext.Provider value={{ready,installed,available,ios,busy,requestInstall}}>{children}</InstallContext.Provider>;
}

export default function PwaInstall() {
  const {ready,installed,available,ios,busy,requestInstall}=useContext(InstallContext);
  const [guide,setGuide]=useState(false);
  if (!enabled || !ready || installed) return null;
  const install=async()=>{
    if(available){setGuide(!(await requestInstall()));}
    else setGuide(value=>!value);
  };
  return <section className="pwa-install" aria-label="Install PILEHEADS">
    <button type="button" className="secondary-button" disabled={busy} onClick={install}
      aria-expanded={guide} aria-controls="pwa-install-help">{available ? "Install PILEHEADS" : "Add to home screen"}</button>
    <div id="pwa-install-help" hidden={!guide}>
      <p>{ios ? "On iPhone or iPad, open in Safari, tap Share, then Add to Home Screen." :
        "Open your browser menu and look for Install app or Add to Home Screen. If unavailable, keep playing in your browser."}</p>
      <p>No account or download required to play in the browser. Internet is required to open the game.</p>
    </div>
  </section>;
}
