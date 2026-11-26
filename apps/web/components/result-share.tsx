"use client";

import { useState } from "react";
import {downloadResultCard,type ResultCardData} from "../lib/result-card";

type SharePayload = { title:string; text:string; url:string };

export default function ResultShare({payload,onShared,card}:{payload:SharePayload;onShared?:()=>void;card?:ResultCardData|null}) {
  const [status,setStatus] = useState("");
  const [busy,setBusy] = useState(false);
  async function share() {
    if (busy) return;
    setBusy(true);
    setStatus("");
    try {
      if (typeof navigator.share === "function") {
        try {
          await navigator.share(payload);
          onShared?.();
          return;
        } catch (error) {
          if (error instanceof Error && error.name === "AbortError") return;
          // Unsupported or unavailable native sharing: use explicit copy.
        }
      }
      const text = payload.text + "\n" + payload.url;
      try {
        if (!navigator.clipboard?.writeText) throw new Error("clipboard_unsupported");
        await navigator.clipboard.writeText(text);
        setStatus("Result copied.");
        onShared?.();
      } catch {
        window.prompt("Copy your PILEHEADS result:",text);
      }
    } finally { setBusy(false); }
  }
  async function saveCard(){
    if(busy||!card)return;
    setBusy(true);setStatus("");
    try{await downloadResultCard(card);setStatus("Result card ready.");}
    catch{setStatus("Could not create the result card. You can still share the text result.");}
    finally{setBusy(false);}
  }
  return <div style={{display:"flex",gap:6,flexWrap:"wrap",alignItems:"center"}}>
    <button type="button" className="secondary-button" disabled={busy} onClick={() => void share()}>Share result</button>
    {card&&<button type="button" className="secondary-button" disabled={busy} onClick={()=>void saveCard()}>Save result card</button>}
    <span role="status" aria-live="polite">{status}</span>
  </div>;
}
