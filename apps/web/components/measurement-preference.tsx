"use client";
import { useEffect, useRef, useState } from "react";
import { CONSENT_CHANGE, CONSENT_KEY, measurementAllowed, setMeasurementAllowed, measure } from "../lib/product-measurement";

type Surface = "landing_view" | "catalog_view" | "lobby_view";
export default function MeasurementPreference({ surface }: { surface?: Surface }) {
  const [available, setAvailable] = useState(false);
  const [allowed, setAllowed] = useState(false);
  const [error, setError] = useState(false);
  const counted = useRef(false);
  useEffect(() => {
    let active = true;
    const sync = () => setAllowed(measurementAllowed());
    const onStorage = (e: StorageEvent) => { if (e.key === CONSENT_KEY || e.key === null) sync(); };
    sync();
    window.addEventListener(CONSENT_CHANGE, sync);
    window.addEventListener("storage", onStorage);
    void fetch("/api/product-events", { credentials: "omit", cache: "no-store", referrerPolicy: "no-referrer" })
      .then(r => r.ok ? r.json() : null).then(data => { if (active) setAvailable(data?.enabled === true); }).catch(() => {});
    return () => { active = false; window.removeEventListener(CONSENT_CHANGE, sync); window.removeEventListener("storage", onStorage); };
  }, []);
  useEffect(() => {
    if (available && allowed && surface && !counted.current) {
      counted.current = true; measure({event:surface});
    }
  }, [allowed, available, surface]);
  // Allow revocation even if the server flag is subsequently switched off.
  if (!available && !allowed) return null;
  return <div className="measurement-preference">
    <label><input type="checkbox" checked={allowed} onChange={e => {
      setError(!setMeasurementAllowed(e.target.checked)); setAllowed(measurementAllowed());
    }} /> Share optional game usage statistics</label>
    <small>Counts game activity and deck choices. No player ID, names, cards or room codes. Off by default. You can switch it off here or in game settings.</small>
    {error && <small role="status">Could not save your preference on this device.</small>}
  </div>;
}
