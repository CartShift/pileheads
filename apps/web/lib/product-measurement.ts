import type { DeckTheme } from "./deck-registry";

export const CONSENT_KEY = "stack-product-measurement-v1";
export const CONSENT_CHANGE = "stack-product-measurement-change";
type Mode = "local" | "online";
export type Measurement =
  | { event: "landing_view" | "catalog_view" | "lobby_view" }
  | { event: "deck_selected"; deck: DeckTheme }
  | { event: "round_started" | "round_completed" | "rematch_requested"; mode: Mode; deck: DeckTheme }
  | { event: "invite_copied"; mode: "online"; deck: DeckTheme };

export function measurementAllowed(): boolean {
  try { return typeof window !== "undefined" && localStorage.getItem(CONSENT_KEY) === "yes"; }
  catch { return false; }
}
export function setMeasurementAllowed(value: boolean): boolean {
  try {
    localStorage.setItem(CONSENT_KEY, value ? "yes" : "no");
    window.dispatchEvent(new Event(CONSENT_CHANGE));
    return measurementAllowed() === value;
  } catch { return false; }
}
export function measure(event: Measurement): void {
  if (!measurementAllowed()) return;
  try {
    // A fresh identifier for this event only. No player, device or room ID.
    const id = crypto.randomUUID();
    void fetch("/api/product-events", {
      method: "POST", credentials: "omit", keepalive: true, referrerPolicy: "no-referrer",
      headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, ...event }),
    }).catch(() => {});
  } catch { /* Measurement must never interrupt a game. */ }
}
