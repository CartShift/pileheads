"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { DECKS, deckPlayHref, isDeckTheme, type DeckTheme } from "../lib/deck-registry";

type Profile = { kind: "guest"; deck: DeckTheme; expiresAt: string };
type Result = { enabled: boolean; profile: Profile | null };
type Action = { action: "create" | "delete" } | { action: "preferences"; deck: DeckTheme };
async function request(action?: Action): Promise<Result> {
  const result = await fetch("/api/player", {
    method: action ? "POST" : "GET", credentials: "same-origin", cache: "no-store", referrerPolicy: "origin",
    ...(action ? {headers: {"Content-Type": "application/json"}, body: JSON.stringify(action)} : {}),
  });
  if (!result.ok) throw Error("profile_unavailable");
  const data = await result.json();
  if (typeof data.enabled !== "boolean" || (data.profile !== null &&
      (data.profile?.kind !== "guest" || !isDeckTheme(data.profile.deck) || typeof data.profile.expiresAt !== "string")))
    throw Error("invalid_profile");
  return data;
}

export default function GuestProfile() {
  const [data,setData] = useState<Result | null>(null);
  const [busy,setBusy] = useState(false);
  const [error,setError] = useState(false);
  const [confirm,setConfirm] = useState(false);
  const lock = useRef(false);
  async function update(action?: Action) {
    if(lock.current)return;
    lock.current=true;setBusy(true);setError(false);
    try {setData(await request(action));setConfirm(false);}
    catch {setError(true);}
    finally {lock.current=false;setBusy(false);}
  }
  useEffect(() => {void update();}, []);
  const profile=data?.profile;
  return <section className="guest-profile-panel" aria-label="Guest profile">
    {busy && <p role="status">Connecting to your profile…</p>}
    {error && <p role="status">Could not connect. You can still play without a profile. <button className="secondary-button" disabled={busy} onClick={()=>void update()}>Retry</button></p>}
    {data && !data.enabled && <p>Guest profiles are not available yet. You can still play for free.</p>}
    {data?.enabled && !profile && <div>
      <h2>Keep your favorite deck.</h2>
      <p>Create an optional guest profile for this browser. No email, password or account registration.</p>
      <p>Your profile expires after 90 days. Clearing browser cookies can remove access. This is not a recoverable account or a purchase wallet.</p>
      <button className="cta" disabled={busy} onClick={()=>void update({action:"create"})}>Create guest profile</button>
    </div>}
    {profile && <div>
      <div className="eyebrow">GUEST PROFILE</div><h2>Your table, your style.</h2>
      <label>Favorite deck <select value={profile.deck} disabled={busy} onChange={e=>{
        if(isDeckTheme(e.target.value))void update({action:"preferences",deck:e.target.value});
      }}>{DECKS.map(deck=><option value={deck.id} key={deck.id}>{deck.name}</option>)}</select></label>
      <p>Available on this browser until {new Date(profile.expiresAt).toLocaleDateString()}.</p>
      <Link className="cta" href={deckPlayHref(profile.deck)}>Play with my deck</Link>
      {confirm ? <div className="guest-delete-confirm">
        <p>Delete this guest profile and its saved deck preference? Your existing games and local settings are separate.</p>
        <button className="secondary-button" disabled={busy} onClick={()=>void update({action:"delete"})}>Delete profile permanently</button>
        <button className="secondary-button" disabled={busy} onClick={()=>setConfirm(false)}>Cancel</button>
      </div> : <button className="subtle-link guest-delete" disabled={busy} onClick={()=>setConfirm(true)}>Delete guest profile</button>}
    </div>}
    <p><Link href="/account">Recoverable account &amp; collection →</Link></p>
    <p><Link href="/play" className="subtle-link">Continue without a profile →</Link></p>
  </section>;
}
