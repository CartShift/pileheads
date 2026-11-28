"use client";
import { useEffect, useRef, useState } from "react";

type InstallPrompt = Event & {
  prompt: () => Promise<unknown>;
  userChoice: Promise<{outcome:"accepted"|"dismissed"}>;
};
const enabled = process.env.NEXT_PUBLIC_PILEHEADS_PWA === "1";

export default function PwaInstall() {
  const prompt = useRef<InstallPrompt | null>(null);
  const [available,setAvailable] = useState(false);
  const [installed,setInstalled] = useState(false);
  const [ready,setReady] = useState(false);
  const [guide,setGuide] = useState(false);
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
    const onInstalled = () => {prompt.current = null;setAvailable(false);setInstalled(true);setGuide(false);};
    detect();
    setIos(/iPad|iPhone|iPod/.test(nav.userAgent) || (nav.platform === "MacIntel" && nav.maxTouchPoints > 1));
    setReady(true);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    mode.addEventListener("change", detect);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
      mode.removeEventListener("change", detect);
    };
  }, []);
  const install = async () => {
    if (busy) return;
    setBusy(true);
    const event = prompt.current;
    try {
      if (event) {
        prompt.current = null;
        setAvailable(false);
        await event.prompt();
        const choice = await event.userChoice;
        setGuide(choice.outcome !== "accepted");
      } else setGuide(value => !value);
    } catch {setGuide(true);}
    finally {
      // Registration is an explicit install interaction, never a gameplay side effect.
      if ("serviceWorker" in navigator && window.isSecureContext) {
        void navigator.serviceWorker.register("/pwa-sw.js",{scope:"/",updateViaCache:"none"}).catch(() => {});
      }
      setBusy(false);
    }
  };
  if (!enabled || !ready || installed) return null;
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
