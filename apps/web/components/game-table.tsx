"use client";

import Link from "next/link";
import SiteHeader, {BrandLink} from "./site-header";
import PwaInstall from "./pwa-install";
import OfflineControl, {offlineEnabled} from "./offline-control";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { ACTIONS, ACTION_DESCRIPTIONS, cardLabel, PlayingCard, type DeckTheme } from "./card-view";
import OpponentsStrip from "./opponents-strip";
import CenterBoard from "./center-board";
import PlayerHandArea, { type HandSort } from "./player-hand-area";
import ActionDock from "./action-dock";
import TableStandings from "./table-standings";
import RoundHistoryConsent from "./round-history-consent";
import PublicDeadline from "./public-deadline";
import ResultShare from "./result-share";
import UniverseIllustration from "./universe-illustration";
import {resultCardData} from "../lib/result-card";
const ResultShareCore = require("../lib/result-share-core.cjs") as { resultShare: (input: { phase:string; kind:string; players:number; drill:boolean }) => {title:string;text:string;url:string} | null };
import { useGameFeedback } from "../lib/use-game-feedback";
import FeedbackSettings from "./feedback-settings";
import PlaytestInsights from "./playtest-insights";
import { usePlaytestInsights } from "../lib/use-playtest-insights";
import {FunnelConsent,useFunnel} from "./funnel-provider";
import {useRoundFunnel} from "../lib/use-round-funnel";
import MoveTheater, { type MotionLevel } from "./move-theater";
import { useCommittedCardTravel } from "../lib/use-committed-card-travel";
import { useRoundChoreography } from "../lib/use-round-choreography";
import { Engine, type Card, type Event, type Game, type Move } from "../lib/engine";
import { backendOrigin, requestRoom, roomMove, sessionKey, type Room, type RoomGame, type Reaction } from "../lib/room";

const LocalTable = require("../lib/local-table-core.cjs") as {
  localBotOpportunity:(engine:typeof Engine,game:Game)=>{seat:number;kind:"dump"|"snap"|"slam"|"turn";ids:string}|null;
  asLocalRoom:(engine:typeof Engine,game:Game)=>RoomGame;
};
const RoomReconciliation = require("../lib/room-reconciliation.cjs") as {
  disposition:(previous:Room|null,next:Room)=>"apply"|"stale"|"identical";
  selectionBoundary:(previous:Room|null,next:Room)=>boolean;
  retainSelection:(previous:Room,next:Room,selected:number[])=>number[];
  retainSwap:(previous:Room,next:Room,id:number|null)=>number|null;
};
const HandLayout = require("../lib/hand-layout-core.cjs") as {
  computeHandLayout:(count:number,area:{width:number;cardWidth:number})=>{
    handColumns:number;handRows:number;lastRowShift:number;handLayout:CSSProperties;
  };
};
const Coach = require("../lib/coach-core.cjs") as {
  coachTip: (game: RoomGame, context: {me:number;active:boolean;stage:string;selection:number[];
    canPlay:boolean;needsTarget:boolean;selectedAction?:string}) => {id:string;text:string}|null;
  roundOutcome: (game: RoomGame, me:number) => {kind:string;title:string;description:string}|null;
};
type DrillId = "snap" | "slam" | "counter";
const Drills = require("../lib/practice-drills.cjs") as {
  DRILLS: {id:DrillId;label:string;description:string}[];
  buildDrill: (engine:typeof Engine,id:DrillId)=>Game;
};
type Mode = "home" | "local" | "online";
const SAVE_KEY = "stack-next-local-save-v1";
const THEME_KEY = "stack-next-deck-theme-v1";
const PRACTICE_KEY = "stack-next-practice-mode-v1";
const FINAL_DUEL_KEY = "stack-final-duel-default-v1";
type EndgameRule = "classic" | "final-duel";
// Persistence is best-effort: a blocked/quota-limited browser must still play.
function readPreference(key: string): string | null {
  try { return window.localStorage.getItem(key); } catch { return null; }
}
function writePreference(key: string, value: string): boolean {
  try { window.localStorage.setItem(key, value); return true; } catch { return false; }
}
function orderedHand(cards: Card[], mode: HandSort) {
  if (mode === "dealt") return cards;
  const weight = (card: Card) => card.kind === "number" ? card.rank || 0 :
    11 + ACTIONS.indexOf(card.action || "reset");
  return [...cards].sort((a,b) =>
    (mode === "asc" ? 1 : -1) * (weight(a) - weight(b)) || a.id - b.id);
}
function loadSavedGame(): Game | null {
  try {
    const data = JSON.parse(readPreference(SAVE_KEY) || "null");
    if (data?.version !== 1 || data.game?.version !== Engine.VERSION) return null;
    Engine.invariant(data.game);
    if (!["setup", "play", "over"].includes(data.game.phase)) return null;
    return data.game as Game;
  } catch { return null; }
}
const ROOM_ERRORS: Record<string,string> = {
  stale_revision: "Someone moved first. The table is syncing.",
  network_unavailable: "The game server is unreachable. Check your connection and try again.",
  request_timeout: "The game server is taking too long to respond. Refreshing is safe.",
  service_unavailable: "The game service is temporarily unavailable.",
  online_not_configured: "Online play is not configured on the game server.",
  room_expired: "This room expired. Create a new one to play.",
  not_member: "This browser no longer owns a seat in this room.",
  room_not_found: "We couldn't find that room.",
  room_rules_changed: "This room uses old rules and can no longer be opened.",
  already_started: "The round has already started.",
  waiting_for_players: "Everyone must join and be ready before starting.",
  tournament_withdrawn:"This tournament has ended because a player withdrew.",
  rate_limited: "Too many attempts. Try again shortly.",
  bad_origin: "This game frontend is not authorized by the multiplayer server."
};
const messageForError = (message: string) =>
  ROOM_ERRORS[message] || message.replaceAll("_", " ");
const humanLabel = (n: number) => n === 0 ? "You" : `Bot ${n}`;
const sameFace = (a?: Card, b?: Card) => !!a && !!b &&
  a.kind === b.kind && (a.kind === "number" ? a.rank === b.rank : a.action === b.action);
const identicalIds = (left: number[], right: number[]) =>
  left.length === right.length && left.every(id => right.includes(id));


function createGame(players: number, endgameRule: EndgameRule,
  starterSeat: number | null = null, practice = false): Game {
  const g = Engine.create({ players, endgameRule, seed: Math.floor(Math.random() * 4294967296) });
  g.starterSeat = starterSeat ?? (practice ? 0 : Math.floor(Math.random() * players));
  g.starterReason = practice ? "practice" : starterSeat === null ? "draw" : "winner";
  for (let seat = 1; seat < players; seat++) Engine.autoSetup(g, seat);
  g.setupReady = Array.from({ length: players }, (_, i) => i !== 0);
  return g;
}


export default function GameTable() {
  const {emit:emitFunnel}=useFunnel();
  const [mode, setMode] = useState<Mode>("home");
  const [offlineNetwork,setOfflineNetwork]=useState(false);
  useEffect(()=>{
    if(!offlineEnabled)return;
    const detect=()=>setOfflineNetwork(!navigator.onLine);
    detect();
    window.addEventListener("online",detect);window.addEventListener("offline",detect);
    return()=>{window.removeEventListener("online",detect);window.removeEventListener("offline",detect);};
  },[]);
  const [local, setLocal] = useState<Game | null>(null);
  const [room, setRoom] = useState<Room | null>(null);
  const [name, setName] = useState("Player");
  const [joinCode, setJoinCode] = useState("");
  const [inviteEntry, setInviteEntry] = useState(false);
  const [players, setPlayers] = useState(4);
  const [onlineHumans, setOnlineHumans] = useState(2);
  const [onlineBots, setOnlineBots] = useState(0);
  const [roundLimit,setRoundLimit]=useState<3|5|10|null>(null);
  const [selection, setSelection] = useState<number[]>([]);
  const [swapHand, setSwapHand] = useState<number | null>(null);
  const [needsTarget, setNeedsTarget] = useState(false);
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [resumeGame, setResumeGame] = useState<Game | null>(null);
  const [deckTheme, setDeckTheme] = useState<DeckTheme>("refined");
  const [handSort, setHandSort] = useState<HandSort>("dealt");
  const handStageRef = useRef<HTMLDivElement | null>(null);
  const [handArea, setHandArea] = useState({ width: 0, cardWidth: 0 });
  const [motionLevel, setMotionLevel] = useState<MotionLevel>("balanced");
  const [endgameRule, setEndgameRule] = useState<EndgameRule>("classic");
  const [pendingRule, setPendingRule] = useState<EndgameRule | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [practiceMode, setPracticeMode] = useState(false);
  const [drill, setDrill] = useState<{id:DrillId;startMove:number}|null>(null);
  const [drillChoice, setDrillChoice] = useState<DrillId>("snap");
  const [coachDismissed, setCoachDismissed] = useState(false);
  const resultTitleRef = useRef<HTMLHeadingElement | null>(null);
  const resultCursor = useRef({key:"",phase:"home"});
  const [showRules, setShowRules] = useState(false);
  const [pileOpen, setPileOpen] = useState(false);
  const [inspectSeat, setInspectSeat] = useState<number | null>(null);
  const inspectCloseRef = useRef<HTMLButtonElement | null>(null);
  useEffect(() => {
    if (inspectSeat === null) return;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    inspectCloseRef.current?.focus();
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setInspectSeat(null);
    };
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("keydown", escape);
      previousFocus?.focus();
    };
  }, [inspectSeat]);
  const [confirmRestart, setConfirmRestart] = useState(false);
  const [undoAvailable, setUndoAvailable] = useState(false);
  const [connected, setConnected] = useState(false);
  const [connectionRetry, setConnectionRetry] = useState(0);
  // Retry generation triggers a new socket; failure count is reset on auth.
  const reconnectAttempts = useRef(0);
  // Heartbeat timestamps are diagnostic only: never rerender all animated
  // cards just because an identical HTTP state was polled.
  const lastSyncAt = useRef(0);
  const [copiedInvite, setCopiedInvite] = useState(false);
  const [nativeShareAvailable,setNativeShareAvailable]=useState(false);
  useEffect(()=>setNativeShareAvailable(typeof navigator.share==="function"),[]);
  const [reactionsOpen, setReactionsOpen] = useState(false);
  const [reactionClock, setReactionClock] = useState(0);
  // Presentation preference is local-only; never part of multiplayer game state.
  useEffect(() => {
    try {
      const value = readPreference("stack-motion-level-v1");
      if (value === "full" || value === "balanced" || value === "reduced")
        setMotionLevel(value);
    } catch {}
  }, []);
  const changeMotionLevel = (next: MotionLevel) => {
    setMotionLevel(next);
    try { localStorage.setItem("stack-motion-level-v1", next); } catch {}
  };
  const motionSetting = <label className="motion-setting">
    <strong>Motion & effects</strong>
    <select aria-label="Motion and effects" value={motionLevel}
      onChange={event => changeMotionLevel(event.target.value as MotionLevel)}>
      <option value="balanced">Balanced (recommended)</option>
      <option value="full">Full effects</option>
      <option value="reduced">Reduced motion</option>
    </select>
    <small>Only confirmed actions produce effects. System reduced-motion preferences always take priority.</small>
  </label>;

  const inFlight = useRef(false);
  const roomRef = useRef<Room | null>(null);
  const tokenRef = useRef<string | null>(null);
  const localRef = useRef<Game | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const undoRef = useRef<Game | null>(null);
  const roomEpoch = useRef(0);
  // One snapshot request per room/session at a time; a new invalidation while
  // fetching queues one trailing refresh rather than racing older responses.
  const syncFlight = useRef<{epoch: number; code: string; token: string;
    queued: {quiet: boolean; heartbeat: boolean} | null} | null>(null);
  const lastHeartbeat = useRef({epoch: -1, at: 0});
  const freshDealKey = useRef<string | null>(null);
  // A successful blind flip animates only on a *new committed move*, never when
  // resuming an old local game or reconnecting to an existing online room.
  const blindMotionCursor = useRef({ key: "", move: 0 });
  const [freshBlindMove, setFreshBlindMove] = useState<number | null>(null);

  const applyRoom = useCallback((next: Room) => {
    const previous = roomRef.current;
    if (RoomReconciliation.disposition(previous,next) !== "apply") return;
    if (previous && RoomReconciliation.selectionBoundary(previous,next)) {
      setSelection(selected => RoomReconciliation.retainSelection(previous,next,selected));
      setSwapHand(id => RoomReconciliation.retainSwap(previous,next,id));
      // A target confirmation is always bound to its displayed revision.
      setNeedsTarget(false);
    }
    if (next.session) {
      tokenRef.current = next.session;
      if (!writePreference(sessionKey(next.code), next.session)) {
        setNotice("This browser cannot save your room session. Keep this tab open to retain your seat.");
      }
    }
    roomRef.current = next;
    setRoom(next);
    lastSyncAt.current = Date.now();
    setMode("online");
    history.replaceState(null, "", `/play?room=${encodeURIComponent(next.code)}`);
  }, []);

  const synchronize = useCallback(async (code: string, token: string, quiet = false, heartbeat = true) => {
    const epoch = roomEpoch.current;
    const active = syncFlight.current;
    if (active && active.epoch === epoch && active.code === code && active.token === token) {
      active.queued = {quiet: (active.queued?.quiet ?? true) && quiet,
        heartbeat: (active.queued?.heartbeat ?? false) || heartbeat};
      return;
    }
    const flight: NonNullable<typeof syncFlight.current> = {epoch, code, token, queued: null};
    syncFlight.current = flight;
    let options: {quiet: boolean; heartbeat: boolean} | null = {quiet, heartbeat};
    try {
      while (options && epoch === roomEpoch.current) {
        const {quiet: silent, heartbeat: wantsHeartbeat} = options;
        flight.queued = null;
        // An invalidation is read-only. Periodic recovery reads refresh
        // presence at most every 8 seconds, comfortably below the 25s TTL.
        const beat = wantsHeartbeat && (!silent || lastHeartbeat.current.epoch !== epoch ||
          Date.now() - lastHeartbeat.current.at >= 8000);
        try {
          const next = await requestRoom({ action: "state", code, heartbeat: beat }, token);
          if (epoch !== roomEpoch.current || (roomRef.current && roomRef.current.code !== code)) return;
          if (beat) lastHeartbeat.current = {epoch, at: Date.now()};
          applyRoom(next);
          lastSyncAt.current = Date.now();
          if (!silent) setNotice("");
        } catch (err) {
          if (epoch !== roomEpoch.current) return;
          if (!silent) setNotice(messageForError(err instanceof Error ? err.message : "network_unavailable"));
        }
        options = flight.queued;
      }
    } finally {
      if (syncFlight.current === flight) syncFlight.current = null;
    }
  }, [applyRoom]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("room")?.trim().toUpperCase();
    const savedName = readPreference("stack-next-display-name");
    if (savedName) setName(savedName);
    const savedTheme = readPreference(THEME_KEY);
    if (savedTheme === "refined" || savedTheme === "characters" || savedTheme === "original") setDeckTheme(savedTheme);
    setResumeGame(loadSavedGame());
    setPracticeMode(readPreference(PRACTICE_KEY) === "true");
    setEndgameRule(readPreference(FINAL_DUEL_KEY) === "final-duel" ? "final-duel" : "classic");
    if (!code || !/^[A-Z0-9]{8}$/.test(code)) return;
    setInviteEntry(true);
    setJoinCode(code);
    const token = readPreference(sessionKey(code));
    if (token) { tokenRef.current = token; void synchronize(code, token); }
  }, [synchronize]);

  const submit = useCallback(async (payload: Record<string, unknown>, noAuth = false) => {
    if (inFlight.current) return;
    inFlight.current = true; setBusy(true); setNotice("");
    const epoch = roomEpoch.current;
    try {
      const next = await requestRoom(payload, noAuth ? null : tokenRef.current);
      if (epoch !== roomEpoch.current) return;
      if (payload.action === "create" && next.game.phase === "setup")
        freshDealKey.current = "online:" + next.code + ":" + next.game.round;
      applyRoom(next);
      // The server re-reads the committed revision; this hint carries no
      // private state or client-asserted revision and is safe on older hubs.
      const live = wsRef.current;
      if (!noAuth && payload.code === next.code && live?.readyState === WebSocket.OPEN) {
        try { live.send(JSON.stringify({type: "sync-hint"})); } catch { /* polling still converges */ }
      }
      if(payload.action==="join")emitFunnel("room_joined");
      // Background bot progress is not a user gesture. applyRoom already
      // reconciles selection against its authoritative snapshot.
      if (payload.action !== "advance") {
        setSelection([]); setSwapHand(null); setNeedsTarget(false);
      }
    } catch (err) {
      if (epoch !== roomEpoch.current) return;
      const message = err instanceof Error ? err.message : "network_unavailable";
      setNotice(messageForError(message));
      // A transport failure can occur AFTER the database committed a move.
      // Keep the command locked during one bounded, read-only reconciliation;
      // never replay an unknown-result mutation, including SNAP or SLAM.
      if ((message === "request_timeout" || message === "network_unavailable") &&
          !noAuth && roomRef.current && tokenRef.current) {
        const code = roomRef.current.code, token = tokenRef.current;
        const controller = new AbortController();
        const recoveryTimer = setTimeout(() => controller.abort(), 4000);
        setNotice("Connection interrupted. Checking the latest table state…");
        try {
          const fresh = await requestRoom({action:"state",code,heartbeat:true},token,controller.signal);
          if (epoch !== roomEpoch.current) return;
          applyRoom(fresh);
          setNotice("Table synchronized. Check the latest state before playing again.");
        } catch {
          if (epoch === roomEpoch.current)
            setNotice("Could not confirm the action. Reconnect or refresh to check the table; the action was not sent again.");
        } finally { clearTimeout(recoveryTimer); }
      } else if (message === "stale_revision" && roomRef.current && tokenRef.current) {
        const code = roomRef.current.code, token = tokenRef.current;
        try {
          const fresh = await requestRoom({ action: "state", code, heartbeat: true }, token);
          if (epoch !== roomEpoch.current) return;
          applyRoom(fresh);
          // Safe repeatable lobby operations must not become a manual race
          // between guests. NEVER silently retry a card move, SNAP or SLAM.
          if (payload.action === "ready" || payload.action === "swap" ||
              payload.action === "settings") {
            const retry = await requestRoom({ ...payload, revision: fresh.revision }, token);
            if (epoch !== roomEpoch.current) return;
            applyRoom(retry);
            setNotice("");
          }
        } catch (retryError) {
          if (epoch !== roomEpoch.current) return;
          setNotice(messageForError(retryError instanceof Error ? retryError.message : "network_unavailable"));
        }
      }
    } finally {
      // A request belonging to a room the player has already left must not
      // clear the in-flight lock for a newer room's request.
      if (epoch === roomEpoch.current) {
        inFlight.current = false;
        setBusy(false);
      }
    }
  }, [applyRoom, synchronize, emitFunnel]);

  // Store only local bot matches. Online secrets/state stay in their existing
  // per-room storage; never persist another player's private cards.
  useEffect(() => {
    if (mode !== "local" || !local || drill) return;
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify({ version: 1, game: local }));
      setResumeGame(local);
    } catch { /* private browsing/quota: current match remains playable */ }
  }, [mode, local, drill]);
  useEffect(() => {
    try { localStorage.setItem(THEME_KEY, deckTheme); } catch {}
  }, [deckTheme]);
  useEffect(() => {
    if (mode !== "local" || !local || drill) return;
    try { localStorage.setItem(PRACTICE_KEY, String(practiceMode)); } catch {}
  }, [mode, local, practiceMode, drill]);

  const applyReaction = useCallback((reaction: Reaction) => {
    const old = roomRef.current;
    if (!old || !Number.isInteger(reaction.seat) ||
        reaction.seat < 0 || reaction.seat >= old.game.players.length) return;
    if (old.game.reactions?.some(event => event.id === reaction.id)) return;
    const next: Room = { ...old, game: { ...old.game,
      reactions: [...(old.game.reactions || []), reaction].slice(-24) } };
    roomRef.current = next;
    setRoom(next);
  }, []);

  async function sendReaction(kind: Reaction["kind"]) {
    if (mode !== "online" || !roomRef.current || !tokenRef.current) return;
    setReactionsOpen(false);
    const socket = wsRef.current;
    if (connected && socket?.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: "react", kind }));
      return;
    }
    try {
      const response = await requestRoom({ action: "react", code: roomRef.current.code, kind },
        tokenRef.current) as unknown as { reaction: Reaction };
      if (response.reaction) applyReaction(response.reaction);
    } catch (error) { setNotice(error instanceof Error ? error.message.replaceAll("_", " ") : "Reaction unavailable"); }
  }

  // One socket per room: a missed 'ready' handshake is treated as offline.
  // Reconnect after a close, then reconcile the authoritative HTTP snapshot.
  useEffect(() => {
    if (mode !== "online" || !room?.code || !tokenRef.current) return;
    const code = room.code, token = tokenRef.current;
    const wsUrl = new URL(`${backendOrigin || window.location.origin}/api/pilehead/live`);
    wsUrl.protocol = wsUrl.protocol === "https:" ? "wss:" : "ws:";
    let cancelled = false;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    let ws: WebSocket;
    try { ws = new WebSocket(wsUrl.toString()); } catch {
      const backoff = Math.min(20000, 1000 * 2 ** Math.min(reconnectAttempts.current++, 5));
      retryTimer = setTimeout(() => setConnectionRetry(n => n + 1), backoff);
      return () => { cancelled = true; if (retryTimer) clearTimeout(retryTimer); };
    }
    wsRef.current = ws;
    ws.onopen = () => ws.send(JSON.stringify({ type: "auth", code, token }));
    ws.onmessage = ev => {
      if (cancelled || wsRef.current !== ws) return;
      try {
        const packet = JSON.parse(ev.data);
        if (packet.type === "ready") {
          reconnectAttempts.current = 0;
          setConnected(true);
          void synchronize(code, token, true, false);
        }
        if (packet.type === "reaction" && packet.reaction) applyReaction(packet.reaction as Reaction);
        if (packet.type === "reaction-error") setNotice("Reactions are limited. Try again soon.");
        if (packet.type === "invalidate" &&
            (packet.force || packet.revision > (roomRef.current?.revision ?? -1))) {
          void synchronize(code, token, true, false);
        }
      } catch { /* transport errors are recovered by polling */ }
    };
    ws.onclose = event => {
      if (cancelled) return;
      setConnected(false);
      // Invalid sessions and origin/policy rejections are not network outages.
      if (event.code === 1008) {
        setNotice("Room session rejected. Rejoin this room or create a new one.");
        return;
      }
      const backoff = Math.min(20000, 1000 * 2 ** Math.min(reconnectAttempts.current++, 5));
      retryTimer = setTimeout(() => setConnectionRetry(n => n + 1),
        backoff + Math.floor(Math.random() * 250));
    };
    ws.onerror = () => { if (!cancelled && wsRef.current === ws) setConnected(false); };
    return () => {
      cancelled = true;
      if (retryTimer) clearTimeout(retryTimer);
      ws.close();
      if (wsRef.current === ws) wsRef.current = null;
    };
  }, [mode, room?.code, connectionRetry, synchronize, applyReaction]);

  // Polling is a recovery path when push is active, never the renderer.
  useEffect(() => {
    if (mode !== "online" || !room?.code || !tokenRef.current) return;
    const code = room.code, token = tokenRef.current;
    const interval = window.setInterval(
      () => void synchronize(code, token, true), connected ? 9500 : 1700
    );
    // Mobile browsers suspend background timers and sockets. Refresh as soon
    // as the page becomes usable again, not at the next periodic tick.
    const resume = () => {
      if (document.visibilityState !== "visible") return;
      void synchronize(code, token, true);
    };
    const restorePage = (event: PageTransitionEvent) => { if (event.persisted) resume(); };
    document.addEventListener("visibilitychange", resume);
    window.addEventListener("online", resume);
    window.addEventListener("pageshow", restorePage);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", resume);
      window.removeEventListener("online", resume);
      window.removeEventListener("pageshow", restorePage);
    };
  }, [mode, room?.code, connected, synchronize]);

  const commitLocal = useCallback((change: (g: Game) => void, recordUndo = false) => {
    // Do not mutate from inside a React state updater: Strict Mode can invoke
    // updater functions twice. Every physical move is committed exactly once.
    const previous = localRef.current;
    if (!previous) return;
    try {
      const next = structuredClone(previous);
      change(next);
      Engine.invariant(next);
      if (next.events.length > 96) next.events.splice(0, next.events.length - 96);
      if (recordUndo) {
        undoRef.current = structuredClone(previous);
        setUndoAvailable(true);
      }
      localRef.current = next;
      setLocal(next);
      setNotice("");
      setSelection([]);
      setNeedsTarget(false);
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Invalid action");
    }
  }, []);
  const undo = useCallback(() => {
    if (!undoRef.current) return;
    const restored = structuredClone(undoRef.current);
    Engine.invariant(restored);
    localRef.current = restored;
    undoRef.current = null;
    setLocal(restored);
    setUndoAvailable(false);
    setSelection([]);
    setNotice("Previous turn restored.");
  }, []);

  // SNAP/SLAM are interrupts: the bot can act even while it is a human's turn.
  // This is the same priority contract used by Classic and the online server.
  const localBotKey = (() => {
    if (mode !== "local" || !local || local.phase !== "play") return null;
    // A labelled teaching fixture holds only the initial bot action until the learner acts.
    if (drill && local.moves === drill.startMove) return null;
    const opportunity = LocalTable.localBotOpportunity(Engine,local);
    if (!opportunity) return null;
    // Human SNAP must not restart an already scheduled rival turn.
    const lastOrdinary = [...local.events].reverse().find(e => e.type !== "followup");
    return [local.seed, opportunity.seat, opportunity.kind, opportunity.ids,
      lastOrdinary?.move ?? 0].join(":");
  })();
  useEffect(() => {
    if (!localBotKey) return;
    const timer = window.setTimeout(() => {
      commitLocal(game => {
        const opportunity = LocalTable.localBotOpportunity(Engine,game);
        if (!opportunity) return;
        const { seat, kind } = opportunity;
        if (kind === "dump") Engine.resolveDump(game, seat, Engine.botDumpTarget(game, seat));
        else if (kind === "snap") Engine.move(game, seat, Engine.followUpOptions(game, seat)[0]);
        else if (kind === "slam") Engine.move(game, seat, Engine.slamOptions(game, seat)[0]);
        else Engine.move(game, seat, Engine.choose(game, seat));
      });
    }, 680);
    return () => clearTimeout(timer);
  }, [localBotKey, commitLocal]);

  // Human-triggered bot advance remains server-authoritative in online rooms.
  useEffect(() => {
    if (mode !== "online" || !room || room.game.tournamentWithdrawal || room.game.phase !== "play" || busy) return;
    const g = room.game;
    if (!(g.botSeats.includes(g.pendingDump?.seat ?? g.turn) || g.botFollowupReady || g.botSlamReady)) return;
    const timer = setTimeout(() => {
      const latest = roomRef.current;
      if (latest && !latest.game.tournamentWithdrawal && !inFlight.current) void submit({
        action: "advance", code: latest.code, revision: latest.revision
      });
    }, 750);
    return () => clearTimeout(timer);
  }, [mode, room?.revision, room?.game.turn, room?.game.phase, room?.game.botFollowupReady,
    room?.game.botSlamReady, room?.game.pendingDump?.seat, busy, submit]);

  const g = useMemo(() => mode === "local" && local ? LocalTable.asLocalRoom(Engine,local) : mode === "online" ? room?.game : null,
    [mode, local, room]);
  const visualGameKey = mode === "local" ? "local:" + local?.seed :
    mode === "online" ? "online:" + room?.code + ":" + room?.game.round : "home";
  const insights = usePlaytestInsights({ key: visualGameKey, mode, phase: g?.phase ?? "home", drill: !!drill });
  const roundFunnel=useRoundFunnel({key:visualGameKey,scope:mode==="local"?"local":mode==="online"&&room?"online:"+room.code:null,phase:g?.phase??"home",drill:!!drill});
  useEffect(() => {
    const move = g?.moves ?? 0;
    const previous = blindMotionCursor.current;
    const fresh = previous.key === visualGameKey && move > previous.move &&
      g?.events.at(-1)?.source === "down" && g?.events.at(-1)?.type !== "blind-fail";
    blindMotionCursor.current = { key: visualGameKey, move };
    setFreshBlindMove(fresh ? move : null);
  }, [visualGameKey, g?.moves]);
  // Keep every card in view as the hand grows. Measure the real rendered
  // width (not a guessed viewport) so Safari, browser zoom and desktop all
  // use the same layout. A new row is preferred over unreadably thin slivers.
  useEffect(() => {
    const stage = handStageRef.current;
    if (!stage) return;
    const measure = () => {
      const style = getComputedStyle(stage);
      const horizontalPadding = parseFloat(style.paddingLeft) + parseFloat(style.paddingRight);
      const width = Math.max(0, stage.clientWidth - horizontalPadding);
      const card = stage.querySelector<HTMLElement>(".playing-card");
      const cardWidth = card ? parseFloat(getComputedStyle(card).width) :
        window.innerWidth <= 720 ? Math.max(51, Math.min(77, window.innerWidth * .15)) : 85;
      setHandArea(prev => Math.abs(prev.width - width) < .5 &&
        Math.abs(prev.cardWidth - cardWidth) < .5 ? prev : {width, cardWidth});
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(stage);
    window.addEventListener("resize", measure);
    return () => { observer.disconnect(); window.removeEventListener("resize", measure); };
  }, [mode, g?.phase, !!g]);
  const me = mode === "local" ? 0 : room?.me ?? 0;
  const face = g?.blindReveal;
  const showFlip = !!face && face.expiresAt > Date.now();
  const newestReactions = (g?.reactions || []).filter(r => Date.now() - r.at < 8000);
  useEffect(() => {
    if (!newestReactions.length && !showFlip) return;
    const id = window.setTimeout(() => setReactionClock(n => n + 1), 1100);
    return () => clearTimeout(id);
  }, [reactionClock, room?.game.reactions, face?.expiresAt, local?.moves, mode]);
  const reactionSymbols: Record<Reaction["kind"],string> = {
    fire: "🔥", wow: "😮", laugh: "😂", ouch: "😬", gg: "🏆"
  };
  const current = g?.players[me];
  const handCards = orderedHand(current?.hand || [], handSort);
  const handCount = handCards.length;
  const {handColumns,handRows,lastRowShift,handLayout} = HandLayout.computeHandLayout(handCount,handArea);
  const lastEvent = g?.events.at(-1);
  useRoundChoreography({gameKey: visualGameKey, roomCode: room?.code ?? null,
    phase: g?.phase ?? "home", moveNo: g?.moves ?? 0, turn: g?.turn ?? -1,
    freshDeal: freshDealKey.current === visualGameKey, motionLevel});
  useCommittedCardTravel({ gameKey: visualGameKey, moveNo: g?.moves ?? 0,
    phase: g?.phase ?? "setup", pile: g?.pile ?? [], event: lastEvent, me, motionLevel });
  const feedback = useGameFeedback({gameKey:visualGameKey,moveNo:g?.moves??0,
    phase:g?.phase??"home",event:lastEvent,me,loser:g?.loser??null,
    roomCode:room?.code??null,turn:g?.turn??-1,freshDeal:freshDealKey.current===visualGameKey});
  useEffect(() => {
    const phase=g?.phase??"home", previous=resultCursor.current;
    resultCursor.current={key:visualGameKey,phase};
    if(previous.key===visualGameKey && previous.phase==="play" && phase==="over" &&
        !document.querySelector('[role="dialog"]'))
      resultTitleRef.current?.focus({preventScroll:true});
  },[visualGameKey,g?.phase]);
  const stage = current ? current.handCount || g?.stockCount ? "hand" :
    current.up.length ? "up" : current.downCount ? "down" : "out" : "out";
  const active = g?.phase === "play" && g.turn === me && !g.pendingDump && !g.pendingCounter;
  // Match Classic: bridge only when the full final hand is homogeneous and
  // matching face-up cards exist. No other face-up selection is legal.
  const bridgeCard = active && g?.stockCount === 0 && stage === "hand" && current?.hand?.length &&
    current.hand.every(c => sameFace(c, current.hand![0])) &&
    current.up.some(c => sameFace(c, current.hand![0])) ? current.hand[0] : null;
  const canBridge = (card: Card) => !!bridgeCard && sameFace(card, bridgeCard);
  const legal = g?.legal || [];
  const selectedCards = selection.map(id =>
    [...(current?.hand || []), ...(current?.up || [])].find(card => card.id === id)).filter((card): card is Card => !!card);
  const selectedAction = selectedCards.find(card => card.kind === "action")?.action;
  const nameForSeat = useCallback((seat: number) => {
    if (mode === "local") return humanLabel(seat);
    if (room?.game.botSeats.includes(seat)) return `Bot ${room.game.botSeats.indexOf(seat) + 1}`;
    return room?.members.find(m => m.seat === seat)?.name || `Player ${seat + 1}`;
  }, [mode, room]);

  function chooseCard(card: Card) {
    feedback.select();
    setNotice("");
    setSelection(prev => {
      const hand = current?.hand || [], up = current?.up || [];
      const remaining = prev.includes(card.id) ? prev.filter(id => id !== card.id) :
        (prev.length && !prev.every(id => sameFace([...hand, ...up].find(c => c.id === id), card)))
          ? [card.id] : [...prev, card.id];
      const upSelected = remaining.filter(id => up.some(c => c.id === id));
      if (upSelected.length && canBridge(card)) {
        // Engine requires the COMPLETE remaining hand first, then visible cards.
        return [...hand.map(c => c.id), ...upSelected];
      }
      if (upSelected.length && bridgeCard && upSelected.every(id =>
        sameFace(up.find(c => c.id === id), bridgeCard))) {
        return [...hand.map(c => c.id), ...upSelected];
      }
      return remaining;
    });
  }

  function playMove(move: Move) {
    setNotice("");
    if (mode === "local") commitLocal(game => { Engine.move(game, me, move); }, true);
    else if (room) {
      const onlineMove = move.source === "down"
        ? { type: "play", source: "down", index: move.index }
        : move;
      void submit(roomMove(onlineMove as Move, room.code, room.revision));
    }
    setSelection([]);
  }

  function playCardDirect(card: Card) {
    const ids = canBridge(card) ? [
      ...(current?.hand || []).map(c => c.id),
      ...selection.filter(id => current?.up.some(c => c.id === id) && id !== card.id),
      card.id
    ] : selection.includes(card.id) ? selection : [card.id];
    const choice = legal.find(m => m.type === "play" && m.source !== "down" &&
      identicalIds(m.ids || [], ids));
    if (!choice) {
      setNotice("This card is not legal now. Choose another card or take the pile.");
      return;
    }
    if (card.kind === "action" && card.action === "dump" && (g?.players.filter(p =>
      !p.out && p.seat !== me).length || 0) > 1) {
      setSelection(ids); setNeedsTarget(true);
      return;
    }
    playMove(choice);
  }

  function playSelected(target?: number) {
    const chosen = legal.find(m => m.type === "play" && m.source !== "down" &&
      identicalIds(m.ids || [], selection));
    if (!chosen) return setNotice("Select a legal group of matching cards.");
    const otherSeats = g?.players.filter(p => !p.out && p.seat !== me).map(p => p.seat) || [];
    if (selectedAction === "dump" && target === undefined && otherSeats.length > 1) {
      setNeedsTarget(true);
      return;
    }
    playMove(target === undefined ? chosen : { ...chosen, target });
    setNeedsTarget(false);
  }

  function clickBlind(index: number) {
    if (!active || stage !== "down") return;
    if (mode === "local" && local) {
      const card = local.people[me].down[index];
      if (card) playMove({ type: "play", source: "down", ids: [card.id] });
    } else if (room) playMove({ type: "play", source: "down", index });
  }

  function swap(card: Card, zone: "hand" | "up") {
    if (!g || !current) return;
    if (zone === "hand") { setSwapHand(card.id); return; }
    if (swapHand === null) return setNotice("Select a card in your hand first.");
    if (mode === "local") commitLocal(game => Engine.swap(game, me, swapHand, card.id));
    else if (room) void submit({ action: "swap", code: room.code, revision: room.revision,
      handId: swapHand, upId: card.id });
    setSwapHand(null);
  }

  function startDrill(id:DrillId) {
    const game=Drills.buildDrill(Engine,id);
    roomEpoch.current++;
    freshDealKey.current=null;
    setDrill({id,startMove:game.moves}); setPracticeMode(true); setCoachDismissed(false);
    localRef.current=game; undoRef.current=null; setUndoAvailable(false);
    setLocal(game); setRoom(null); setMode("local"); setSelection([]); setSwapHand(null); setNeedsTarget(false); setNotice("");
  }

  function startLocalGame(withCoach = practiceMode, previousWinner: number | null = null,
    seatCount: number | null = null, autoStart = false) {
    roomEpoch.current++;
    setDrill(null);
    setPracticeMode(withCoach);
    setCoachDismissed(false);
    const game = createGame(seatCount ?? (withCoach ? 2 : players), endgameRule, previousWinner, withCoach);
    if(autoStart){Engine.autoSetup(game,0);Engine.start(game);}
    freshDealKey.current = "local:" + game.seed;
    localRef.current = game;
    undoRef.current = null; setUndoAvailable(false);
    setLocal(game); setRoom(null); setMode("local"); setSelection([]); setNotice("");
  }

  function newRound() {
    if (drill) { startDrill(drill.id); return; }
    if(room?.game.roundLimit&&room.game.round>=room.game.roundLimit)return;
    roundFunnel.requestRematch();
    if (mode === "local") startLocalGame(practiceMode, local?.finishedOrder[0] ?? null,
      local?.people.length ?? null);
    else if (room) void submit({ action: "rematch", code: room.code, revision: room.revision });
  }

  function resumeLocal() {
    roomEpoch.current++;
    const saved = loadSavedGame();
    if (!saved) { setResumeGame(null); setNotice("Saved game is unavailable."); return; }
    setDrill(null);
    freshDealKey.current = null;
    localRef.current = saved; undoRef.current = null; setUndoAvailable(false);
    setPracticeMode(readPreference(PRACTICE_KEY) === "true");
    setEndgameRule(saved.endgameRule === "final-duel" ? "final-duel" : "classic");
    setCoachDismissed(false);
    setLocal(saved); setRoom(null); setMode("local"); setSelection([]); setNotice("");
    history.replaceState(null, "", "/play");
  }

  function leaveTable() {
    roomEpoch.current++;
    reconnectAttempts.current = 0;
    if (wsRef.current) wsRef.current.close();
    setDrill(null);
    freshDealKey.current = null;
    setMode("home"); setInviteEntry(false); setLocal(null); setRoom(null); roomRef.current = null;
    tokenRef.current = null; setBusy(false); inFlight.current = false;
    setConnected(false); setConfirmRestart(false); setShowRules(false); setPileOpen(false);
    setShowSettings(false); setPendingRule(null); setCopiedInvite(false);
    setSelection([]); setNotice("");
    history.replaceState(null, "", "/play");
  }

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (showRules || showSettings || confirmRestart || pileOpen || needsTarget || selection.length) {
          event.preventDefault();
          setShowRules(false); setShowSettings(false); setConfirmRestart(false); setPileOpen(false); setNeedsTarget(false); setSelection([]);
        }
        return;
      }
      if (showRules || showSettings || confirmRestart || pileOpen || inspectSeat !== null || event.repeat || event.altKey || event.metaKey || event.ctrlKey) return;
      const target = event.target;
      if (target instanceof HTMLElement &&
          target.closest("input,textarea,select,[contenteditable=true]")) return;
      const keys: Record<string, string> = {
        p: "play", t: "take", u: "undo", s: "snap", b: "slam"
      };
      const action = keys[event.key.toLowerCase()];
      const button = action ? document.querySelector<HTMLButtonElement>(
        '[data-hotkey="' + action + '"]') : null;
      if (button && !button.disabled) { event.preventDefault(); button.click(); }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [showRules, showSettings, confirmRestart, pileOpen, inspectSeat, needsTarget, selection.length]);

  useEffect(() => {
    if (!showRules && !showSettings && !confirmRestart && !pileOpen) return;
    const previous = document.activeElement as HTMLElement | null;
    const dialog = document.querySelector<HTMLElement>('[role="dialog"]');
    // Include native inputs, selects, links and any enabled custom control.
    // Trapping only buttons silently excluded Motion, Sound and Final Duel
    // settings from the expected keyboard traversal order.
    const focusables = () => [...(dialog?.querySelectorAll<HTMLElement>(
      'a[href],button:not(:disabled),input:not(:disabled),select:not(:disabled),' +
      'textarea:not(:disabled),[tabindex]:not([tabindex="-1"])') || [])]
      .filter(el => el.getClientRects().length > 0 &&
        el.getAttribute("aria-hidden") !== "true");
    focusables()[0]?.focus();
    const trap = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return;
      const elements = focusables();
      if (!elements.length) return;
      const first = elements[0], last = elements[elements.length - 1];
      if (!dialog?.contains(document.activeElement)) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
      } else if (event.shiftKey && document.activeElement === first) {
        event.preventDefault(); last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault(); first.focus();
      }
    };
    dialog?.addEventListener("keydown", trap);
    return () => { dialog?.removeEventListener("keydown", trap); previous?.focus?.(); };
  }, [showRules, showSettings, confirmRestart, pileOpen]);

  async function shareInvite(){
    if(!room)return;
    const url=new URL("/play?room="+encodeURIComponent(room.code),window.location.origin).toString();
    if(typeof navigator.share!=="function"){await copyInvite();return;}
    try{await navigator.share({title:"Join my PILEHEADS table",text:"One pile. One loser. Come play!",url});}
    catch(error){if(error instanceof Error&&error.name==="AbortError")return;await copyInvite();}
  }

  async function copyInvite() {
    if (!room) return;
    const invite = new URL("/play?room=" + encodeURIComponent(room.code),
      window.location.origin).toString();
    try {
      if (!navigator.clipboard?.writeText) throw new Error("clipboard_unsupported");
      await navigator.clipboard.writeText(invite);
      setCopiedInvite(true);
      emitFunnel("invite_copied");
    } catch {
      // Explicit user interaction only. Even a browser without clipboard
      // permissions must still let the player share the invite.
      window.prompt("Copy this private room invite link:", invite);
    }
  }

  function changeEndgameRule(next: EndgameRule) {
    if (mode === "online" && roomRef.current) {
      const activeRoom = roomRef.current;
      if (!activeRoom.host || activeRoom.game.phase !== "setup" || activeRoom.game.roundLimit) return;
      // Optimistic feedback for the checkbox, but the server remains the
      // single source of truth. Concurrent host/guest lobby changes may require
      // one safe revision retry, unlike card moves.
      setPendingRule(next);
      void submit({ action: "settings", code: activeRoom.code, revision: activeRoom.revision,
        endgameRule: next }).then(() => {
          if (roomRef.current?.game.endgameRule === next) {
            setEndgameRule(next);
            try { localStorage.setItem(FINAL_DUEL_KEY, next); } catch {}
          }
        }).finally(() => setPendingRule(null));
      return;
    }
    setEndgameRule(next);
    try { localStorage.setItem(FINAL_DUEL_KEY, next); } catch {}
    if (mode === "local" && local?.phase === "setup") {
      commitLocal(game => { game.endgameRule = next; });
    }
  }

  async function createOnlineRoom() {
    if(offlineNetwork){setNotice("Reconnect to create an online room.");return;}
    if (onlineHumans + onlineBots < 2 || onlineHumans + onlineBots > 5) {
      setNotice("Choose 2–5 seats in total."); return;
    }
    writePreference("stack-next-display-name", name);
    await submit({ action: "create", name, humans: onlineHumans, bots: onlineBots,
      endgameRule, roundLimit }, true);
  }

  async function joinOnlineRoom() {
    if(offlineNetwork){setNotice("Reconnect to join an online room.");return;}
    writePreference("stack-next-display-name", name);
    await submit({ action: "join", name, code: joinCode.trim().toUpperCase() }, true);
  }

  if (g?.tournamentWithdrawal && mode==="online") return <main className="game-shell stack-lobby"><SiteHeader current="/play"/><section className="entry launch-entry"><div className="entry-intro"><div className="eyebrow">TOURNAMENT ENDED</div><h1>Table<br/><em>closed.</em></h1><p>{g.tournamentWithdrawal.reason==="deadline"?(g.tournamentWithdrawal.deadlineKind==="setup"||g.tournamentWithdrawal.deadlineKind==="intermission"?"The ready window expired.":`${nameForSeat(g.tournamentWithdrawal.seat)} ran out of time.`):`${nameForSeat(g.tournamentWithdrawal.seat)} withdrew.`} No points are awarded for an unfinished round, and no tournament winner is declared.</p><div className="lobby-links"><button className="secondary-button entry-settings" onClick={leaveTable}>Back to lobby</button></div></div><div className="entry-options"><section className="mode-card"><h2>Completed rounds</h2>{g.standings?.completedRounds?<TableStandings score={g.standings} me={me} nameForSeat={nameForSeat}/>:<p>No completed rounds.</p>}</section></div></section></main>;

  if (!g || !current) return (
    <main className="game-shell stack-lobby">
      <SiteHeader current="/play" offline={offlineNetwork}/>
      <section className="entry launch-entry">
        <div className="entry-intro"><div className="eyebrow">WELCOME TO THE TABLE</div>
          <h1>{inviteEntry ? <>You’re<br/><em>invited.</em></> : <>One pile.<br /><em>One loser.</em></>}</h1>
          <p>{inviteEntry ? "Your friends are waiting. Pick a nickname and join the table." : "Play the free PILEHEADS multiplayer card game in your browser. Get rid of your cards against bots or invite friends."}</p>
          <div className="lobby-facts"><span>2–5 players</span><span>Free to play</span><span>No account required</span></div><div className="lobby-art" aria-hidden="true"><span className="lobby-card lobby-burn"/><span className="lobby-card lobby-dump"/><span className="lobby-card lobby-ghost"/><img src="/stack-media/stack-home-explorer-web-mobile.webp" width={360} height={452} alt="" decoding="async"/></div><div className="lobby-links"><button className="secondary-button entry-settings" onClick={() => setShowSettings(true)}>Game settings</button>{!inviteEntry&&!offlineNetwork&&<Link className="secondary-button" href="/profile">Your profile</Link>}</div>{!inviteEntry && mode === "home" && <><PwaInstall/><OfflineControl/></>}
        </div>
        <div className="entry-options"><h2 className="lobby-choice-heading">{inviteEntry ? "Join the table" : "Choose your table"}<span>.</span></h2>
          {inviteEntry ? <form className="mode-card invite-mode" onSubmit={event=>{event.preventDefault();if(!busy&&name.trim()&&joinCode.length===8)void joinOnlineRoom();}}><div className="eyebrow">PRIVATE INVITATION</div><h2>Room {joinCode}</h2><label>Your name <input maxLength={24} required value={name} onChange={e=>setName(e.target.value)}/></label><button className="cta" type="submit" disabled={busy||!name.trim()}>{busy?"Connecting…":"Join"} <span aria-hidden>→</span></button><button type="button" className="learn-button" onClick={()=>{setInviteEntry(false);setJoinCode("");setNotice("");history.replaceState(null,"","/play");}}>Back to all tables</button></form> : <>
          {resumeGame && <div className="resume-panel">
            <div><div className="eyebrow">SAVED LOCAL MATCH</div>
              <strong>Pick up where you left off</strong>
              <p>{resumeGame.phase === "over" ? "Last round finished" : `${resumeGame.moves} moves · ${resumeGame.people.length} players`}</p>
            </div>
            <button className="secondary-button" onClick={resumeLocal}>Resume game</button>
          </div>}
          <div className="mode-card">
            <div className="eyebrow">01 · PRACTICE</div><h2>Play with bots</h2>
            <p>Jump in immediately with a guided two-player game.</p>
            <button type="button" className="cta quick-start" onClick={()=>startLocalGame(true,null,2,true)}>Quick play</button>
            <p className="custom-table-label">Or set up your own table:</p>
            <label>Players <select value={players} onChange={e => setPlayers(Number(e.target.value))}>
              {[2, 3, 4, 5].map(n => <option key={n} value={n}>{n} players</option>)}
            </select></label>
            <button className="cta" onClick={() => startLocalGame(false)}>Start game <span aria-hidden>→</span></button>
            <button className="learn-button" onClick={() => startLocalGame(true)}>Learn with a bot</button>
            <details className="drill-picker"><summary>Practice a special move</summary>
              <label>Special move drill <select value={drillChoice} onChange={e=>setDrillChoice(e.target.value as DrillId)}>
                {Drills.DRILLS.map(d=><option key={d.id} value={d.id}>{d.label}</option>)}
              </select></label>
              <small>Isolated practice. The bot waits for your first action; saved matches stay untouched.</small>
              <button className="learn-button" onClick={()=>startDrill(drillChoice)}>Practice special move</button>
            </details>
          </div>
          {offlineNetwork?<section className="mode-card" role="status"><h2>You’re offline.</h2><p>Bot games are available. Reconnect for private rooms and online matchmaking.</p></section>:<><div className="mode-card">
            <div className="eyebrow">02 · WITH FRIENDS</div><h2>Private room</h2>
            <p>Invite real players, fill empty seats with bots.</p>
            <label>Your name <input maxLength={24} value={name} onChange={e => setName(e.target.value)} /></label>
            <div className="field-pair"><label>Humans <select value={onlineHumans} onChange={e => {const humans=Number(e.target.value);setOnlineHumans(humans);setOnlineBots(bots=>Math.max(2-humans,Math.min(5-humans,bots)));}}>
              {[1, 2, 3, 4, 5].map(n => <option key={n}>{n}</option>)}
            </select></label><label>Bots <select value={onlineBots} onChange={e => setOnlineBots(Number(e.target.value))}>
              {[0, 1, 2, 3, 4].filter(n=>onlineHumans+n>=2&&onlineHumans+n<=5).map(n => <option key={n}>{n}</option>)}
            </select></label></div>
            <label>Table format <select value={roundLimit??"endless"} onChange={e=>setRoundLimit(e.target.value==="endless"?null:Number(e.target.value) as 3|5|10)}><option value="endless">Endless table</option><option value="3">Quick tournament · 3 rounds</option><option value="5">Classic tournament · 5 rounds</option><option value="10">Grand tournament · 10 rounds</option></select></label>
            <button className="cta" disabled={busy || !name.trim()} onClick={() => void createOnlineRoom()}>
              {busy ? "Connecting…" : "Create a room"} <span aria-hidden>→</span></button>
            <div className="lobby-join-label">Already have an invite?</div><div className="join-row"><input aria-label="Room code" maxLength={8} placeholder="8-letter room code"
              value={joinCode} onChange={e => setJoinCode(e.target.value.toUpperCase())} />
              <button disabled={busy || joinCode.length !== 8 || !name.trim()} onClick={() => void joinOnlineRoom()}>Join</button></div>
          </div><section className="mode-card public-matchmaking-card" aria-label="Find an online opponent"><div className="eyebrow">03 · ONLINE MATCH</div><h2>Find an opponent.</h2><p>Meet another human player for a three-round table. Check availability before joining; a verified account is required.</p><Link className="cta" href="/quick-play">Find opponent <span aria-hidden>→</span></Link><Link className="learn-button" href="/profile">Your account &amp; progress</Link></section></>}</>}
        </div>
      </section>
      <footer className="lobby-footer"><span>PILEHEADS · The card game with character.</span>{!offlineNetwork&&<><a href="/how-to-play">Read the rules ↗</a><a href="/pilehead/print.html">Print playtest cards</a></>}<button type="button" className="secondary-button" onClick={() => setShowSettings(true)}>Playtest report</button><FunnelConsent/></footer>
      {notice && <div className="alert" role="status">{notice}</div>}
      {showSettings && <div className="modal-backdrop" onClick={() => setShowSettings(false)}>
        <section className="game-modal" role="dialog" aria-label="Game settings" aria-modal="true"
          onClick={event => event.stopPropagation()}>
          <div className="eyebrow">GAME SETTINGS</div><h2>Make it your game.</h2>
          <label className="rule-toggle"><input type="checkbox" checked={endgameRule === "final-duel"}
            onChange={event => changeEndgameRule(event.target.checked ? "final-duel" : "classic")} />
            <span><strong>Final Duel</strong><small>Optional: with two players left and no draw cards,
              every pile pickup burns the visible top card. Off by default.</small></span>
          </label>
          {motionSetting}
          <FeedbackSettings feedback={feedback} />
           <PlaytestInsights insights={insights} />
           <FunnelConsent/>
          <button className="primary-button" onClick={() => setShowSettings(false)}>Done</button>
        </section>
      </div>}
    </main>
  );

  const liveSeats = g.players.filter(p => !p.out && p.seat !== me).map(p => p.seat);
  const inspectedOpponent = inspectSeat === null ? null : g.players.find(p => p.seat === inspectSeat);
  const canPlay = !!legal.find(m => m.type === "play" && m.source !== "down" && identicalIds(m.ids || [], selection));
  const choosingDumpTarget = (needsTarget || g.pendingDump?.seat === me) && !busy;
  const chooseDumpSeat = (seat: number) => {
    if (g.pendingDump?.seat === me) {
      if (mode === "local") commitLocal(game => Engine.resolveDump(game, me, seat));
      else if (room) void submit({ action: "dump-target", code: room.code, revision: room.revision, target: seat });
    } else if (needsTarget) playSelected(seat);
  };
  const canTake = legal.some(m => m.type === "take");
  const rule = g.limit?.type === "under" ? "Next number: 1–4" : g.limit?.type === "min"
    ? `Next number: ${g.limit.value} or higher` : "Any number can follow";
  const finalDuel = g.endgameRule === "final-duel" && g.phase === "play" &&
    g.stockCount === 0 && g.players.filter(p => !p.out).length === 2;
  const coach = Coach.coachTip(g,{me,active,stage,selection,canPlay,needsTarget,selectedAction});
  const outcome = Coach.roundOutcome(g,me);
  const sharePayload = ResultShareCore.resultShare({phase:g.phase,kind:outcome?.kind ?? "",players:g.players.length,drill:!!drill});
  const shareCard=resultCardData({phase:g.phase,kind:outcome?.kind??"",players:g.players.length,moves:g.moves,drill:!!drill});
  const ready = !!g.setupReady[me];
  const allReady = g.setupReady.every(Boolean);
  const joined = mode === "local" ? true : room?.members.length === g.players.length - g.botSeats.length;

  return (
    <main className="game-shell game-table-shell" data-phase={g.phase} data-drill={drill?.id} data-hand-count={handCount} data-turn={g.phase === "play" ? active ? "self" : "other" : "none"}>
      <header className="game-header">
        <BrandLink compact offline={offlineNetwork}/>
        <div className="game-head-actions">
          {room && !g.publicMatch && <button className={"room-code " + (copiedInvite ? "is-copied" : "")}
            onClick={() => void copyInvite()}
            title="Copy invitation link" aria-label={"Copy invitation for room " + room.code}>
            ROOM {room.code} <span aria-live="polite">{copiedInvite ? "Copied" : "Copy invite"}</span></button>}
          {room&&!g.publicMatch&&nativeShareAvailable&&<button className="exit-button" onClick={()=>void shareInvite()} aria-label="Share room invitation">Share invite</button>}
          {mode === "online" && <span className={`connection-chip ${connected ? "is-online" : "is-offline"}`}
            title={`Last sync: ${lastSyncAt.current ? new Date(lastSyncAt.current).toLocaleTimeString() : "pending"}`}
            role="status">{connected ? "Live" : "Reconnecting"}</span>}
          <button className="exit-button" onClick={() => setShowRules(true)}>Rules</button>
          <button className="exit-button" onClick={() => setShowSettings(true)}>Settings</button>
          <label className="theme-control">Deck
            <select aria-label="Deck style" value={deckTheme}
              onChange={e => setDeckTheme(e.target.value as DeckTheme)}>
              <option value="refined">Official illustrated deck</option><option value="characters">Classic illustrated deck</option><option value="original">Original prototype</option>
            </select>
          </label>
          <button className="exit-button" onClick={leaveTable}>Leave table</button>
        </div>
      </header>
      <section className="game-meta">
        <div><div className="eyebrow">{drill ? "SPECIAL MOVE DRILL" : g.phase === "setup" ? "SET YOUR TABLE" : g.phase === "over" ? "ROUND COMPLETE" : "GAME IN PROGRESS"}</div>
          <h1>{g.phase === "over" ? `${nameForSeat(g.loser ?? -1)} is the PILEHEAD!` :
            g.phase === "setup" ? "Choose your opening cards" :
            active ? "Your move." : `${nameForSeat(g.turn)} is playing.`}</h1></div>
        <div className="meta-right">{mode==="online"&&<span>{g.roundLimit?"Tournament · "+g.round+"/"+g.roundLimit:"Round "+g.round}</span>}{g.deadline&&<PublicDeadline key={g.deadline.expiresAt} deadline={g.deadline} me={me}/>}<span>{g.moves} moves</span><span>{g.players.length} players</span></div>
      </section>
      {mode === "local" && practiceMode && !coachDismissed && coach &&
        <aside className="coach-tip" aria-label="Learning coach" data-coach-step={coach.id}>
          <div><strong>LEARN BY PLAYING</strong><span aria-live="polite">{coach.text}</span></div>
          <button type="button" onClick={() => setCoachDismissed(true)}>Hide tips</button>
        </aside>}

      <MoveTheater gameKey={mode === "local" ? "local:" + local?.seed :
        "online:" + room?.code + ":" + g.round}
        moveNo={g.moves} phase={g.phase} events={g.events} blindReveal={g.blindReveal} me={me}
        theme={deckTheme} nameForSeat={nameForSeat} motionLevel={motionLevel} />
      <div className={`tabletop theme-${deckTheme}`} role="region" aria-label="PILEHEADS card game">
        <div className="table-texture" aria-hidden="true" />
        <OpponentsStrip g={g} me={me} theme={deckTheme} room={room} nameForSeat={nameForSeat}
          choosingDumpTarget={choosingDumpTarget} chooseDumpSeat={chooseDumpSeat} onInspect={setInspectSeat}
          newestReactions={newestReactions} reactionSymbols={reactionSymbols} />
        <CenterBoard g={g} theme={deckTheme} canPlay={canPlay} busy={busy}
          playSelected={playSelected} freshBlindMove={freshBlindMove} rule={rule} onInspect={() => setPileOpen(true)} />
        {finalDuel && <div className="duel-banner" role="status">
          <strong>FINAL DUEL</strong><span>Every pickup burns the visible top card first.</span>
        </div>}
        <PlayerHandArea g={g} current={current} theme={deckTheme} ready={ready} active={active} stage={stage}
          canBridge={canBridge} clickBlind={clickBlind} selection={selection} swap={swap} chooseCard={chooseCard}
          playCardDirect={playCardDirect} onClear={() => {setSelection([]);setNeedsTarget(false);}}
          onSort={() => setHandSort(order => order === "dealt" ? "asc" : order === "asc" ? "desc" : "dealt")}
          handSort={handSort} handStageRef={handStageRef} handCount={handCount} handLayout={handLayout}
          handRows={handRows} handColumns={handColumns} handCards={handCards} lastRowShift={lastRowShift} swapHand={swapHand} />
        {outcome && <section className="results-overlay" data-outcome={outcome.kind} data-motion={motionLevel}
          role="region" aria-label="Round results">
          <div className="eyebrow">ROUND COMPLETE</div>
          {!drill && !offlineNetwork && (outcome.kind === "first" || outcome.kind === "loss") && <UniverseIllustration name={outcome.kind === "first" ? "character-ten-victory" : "state-defeat-keep-cool"} className="universe-round-result"/>}
          <h2 ref={resultTitleRef} tabIndex={-1}>{outcome.title}</h2>
          <p>{drill ? "Practice complete. Repeat the drill or leave the table." : outcome.description}</p>
          <ol className="results-standings">
            {[...g.finishedOrder, ...(g.loser === null ? [] : [g.loser])].map((seat, index) =>
              <li key={seat} data-self={seat === me} className={seat === g.loser ? "results-loser" : ""}>
                <span>{index + 1}</span><strong>{nameForSeat(seat)}{mode === "online" && seat === me ? " (you)" : ""}</strong>
                <small>{seat === g.loser ? "PILEHEAD" : index === 0 ? "First out" : "Escaped"}</small>
              </li>)}
          </ol>
          {mode==="online"&&g.standings&&<TableStandings score={g.standings} me={me} nameForSeat={nameForSeat} final={!!g.roundLimit&&g.round>=g.roundLimit}/>}
          {mode==="online"&&!!g.roundLimit&&g.round>=g.roundLimit&&<button className="primary-button" onClick={leaveTable}>Back to lobby</button>}
          <div className="results-stats"><span>{g.moves} plays</span>
            <span>{g.ashesCount} cards burned</span><span>{g.players.length} players</span></div>
        </section>}
      </div>

      {inspectedOpponent && <div className="react-pile-backdrop"
        onClick={() => setInspectSeat(null)}>
        <section className="react-pile-panel" role="dialog" aria-modal="true"
          aria-label={`${nameForSeat(inspectedOpponent.seat)} face-up cards`}
          onClick={event => event.stopPropagation()}
          onKeyDown={event => {
            if (event.key === "Tab") { event.preventDefault(); inspectCloseRef.current?.focus(); }
          }}>
          <header>
            <div><strong>{nameForSeat(inspectedOpponent.seat)} · VISIBLE CARDS</strong>
              <small>{inspectedOpponent.up.length} face-up · {inspectedOpponent.downCount} face-down · {inspectedOpponent.handCount} in hand</small></div>
            <button className="secondary-button" type="button" ref={inspectCloseRef}
              onClick={() => setInspectSeat(null)}>Close</button>
          </header>
          <div className="react-pile-grid opponent-inspect-grid">
            {inspectedOpponent.up.length ? inspectedOpponent.up.map(card =>
              <div className="react-pile-item" key={card.id}>
                <PlayingCard card={card} theme={deckTheme} />
                <small>{card.kind === "number" ? String(card.rank) : card.action?.toUpperCase()}</small>
              </div>) : <p>No face-up cards remain.</p>}
          </div>
          <p>Only publicly visible cards are shown. Hands and face-down cards stay private.</p>
        </section>
      </div>}
      {pileOpen && <div className="react-pile-backdrop" onClick={() => setPileOpen(false)}>
         <section className="react-pile-panel" role="dialog" aria-modal="true" aria-label="All played pile cards"
           onClick={e => e.stopPropagation()}>
           <header><div><strong>THE PILE</strong><small>{g.pile.length} played cards · oldest to newest</small></div>
             <button type="button" className="secondary-button" onClick={() => setPileOpen(false)}>Close</button></header>
           <div className="react-pile-grid">{g.pile.length
             ? g.pile.map(card => <div className="react-pile-item" key={card.id}>
                 <PlayingCard card={card} theme={deckTheme} /></div>)
             : <p>The pile is empty.</p>}</div>
           <p>Only cards that have been played are visible. The draw deck stays hidden.</p>
         </section>
       </div>}
       <ActionDock g={g} mode={mode} room={room} ready={ready} allReady={allReady} joined={joined} busy={busy}
          undoAvailable={undoAvailable} undo={undo} onRematch={() => setConfirmRestart(true)} onCancelRematch={()=>{if(room)void submit({action:"rematch-ready",ready:false,code:room.code,revision:room.revision});}}
           resultShare={sharePayload ? <ResultShare key={visualGameKey} payload={sharePayload} card={shareCard} onShared={()=>emitFunnel("result_shared")} /> : null} me={me}
          nameForSeat={nameForSeat} playMove={playMove} liveSeats={liveSeats} chooseDumpSeat={chooseDumpSeat}
          needsTarget={needsTarget} playSelected={playSelected} onCancelTarget={() => setNeedsTarget(false)}
          selectedCards={selectedCards} selectedAction={selectedAction} active={active} reactionsOpen={reactionsOpen}
          onToggleReactions={() => setReactionsOpen(open => !open)} reactionSymbols={reactionSymbols}
          sendReaction={sendReaction} canTake={canTake} canPlay={canPlay}
          onAutoArrange={() => commitLocal(game => Engine.autoSetup(game, 0))}
          onStart={() => { if (mode === "local") commitLocal(game => Engine.start(game));
            else if (room) void submit({action:"start",code:room.code,revision:room.revision}); }}
          onReady={() => { if (room) void submit({action:"ready",ready:!ready,code:room.code,revision:room.revision}); }} />
       {notice && <div className="alert" role="alert">{notice}</div>}
      {showSettings && <div className="modal-backdrop" onClick={() => setShowSettings(false)}>
        <section className="game-modal" role="dialog" aria-label="Game settings" aria-modal="true"
          onClick={event => event.stopPropagation()}>
          <div className="eyebrow">GAME SETTINGS</div><h2>Table rules</h2>
          <label className="rule-toggle">
            <input type="checkbox" checked={(mode === "online" && pendingRule ? pendingRule : g.endgameRule) === "final-duel"}
              disabled={busy || g.phase !== "setup" || (mode === "online" && (!room?.host || !!g.roundLimit))}
              onChange={event => changeEndgameRule(event.target.checked ? "final-duel" : "classic")} />
            <span><strong>Final Duel</strong><small>
              When the stock is empty and exactly two players remain, each pile pickup
              permanently burns its visible top card. Disabled by default. {g.roundLimit ? "Tournament rules are fixed at room creation." : ""}
            </small></span>
          </label>
          {room?.historyAvailable&&tokenRef.current&&!backendOrigin&&<RoundHistoryConsent key={room.code+":"+g.round} code={room.code} round={g.round} revision={room.revision} phase={g.phase} token={tokenRef.current} busy={busy} progressionAvailable={room.progressionAvailable} onChanged={()=>{
            if(roomRef.current?.code!==room.code||!tokenRef.current)return;
            void synchronize(room.code,tokenRef.current,true,false);
            if(wsRef.current?.readyState===WebSocket.OPEN){try{wsRef.current.send(JSON.stringify({type:"sync-hint"}));}catch{}}
          }}/>}
          {motionSetting}
          <FeedbackSettings feedback={feedback} />
           <PlaytestInsights insights={insights} />
           <FunnelConsent/>
          {mode === "local" && practiceMode && <label className="rule-toggle">
            <input type="checkbox" checked={!coachDismissed} onChange={event=>setCoachDismissed(!event.target.checked)} />
            <span><strong>Practice tips</strong><small>Show contextual learning guidance.</small></span>
          </label>}
          <p className="settings-hint">{g.phase !== "setup"
            ? "Rules are locked once the round begins. The setting stays the same for rematches."
            : mode === "online" && !room?.host
              ? "Only the room host can change the rules before the round begins."
              : "Change this before the round starts. Everyone at the table will see the choice."}</p>
          {room&&g.roundLimit&&!(g.phase==="over"&&g.round>=g.roundLimit)&&<details className="withdraw-tournament"><summary>Withdraw from tournament</summary><p>This permanently ends the tournament for everyone. Completed scores remain; an unfinished round awards no points. For a temporary break, close the game and use your existing invite to reconnect.</p><button className="secondary-button" disabled={busy} onClick={()=>{void submit({action:"withdraw-tournament",confirm:true,code:room.code,revision:room.revision});}}>Confirm withdrawal</button></details>}
          <button className="primary-button" onClick={() => setShowSettings(false)}>Back to table</button>
        </section>
      </div>}
      {showRules && <div className="modal-backdrop" role="presentation" onClick={() => setShowRules(false)}>
        <section className="game-modal" role="dialog" aria-modal="true" aria-label="PILEHEADS quick rules"
          onClick={e => e.stopPropagation()}>
          <div className="eyebrow">HOW TO PLAY</div><h2>One pile. One loser.</h2>
          <p>Play a number equal to or higher than the current restriction, or play any special card.
            Keep three cards in hand while the draw deck lasts. Empty your hand, then your face-up cards,
            then flip your face-down cards without looking. The last player with cards loses.</p>
          <div className="quick-rules">{ACTIONS.filter(action => !(action === "skip" && g.omitSkip)).map(action => <div key={action}>
            <strong>{action.toUpperCase()}</strong><span>{ACTION_DESCRIPTIONS[action]}</span>
          </div>)}</div>
          <p><strong>SNAP:</strong> A matching number you just drew may be played until another player acts.
            <strong> SLAM:</strong> Complete four matching numbers to burn the pile. <strong>Counter DUMP:</strong> If you already held a DUMP when the pile was sent to you, you can return the received cards or keep them. <strong>Final Duel:</strong> When
            only two players remain and the deck is empty, the top card burns before pile pickup
            <em> only when enabled in Settings</em>.</p>
          <div className="button-group">
            <button className="secondary-button" aria-pressed={feedback.soundEnabled}
              onClick={() => feedback.changeSound(!feedback.soundEnabled)}>{feedback.soundEnabled ? "Sound on" : "Sound off"}</button>
            <button className="primary-button" onClick={() => setShowRules(false)}>Back to table</button>
          </div>
        </section>
      </div>}
      {confirmRestart && <div className="modal-backdrop" onClick={() => setConfirmRestart(false)}>
        <section className="game-modal" role="dialog" aria-modal="true" aria-label="Confirm next round"
          onClick={e => e.stopPropagation()}>
          <div className="eyebrow">FRESH SHUFFLE</div><h2>Another round?</h2>
          <p>{drill ? "Repeat the same isolated practice drill?" : mode === "local" ? "Start a fresh local game against the bots?" : g.roundLimit ? "Ready for the next round? The cards are dealt only after every human player confirms." : "Keep the same players and room, and deal a new round?"} {!drill && g.finishedOrder.length > 0 ? `${nameForSeat(g.finishedOrder[0])} starts the next round.` : ""}</p>
          <div className="button-group">
            <button className="secondary-button" onClick={() => setConfirmRestart(false)}>Cancel</button>
            <button className="primary-button" onClick={() => {setConfirmRestart(false);newRound();}}>Deal again</button>
          </div>
        </section>
      </div>}
      <div className="table-footer"><span>PILEHEADS · The digital tabletop</span>
        </div>
    </main>
  );
}
