"use client";

import { useState } from "react";

type SharePayload = { title:string; text:string; url:string };

export default function ResultShare({payload}:{payload:SharePayload}) {
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
      } catch {
        window.prompt("Copy your PILEHEADS result:",text);
      }
    } finally { setBusy(false); }
  }
  return <div>
    <button type="button" className="secondary-button" disabled={busy} onClick={() => void share()}>Share result</button>
    <span role="status" aria-live="polite">{status}</span>
  </div>;
}
