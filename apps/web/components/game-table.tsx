"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";
import { createPortal } from "react-dom";
import { playSound } from "../lib/sound";
import { Engine, type Card, type Event, type Game, type Move } from "../lib/engine";
import { backendOrigin, requestRoom, roomMove, sessionKey, type Room, type RoomGame, type Reaction } from "../lib/room";

type Mode = "home" | "local" | "online";
const ACTIONS = ["reset", "ghost", "under", "skip", "burn", "dump"];
const classicHref = `${backendOrigin || "https://stack-card-game-t7vx.onrender.com"}/pilehead/index.html`;
const ACTION_DESCRIPTIONS: Record<string, string> = {
  reset: "Any number can follow", ghost: "Keep the current restriction",
  under: "Next number must be 1–4", skip: "Skip the next player's turn",
  burn: "Burn the pile and play again", dump: "Give the pile to any opponent"
};
const SAVE_KEY = "stack-next-local-save-v1";
const THEME_KEY = "stack-next-deck-theme-v1";
const SOUND_KEY = "stack-next-sound-enabled-v1";
const PRACTICE_KEY = "stack-next-practice-mode-v1";
type DeckTheme = "characters" | "original";
function loadSavedGame(): Game | null {
  try {
    const data = JSON.parse(localStorage.getItem(SAVE_KEY) || "null");
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
  rate_limited: "Too many attempts. Try again shortly.",
  bad_origin: "This game frontend is not authorized by the multiplayer server."
};
const messageForError = (message: string) =>
  ROOM_ERRORS[message] || message.replaceAll("_", " ");
const humanLabel = (n: number) => n === 0 ? "You" : `Bot ${n}`;
const sameFace = (a?: Card, b?: Card) => !!a && !!b &&
  a.kind === b.kind && (a.kind === "number" ? a.rank === b.rank : a.action === b.action);
const cardLabel = (card: Card) => card.kind === "number" ? `Number ${card.rank}` :
  `${card.action?.toUpperCase()}: ${ACTION_DESCRIPTIONS[card.action || ""]}`;
const identicalIds = (left: number[], right: number[]) =>
  left.length === right.length && left.every(id => right.includes(id));

function createGame(players: number): Game {
  const g = Engine.create({ players, seed: Math.floor(Math.random() * 4294967296) });
  for (let seat = 1; seat < players; seat++) Engine.autoSetup(g, seat);
  g.setupReady = Array.from({ length: players }, (_, i) => i !== 0);
  return g;
}

function asLocalRoom(game: Game): RoomGame {
  return {
    phase: game.phase, turn: game.turn, moves: game.moves, round: 1,
    botSeats: game.people.slice(1).map(p => p.seat),
    endgameRule: game.version === Engine.VERSION ? "final-duel" : "classic",
    stockCount: game.stock.length, pile: game.pile, ashesCount: game.ashes.length,
    limit: game.limit, pendingDump: game.pendingDump || null,
    finishedOrder: game.finishedOrder, loser: game.loser,
    players: game.people.map(p => ({
      seat: p.seat, out: p.out, up: p.up, handCount: p.hand.length, hand: p.hand,
      downCount: p.down.length, blindSlots: p.down.map((_, i) => i),
      pickups: p.pickups
    })),
    events: game.events,
    reactions: [],
    blindReveal: game.blindReveal || null,
    legal: game.phase === "play" && game.turn === 0 ? Engine.options(game, 0) : [],
    slam: game.phase === "play" ? Engine.slamOptions(game, 0) : [],
    followup: game.phase === "play" ? Engine.followUpOptions(game, 0) : [],
    setupReady: game.setupReady || []
  };
}

function PlayingCard({ card, hidden = false, selected = false, small = false, onClick, onDrop, disabled = false, theme = "characters",
  description }: {
  card?: Card; hidden?: boolean; selected?: boolean; small?: boolean; theme?: DeckTheme;
  onClick?: () => void; onDrop?: () => void; disabled?: boolean; description?: string;
}) {
  const index = !hidden && card
    ? card.kind === "number" ? (card.rank || 1) - 1 : 10 + ACTIONS.indexOf(card.action || "")
    : -1;
  const gesture = useRef<{x: number; y: number; moved: boolean} | null>(null);
  const blockClick = useRef(false);
  const [floating, setFloating] = useState<{x: number; y: number} | null>(null);
  function pointerDown(e: ReactPointerEvent<HTMLButtonElement>) {
    if (!onDrop || e.button !== 0) return;
    blockClick.current = false;
    gesture.current = { x: e.clientX, y: e.clientY, moved: false };
    e.currentTarget.setPointerCapture(e.pointerId);
  }
  function pointerMove(e: ReactPointerEvent<HTMLButtonElement>) {
    const start = gesture.current;
    if (!start) return;
    if (!start.moved && Math.hypot(e.clientX - start.x, e.clientY - start.y) < 8) return;
    start.moved = true;
    setFloating({ x: e.clientX, y: e.clientY });
  }
  function pointerUp(e: ReactPointerEvent<HTMLButtonElement>) {
    const start = gesture.current;
    if (!start) return;
    gesture.current = null; setFloating(null);
    if (!start.moved) return;
    blockClick.current = true;
    if (document.elementFromPoint(e.clientX, e.clientY)?.closest('[data-drop-target="pile"]'))
      onDrop?.();
  }
  const faceStyle: CSSProperties = index >= 0 ? {
    backgroundPosition: `${(index % 4) * 100 / 3}% ${Math.floor(index / 4) * 100 / 3}%`
  } : {};
  return (
    <motion.div layout="position"
      initial={{ opacity: 0, y: 9, scale: .97 }}
      animate={{ opacity: 1, y: selected ? -13 : 0, scale: 1 }}
      exit={{ opacity: 0, y: -26, scale: .85 }}
      transition={{ type: "spring", stiffness: 460, damping: 36 }}
      className={`playing-card theme-${theme} ${hidden ? "is-back" : ""} ${selected ? "is-selected" : ""} ${small ? "is-small" : ""} ${onClick && !disabled ? "is-interactive" : ""}`}>
      <div aria-hidden="true" className="card-art" style={faceStyle} />
      {onClick && !disabled ? (
        <button type="button" className="card-hit"
          aria-label={description || (hidden ? "Flip a face-down card" : card ? cardLabel(card) : "Card")}
          aria-pressed={selected}
          onPointerDown={pointerDown}
          onPointerMove={pointerMove}
          onPointerUp={pointerUp}
          onPointerCancel={() => { gesture.current = null; setFloating(null); }}
          onClick={e => {
            if (blockClick.current) { blockClick.current = false; e.preventDefault(); return; }
            onClick();
          }} />
      ) : null}
      {floating && createPortal(
        <div className={"drag-ghost theme-" + theme}
          style={{left:floating.x,top:floating.y}} aria-hidden="true">
          <div className="card-art" style={faceStyle} />
        </div>, document.body)}
    </motion.div>
  );
}

function PlayerPosition({ name, seat, active, self, out, handCount, up, downCount, presence, reaction }: {
  name: string; seat: number; active: boolean; self: boolean; out: boolean;
  handCount: number; up: Card[]; downCount: number; presence?: string; reaction?: string;
}) {
  return <div className={`opponent-seat ${active ? "seat-active" : ""} ${out ? "seat-out" : ""}`}
    aria-label={`${name}: ${handCount} in hand, ${up.length} face-up, ${downCount} face-down`}>
    <div className="seat-heading">
      <span className="avatar" aria-hidden="true">{self ? "Y" : String(seat + 1)}</span>
      <div><strong>{name}</strong><small>{out ? "Finished" : presence === "offline" ? "Offline" :
          presence === "away" ? "Away" : active ? "Playing now" : `${handCount} in hand`}</small></div>
      {active && <span className="turn-dot" aria-label="Current turn" />}
      {reaction && <span className="seat-reaction" role="status">{reaction}</span>}
    </div>
    <div className="opponent-card-stack" aria-hidden="true">
      {Array.from({ length: Math.min(5, handCount) }, (_, i) =>
        <span className="hand-back" key={i} style={{ transform: `translateX(${i * 12}px) rotate(${(i - 2) * 5}deg)` }} />)}
      {!handCount && <span className="empty-seat">No hand cards</span>}
    </div>
    <div className="opponent-up">
      {Array.from({ length: Math.max(up.length, downCount) }, (_, i) =>
        <div className="mini-pair" key={i}>
          {i < downCount && <span className="mini-back" />}
          {up[i] && <span className="mini-face" title={cardLabel(up[i])}>
            {up[i].kind === "number" ? up[i].rank : up[i].action?.slice(0, 1).toUpperCase()}
          </span>}
        </div>)}
    </div>
  </div>;
}

function eventText(e: Event | undefined, name: (seat: number) => string) {
  if (!e) return "Choose your move. Every card changes the table.";
  if (e.type === "take" || e.type === "blind-fail") return `${name(e.seat)} picked up the pile`;
  if (e.reason === "burn" || e.burned) return `${name(e.seat)} burned the pile!`;
  if (e.reason === "dump") return `${name(e.seat)} dumped the pile on ${name(e.target ?? -1)}`;
  if (e.type === "slam") return `${name(e.seat)} made a SLAM!`;
  if (e.reason === "snap") return `${name(e.seat)} snapped another card!`;
  if (e.reason === "skip") return `${name(e.seat)} skipped a turn`;
  if (e.reason === "number") return `${name(e.seat)} played ${e.rank}`;
  return `${name(e.seat)} played ${e.reason || "a card"}`;
}

export default function GameTable() {
  const [mode, setMode] = useState<Mode>("home");
  const [local, setLocal] = useState<Game | null>(null);
  const [room, setRoom] = useState<Room | null>(null);
  const [name, setName] = useState("Player");
  const [joinCode, setJoinCode] = useState("");
  const [players, setPlayers] = useState(4);
  const [onlineHumans, setOnlineHumans] = useState(2);
  const [onlineBots, setOnlineBots] = useState(0);
  const [selection, setSelection] = useState<number[]>([]);
  const [swapHand, setSwapHand] = useState<number | null>(null);
  const [needsTarget, setNeedsTarget] = useState(false);
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [resumeGame, setResumeGame] = useState<Game | null>(null);
  const [deckTheme, setDeckTheme] = useState<DeckTheme>("characters");
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [practiceMode, setPracticeMode] = useState(false);
  const [coachDismissed, setCoachDismissed] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [confirmRestart, setConfirmRestart] = useState(false);
  const [undoAvailable, setUndoAvailable] = useState(false);
  const [connected, setConnected] = useState(false);
  const [connectionRetry, setConnectionRetry] = useState(0);
  const [lastSyncAt, setLastSyncAt] = useState(0);
  const [reactionsOpen, setReactionsOpen] = useState(false);
  const [reactionClock, setReactionClock] = useState(0);
  const inFlight = useRef(false);
  const roomRef = useRef<Room | null>(null);
  const tokenRef = useRef<string | null>(null);
  const localRef = useRef<Game | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const undoRef = useRef<Game | null>(null);
  const roomEpoch = useRef(0);
  const lastSoundEvent = useRef<string | null>(null);

  const applyRoom = useCallback((next: Room) => {
    if (roomRef.current?.code === next.code && next.revision < roomRef.current.revision) return;
    // Heartbeats do not invalidate the card scene. Keep DOM/card identity
    // stable unless gameplay, membership or ephemeral public events changed.
    if (roomRef.current?.code === next.code &&
        roomRef.current.revision === next.revision &&
        JSON.stringify(roomRef.current.game) === JSON.stringify(next.game) &&
        JSON.stringify(roomRef.current.members) === JSON.stringify(next.members)) return;
    // An authoritative move supersedes any locally selected cards.
    if (roomRef.current?.code === next.code && next.revision !== roomRef.current.revision) {
      setSelection([]);
      setNeedsTarget(false);
    }
    if (next.session) {
      tokenRef.current = next.session;
      localStorage.setItem(sessionKey(next.code), next.session);
    }
    roomRef.current = next;
    setRoom(next);
    setLastSyncAt(Date.now());
    setMode("online");
    history.replaceState(null, "", `/play?room=${encodeURIComponent(next.code)}`);
  }, []);

  const synchronize = useCallback(async (code: string, token: string, quiet = false) => {
    const epoch = roomEpoch.current;
    try {
      const next = await requestRoom({ action: "state", code, heartbeat: true }, token);
      if (epoch !== roomEpoch.current || (roomRef.current && roomRef.current.code !== code)) return;
      applyRoom(next);
      setLastSyncAt(Date.now());
      if (!quiet) setNotice("");
    } catch (err) {
      if (epoch !== roomEpoch.current) return;
      if (!quiet) setNotice(messageForError(err instanceof Error ? err.message : "network_unavailable"));
    }
  }, [applyRoom]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("room")?.trim().toUpperCase();
    const savedName = localStorage.getItem("stack-next-display-name");
    if (savedName) setName(savedName);
    const savedTheme = localStorage.getItem(THEME_KEY);
    if (savedTheme === "characters" || savedTheme === "original") setDeckTheme(savedTheme);
    setResumeGame(loadSavedGame());
    setSoundEnabled(localStorage.getItem(SOUND_KEY) === "true");
    setPracticeMode(localStorage.getItem(PRACTICE_KEY) === "true");
    if (!code) return;
    setJoinCode(code);
    const token = localStorage.getItem(sessionKey(code));
    if (token) { tokenRef.current = token; void synchronize(code, token); }
  }, [synchronize]);

  const submit = useCallback(async (payload: Record<string, unknown>, noAuth = false) => {
    if (inFlight.current) return;
    inFlight.current = true; setBusy(true); setNotice("");
    const epoch = roomEpoch.current;
    try {
      const next = await requestRoom(payload, noAuth ? null : tokenRef.current);
      if (epoch !== roomEpoch.current) return;
      applyRoom(next);
      setSelection([]); setSwapHand(null); setNeedsTarget(false);
    } catch (err) {
      if (epoch !== roomEpoch.current) return;
      const message = err instanceof Error ? err.message : "network_unavailable";
      setNotice(messageForError(message));
      if (message === "stale_revision" && roomRef.current && tokenRef.current) {
        const code = roomRef.current.code, token = tokenRef.current;
        try {
          const fresh = await requestRoom({ action: "state", code, heartbeat: true }, token);
          if (epoch !== roomEpoch.current) return;
          applyRoom(fresh);
          // Safe repeatable lobby operations must not become a manual race
          // between guests. NEVER silently retry a card move, SNAP or SLAM.
          if (payload.action === "ready" || payload.action === "swap") {
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
  }, [applyRoom, synchronize]);

  // Store only local bot matches. Online secrets/state stay in their existing
  // per-room storage; never persist another player's private cards.
  useEffect(() => {
    if (mode !== "local" || !local) return;
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify({ version: 1, game: local }));
      setResumeGame(local);
    } catch { /* private browsing/quota: current match remains playable */ }
  }, [mode, local]);
  useEffect(() => {
    try { localStorage.setItem(THEME_KEY, deckTheme); } catch {}
  }, [deckTheme]);
  useEffect(() => {
    try { localStorage.setItem(SOUND_KEY, String(soundEnabled)); } catch {}
  }, [soundEnabled]);
  useEffect(() => {
    if (mode !== "local" || !local) return;
    try { localStorage.setItem(PRACTICE_KEY, String(practiceMode)); } catch {}
  }, [mode, local, practiceMode]);

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
      retryTimer = setTimeout(() => setConnectionRetry(n => n + 1), 3500);
      return () => { cancelled = true; if (retryTimer) clearTimeout(retryTimer); };
    }
    wsRef.current = ws;
    ws.onopen = () => ws.send(JSON.stringify({ type: "auth", code, token }));
    ws.onmessage = ev => {
      try {
        const packet = JSON.parse(ev.data);
        if (packet.type === "ready") { setConnected(true); void synchronize(code, token, true); }
        if (packet.type === "reaction" && packet.reaction) applyReaction(packet.reaction as Reaction);
        if (packet.type === "reaction-error") setNotice("Reactions are limited. Try again soon.");
        if (packet.type === "invalidate" &&
            (packet.force || packet.revision > (roomRef.current?.revision ?? -1))) {
          void synchronize(code, token, true);
        }
      } catch { /* transport errors are recovered by polling */ }
    };
    ws.onclose = () => {
      if (cancelled) return;
      setConnected(false);
      retryTimer = setTimeout(() => setConnectionRetry(n => n + 1), 3500);
    };
    ws.onerror = () => setConnected(false);
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
    return () => clearInterval(interval);
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

  // A human SNAP is a legal interrupt, not a new turn. Do not re-arm the
  // next bot's timer when that interrupt increments the move counter.
  const localBotKey = (() => {
    if (mode !== "local" || !local || local.phase !== "play") return null;
    const seat = local.pendingDump?.seat ?? local.turn;
    if (seat === 0) return null;
    const lastNormalMove = [...local.events].reverse().find(e => e.type !== "followup");
    return `${seat}:${local.pendingDump?.seat ?? "none"}:${lastNormalMove?.move ?? 0}`;
  })();
  useEffect(() => {
    if (!localBotKey) return;
    const timer = window.setTimeout(() => {
      commitLocal(g => {
        const current = g.pendingDump?.seat ?? g.turn;
        if (current === 0 || g.phase !== "play") return;
        if (g.pendingDump) Engine.resolveDump(g, current, Engine.botDumpTarget(g, current));
        else {
          const snap = Engine.followUpOptions(g, current)[0];
          const slam = Engine.slamOptions(g, current)[0];
          Engine.move(g, current, snap || slam || Engine.choose(g, current));
        }
      });
    }, 680);
    return () => clearTimeout(timer);
  }, [localBotKey, commitLocal]);

  // Human-triggered bot advance remains server-authoritative in online rooms.
  useEffect(() => {
    if (mode !== "online" || !room || room.game.phase !== "play" || busy) return;
    const g = room.game;
    if (!(g.botSeats.includes(g.pendingDump?.seat ?? g.turn) || g.botFollowupReady || g.botSlamReady)) return;
    const timer = setTimeout(() => {
      const latest = roomRef.current;
      if (latest && !inFlight.current) void submit({
        action: "advance", code: latest.code, revision: latest.revision
      });
    }, 750);
    return () => clearTimeout(timer);
  }, [mode, room?.revision, room?.game.turn, room?.game.phase, room?.game.botFollowupReady,
    room?.game.botSlamReady, room?.game.pendingDump?.seat, busy, submit]);

  const g = useMemo(() => mode === "local" && local ? asLocalRoom(local) : mode === "online" ? room?.game : null,
    [mode, local, room]);
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
  const lastEvent = g?.events.at(-1);
  const soundEventId = lastEvent ? String(g?.round || 1) + ":" +
    lastEvent.move + ":" + lastEvent.seat + ":" + lastEvent.type : null;
  useEffect(() => {
    if (!soundEventId) { lastSoundEvent.current = null; return; }
    if (lastSoundEvent.current !== null && lastSoundEvent.current !== soundEventId && soundEnabled) {
      if (g?.phase === "over") playSound("win");
      else if (lastEvent?.reason === "burn" || lastEvent?.burned) playSound("burn");
      else if (lastEvent?.reason === "snap" || lastEvent?.type === "followup" ||
        lastEvent?.type === "slam") playSound("snap");
      else if (lastEvent?.type === "take" || lastEvent?.type === "blind-fail" ||
        lastEvent?.reason === "dump") playSound("take");
      else playSound("play");
    }
    lastSoundEvent.current = soundEventId;
  }, [soundEventId, soundEnabled, g?.phase, lastEvent?.reason, lastEvent?.burned, lastEvent?.type]);
  const stage = current ? current.handCount || g?.stockCount ? "hand" :
    current.up.length ? "up" : current.downCount ? "down" : "out" : "out";
  const active = g?.phase === "play" && g.turn === me && !g.pendingDump;
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
    if (soundEnabled) playSound("select");
    setNotice("");
    setSelection(prev => {
      if (prev.includes(card.id)) return prev.filter(id => id !== card.id);
      const cards = prev.map(id => [...(current?.hand || []), ...(current?.up || [])].find(c => c.id === id));
      return cards.length && !cards.every(c => sameFace(c, card)) ? [card.id] : [...prev, card.id];
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
    const ids = selection.includes(card.id) ? selection : [card.id];
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

  function startLocalGame(withCoach = practiceMode) {
    roomEpoch.current++;
    setPracticeMode(withCoach);
    setCoachDismissed(false);
    const game = createGame(withCoach ? 2 : players);
    localRef.current = game;
    undoRef.current = null; setUndoAvailable(false);
    setLocal(game); setRoom(null); setMode("local"); setSelection([]); setNotice("");
  }

  function newRound() {
    if (mode === "local") startLocalGame(practiceMode);
    else if (room) void submit({ action: "rematch", code: room.code, revision: room.revision });
  }

  function resumeLocal() {
    roomEpoch.current++;
    const saved = loadSavedGame();
    if (!saved) { setResumeGame(null); setNotice("Saved game is unavailable."); return; }
    localRef.current = saved; undoRef.current = null; setUndoAvailable(false);
    setPracticeMode(localStorage.getItem(PRACTICE_KEY) === "true");
    setCoachDismissed(false);
    setLocal(saved); setRoom(null); setMode("local"); setSelection([]); setNotice("");
    history.replaceState(null, "", "/play");
  }

  function leaveTable() {
    roomEpoch.current++;
    if (wsRef.current) wsRef.current.close();
    setMode("home"); setLocal(null); setRoom(null); roomRef.current = null;
    tokenRef.current = null; setBusy(false); inFlight.current = false;
    setConnected(false); setConfirmRestart(false); setShowRules(false);
    setSelection([]); setNotice("");
    history.replaceState(null, "", "/play");
  }

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (showRules || confirmRestart || needsTarget || selection.length) {
          event.preventDefault();
          setShowRules(false); setConfirmRestart(false); setNeedsTarget(false); setSelection([]);
        }
        return;
      }
      if (showRules || confirmRestart || event.altKey || event.metaKey || event.ctrlKey) return;
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
  }, [showRules, confirmRestart, needsTarget, selection.length]);

  useEffect(() => {
    if (!showRules && !confirmRestart) return;
    const previous = document.activeElement as HTMLElement | null;
    const dialog = document.querySelector<HTMLElement>('[role="dialog"]');
    const buttons = [...(dialog?.querySelectorAll<HTMLButtonElement>("button:not(:disabled)") || [])];
    buttons[0]?.focus();
    const trap = (event: KeyboardEvent) => {
      if (event.key !== "Tab" || !buttons.length) return;
      const first = buttons[0], last = buttons[buttons.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault(); last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault(); first.focus();
      }
    };
    dialog?.addEventListener("keydown", trap);
    return () => { dialog?.removeEventListener("keydown", trap); previous?.focus?.(); };
  }, [showRules, confirmRestart]);

  async function createOnlineRoom() {
    if (onlineHumans + onlineBots < 2 || onlineHumans + onlineBots > 5) {
      setNotice("Choose 2–5 seats in total."); return;
    }
    localStorage.setItem("stack-next-display-name", name);
    await submit({ action: "create", name, humans: onlineHumans, bots: onlineBots }, true);
  }

  async function joinOnlineRoom() {
    localStorage.setItem("stack-next-display-name", name);
    await submit({ action: "join", name, code: joinCode.trim().toUpperCase() }, true);
  }

  if (!g || !current) return (
    <main className="game-shell">
      <header className="game-header"><Link href="/" className="logo">STACK<span>.</span></Link>
        <span className="beta-tag">NEXT TABLE · PREVIEW</span></header>
      <section className="entry">
        <div className="entry-intro"><div className="eyebrow">WELCOME TO THE TABLE</div>
          <h1>One pile.<br /><em>One loser.</em></h1>
          <p>Play the real STACK rules with a refreshed, tactile React tabletop. Your original Classic game stays untouched.</p>
          <a href={classicHref} className="subtle-link">Open original Classic ↗</a>
        </div>
        <div className="entry-options">
          {resumeGame && <div className="resume-panel">
            <div><div className="eyebrow">SAVED LOCAL MATCH</div>
              <strong>Pick up where you left off</strong>
              <p>{resumeGame.phase === "over" ? "Last round finished" : `${resumeGame.moves} moves · ${resumeGame.people.length} players`}</p>
            </div>
            <button className="secondary-button" onClick={resumeLocal}>Resume game</button>
          </div>}
          <div className="mode-card">
            <div className="eyebrow">PRACTICE</div><h2>Play with bots</h2>
            <p>Local, instant, no account required.</p>
            <label>Players <select value={players} onChange={e => setPlayers(Number(e.target.value))}>
              {[2, 3, 4, 5].map(n => <option key={n} value={n}>{n} players</option>)}
            </select></label>
            <button className="cta" onClick={() => startLocalGame(false)}>Start game <span aria-hidden>→</span></button>
            <button className="learn-button" onClick={() => startLocalGame(true)}>Learn with a bot</button>
          </div>
          <div className="mode-card">
            <div className="eyebrow">WITH FRIENDS</div><h2>Private room</h2>
            <p>Invite real players, fill empty seats with bots.</p>
            <label>Your name <input maxLength={24} value={name} onChange={e => setName(e.target.value)} /></label>
            <div className="field-pair"><label>Humans <select value={onlineHumans} onChange={e => setOnlineHumans(Number(e.target.value))}>
              {[1, 2, 3, 4, 5].map(n => <option key={n}>{n}</option>)}
            </select></label><label>Bots <select value={onlineBots} onChange={e => setOnlineBots(Number(e.target.value))}>
              {[0, 1, 2, 3, 4].map(n => <option key={n}>{n}</option>)}
            </select></label></div>
            <button className="cta" disabled={busy || !name.trim()} onClick={() => void createOnlineRoom()}>
              {busy ? "Connecting…" : "Create a room"} <span aria-hidden>→</span></button>
            <div className="join-row"><input aria-label="Room code" maxLength={8} placeholder="8-letter room code"
              value={joinCode} onChange={e => setJoinCode(e.target.value.toUpperCase())} />
              <button disabled={busy || joinCode.length !== 8 || !name.trim()} onClick={() => void joinOnlineRoom()}>Join</button></div>
          </div>
        </div>
      </section>
      {notice && <div className="alert" role="status">{notice}</div>}
    </main>
  );

  const liveSeats = g.players.filter(p => !p.out && p.seat !== me).map(p => p.seat);
  const canPlay = !!legal.find(m => m.type === "play" && m.source !== "down" && identicalIds(m.ids || [], selection));
  const canTake = legal.some(m => m.type === "take");
  const rule = g.limit?.type === "under" ? "Next number: 1–4" : g.limit?.type === "min"
    ? `Next number: ${g.limit.value} or higher` : "Any number can follow";
  const finalDuel = g.endgameRule === "final-duel" && g.phase === "play" &&
    g.stockCount === 0 && g.players.filter(p => !p.out).length === 2;
  const coachText = g.phase === "setup" ?
    "Choose three face-up cards. Tap a hand card, then a face-up card to swap. Auto arrange can help." :
    g.moves === 0 ?
    "Your first move: select a card in your hand, then Play cards. You can also drag it onto the pile." :
    !active ? "Watch the bot's move. SNAP and SLAM opportunities can interrupt a turn." :
    g.stockCount > 0 ? "Play numbers at least as high as the restriction. Your hand refills to three while the deck lasts." :
    stage === "hand" ? "The deck is empty. Empty your hand to uncover your face-up cards." :
    stage === "up" ? "Play your visible face-up cards before touching the blind cards." :
    stage === "down" ? "Flip a blind card and hope it plays. An invalid flip makes you collect the pile." :
    "Keep an eye on the pile and your opponents.";
  const ready = !!g.setupReady[me];
  const allReady = g.setupReady.every(Boolean);
  const joined = mode === "local" ? true : room?.members.length === g.players.length - g.botSeats.length;

  return (
    <main className="game-shell">
      <header className="game-header">
        <Link href="/" className="logo">STACK<span>.</span></Link>
        <div className="game-head-actions">
          {room && <button className="room-code" onClick={() => void navigator.clipboard.writeText(
            `${window.location.origin}/play?room=${room.code}`)} title="Copy invitation link">ROOM {room.code} <span>Copy invite</span></button>}
          {mode === "online" && <span className={`connection-chip ${connected ? "is-online" : "is-offline"}`}
            title={`Last sync: ${lastSyncAt ? new Date(lastSyncAt).toLocaleTimeString() : "pending"}`}
            role="status">{connected ? "Live" : "Reconnecting"}</span>}
          <span className="beta-tag">REACT TABLE · PREVIEW</span>
          <button className="exit-button" onClick={() => setShowRules(true)}>Rules</button>
          <label className="theme-control">Deck
            <select aria-label="Deck style" value={deckTheme}
              onChange={e => setDeckTheme(e.target.value as DeckTheme)}>
              <option value="characters">Characters</option><option value="original">Original</option>
            </select>
          </label>
          <button className="exit-button" onClick={leaveTable}>Leave table</button>
        </div>
      </header>
      <section className="game-meta">
        <div><div className="eyebrow">{g.phase === "setup" ? "SET YOUR TABLE" : g.phase === "over" ? "ROUND COMPLETE" : "GAME IN PROGRESS"}</div>
          <h1>{g.phase === "over" ? `${nameForSeat(g.loser ?? -1)} is the PILEHEAD!` :
            g.phase === "setup" ? "Choose your opening cards" :
            active ? "Your move." : `${nameForSeat(g.turn)} is playing.`}</h1></div>
        <div className="meta-right"><span>{g.moves} moves</span><span>{g.players.length} players</span></div>
      </section>
      {mode === "local" && practiceMode && !coachDismissed && g.phase !== "over" &&
        <aside className="coach-tip" aria-label="Learning coach">
          <div><strong>LEARN BY PLAYING</strong><span aria-live="polite">{coachText}</span></div>
          <button type="button" onClick={() => setCoachDismissed(true)}>Hide tips</button>
        </aside>}

      <div className="tabletop" role="region" aria-label="STACK card game">
        <div className="table-texture" aria-hidden="true" />
        <div className="opponents-row">
          {g.players.filter(p => p.seat !== me).map(p =>
            <PlayerPosition key={p.seat} seat={p.seat} name={nameForSeat(p.seat)} self={false} out={p.out}
              active={g.phase === "play" && g.turn === p.seat}
              handCount={p.handCount} up={p.up} downCount={p.downCount}
              presence={room?.members.find(m => m.seat === p.seat)?.presence}
              reaction={newestReactions.filter(r => r.seat === p.seat).slice(-1)
                .map(r => reactionSymbols[r.kind]).join("")} />)}
        </div>
        <div className="table-center">
          <div className="pile-zone">
            <span className="pile-title">DRAW DECK</span>
            <div className="pile-slot">
              {g.stockCount > 0 ? <PlayingCard hidden theme={deckTheme} /> : <div className="slot-empty">Empty</div>}
              {g.stockCount > 1 && <span className="stack-depth" />}
            </div>
            <span className="pile-counter">{g.stockCount} cards</span>
          </div>
          <div className="pile-zone is-main">
            <span className="pile-title">PLAY PILE</span>
            <div className={"pile-slot played " + (selection.length ? "is-drop-ready" : "")}
              data-drop-target="pile" role="button" tabIndex={0}
              aria-label="Play selected cards onto the pile"
              aria-disabled={!canPlay || busy}
              onClick={() => { if (selection.length && !busy) playSelected(); }}
              onKeyDown={e => {
                if ((e.key === "Enter" || e.key === " ") && selection.length && !busy) {
                  e.preventDefault(); playSelected();
                }
              }}>
              <AnimatePresence initial={false}>
                {g.pile.slice(-4).map((card, i) => <div key={card.id}
                  className="pile-layer" style={{ transform: `translate(${(i - 1.5) * 6}px, ${(i - 1.5) * -2}px) rotate(${(i - 1.5) * 3}deg)` }}>
                  <PlayingCard card={card} theme={deckTheme} />
                </div>)}
              </AnimatePresence>
              {!g.pile.length && <div className="slot-empty">Pile clear</div>}
            </div>
            <span className="pile-counter">{g.pile.length} cards · {rule}</span>
          </div>
          <div className="pile-zone">
            <span className="pile-title">BURNED</span>
            <div className="pile-slot burned"><span className="burn-mark" aria-hidden="true">✕</span></div>
            <span className="pile-counter">{g.ashesCount} removed</span>
          </div>
        </div>

        {showFlip && face && <div className="blind-flip" role="status">
          <PlayingCard card={{ ...face.card, id: -1, rank: face.card.rank ?? undefined,
            action: face.card.action ?? undefined }} theme={deckTheme} small />
          <div><strong>{nameForSeat(face.seat)} flipped a blind card</strong>
            <span>{face.card.kind === "number" ? "Number " + face.card.rank :
              face.card.action?.toUpperCase()}</span></div>
        </div>}
        {finalDuel && <div className="duel-banner" role="status">
          <strong>FINAL DUEL</strong><span>Every pickup burns the visible top card first.</span>
        </div>}
        <div className="event-banner" role="status" aria-live="polite">
          <span className="event-spark" aria-hidden="true" />
          {eventText(g.events.at(-1), nameForSeat)}
        </div>

        <div className="player-zones">
          <div className="zone-heading"><strong>YOUR FACE-UP CARDS</strong><span>{current.up.length} cards · {current.downCount} blind</span></div>
          <div className="faceup-row">
            {Array.from({ length: Math.max(current.up.length, current.downCount) }, (_, index) => {
              const upCard = current.up[index];
              const canUp = g.phase === "setup" ? !ready : active &&
                (stage === "up" || (stage === "hand" && g.stockCount === 0));
              return <div className="faceup-pair" key={index}>
                {index < current.downCount && <div className="blind-under">
                  <PlayingCard hidden theme={deckTheme} onClick={stage === "down" && active ? () => clickBlind(index) : undefined} />
                </div>}
                {upCard && <div className="visible-up">
                  <PlayingCard card={upCard} theme={deckTheme} selected={selection.includes(upCard.id)}
                    onClick={canUp ? () => g.phase === "setup" ? swap(upCard, "up") : chooseCard(upCard) : undefined}
                    onDrop={canUp && g.phase === "play" ? () => playCardDirect(upCard) : undefined} />
                </div>}
              </div>;
            })}
          </div>
          <div className="zone-heading hand-heading"><strong>YOUR HAND</strong>
            <span>{g.phase === "setup" ? "Select a hand card, then a face-up card to swap" :
              stage === "hand" ? "Tap matching cards to build a group" : "Finish your visible cards first"}</span></div>
          <div className="player-hand">
            <AnimatePresence initial={false}>
              {(current.hand || []).map(card =>
                <PlayingCard key={card.id} card={card} theme={deckTheme} selected={selection.includes(card.id) || swapHand === card.id}
                  onClick={g.phase === "setup" ? (!ready ? () => swap(card, "hand") : undefined) :
                    (active || g.followup.length > 0) && stage === "hand" ? () => chooseCard(card) : undefined}
                  onDrop={active && stage === "hand" ? () => playCardDirect(card) : undefined} />)}
            </AnimatePresence>
            {!current.handCount && <span className="hand-placeholder">No cards in hand</span>}
          </div>
        </div>
        {g.phase === "over" && <motion.section className="results-overlay"
          initial={{opacity:0, y:20, scale:.96}}
          animate={{opacity:1,y:0,scale:1}}
          transition={{type:"spring",stiffness:220,damping:25}}
          role="region" aria-label="Round results">
          <div className="eyebrow">ROUND COMPLETE</div>
          <h2>{g.loser === me ? "You're the PILEHEAD!" : "You escaped the pile!"}</h2>
          <p>The cards are down. Here is how everyone finished.</p>
          <ol className="results-standings">
            {[...g.finishedOrder, ...(g.loser === null ? [] : [g.loser])].map((seat, index) =>
              <li key={seat} className={seat === g.loser ? "results-loser" : ""}>
                <span>{index + 1}</span><strong>{nameForSeat(seat)}</strong>
                <small>{seat === g.loser ? "PILEHEAD" : index === 0 ? "First out" : "Escaped"}</small>
              </li>)}
          </ol>
          <div className="results-stats"><span>{g.moves} plays</span>
            <span>{g.ashesCount} cards burned</span><span>{g.players.length} players</span></div>
        </motion.section>}
      </div>

      <div className="control-panel" aria-label="Game actions">
        {g.phase === "setup" ? (
          <div className="setup-controls">
            <div><strong>{mode === "online" ? `${room?.members.length || 0} joined · ${g.players.length - g.botSeats.length} humans required` : "Set up your cards"}</strong>
              <p>{ready ? "Waiting for players to be ready" : "Choose the three cards to leave face-up."}</p></div>
            {mode === "local" ? <div className="button-group">
              <button className="secondary-button" onClick={() => commitLocal(game => Engine.autoSetup(game, 0))}>Auto arrange</button>
              <button className="primary-button" onClick={() => commitLocal(game => Engine.start(game))}>Start round</button></div> :
              <div className="button-group">
                <button className="secondary-button" disabled={busy}
                  onClick={() => room && void submit({ action: "ready", ready: !ready,
                    code: room.code, revision: room.revision })}>{ready ? "Change cards" : "I'm ready"}</button>
                {room?.host && <button className="primary-button" disabled={busy || !allReady || !joined}
                  onClick={() => void submit({ action: "start", code: room.code, revision: room.revision })}>Start round</button>}
              </div>}
          </div>
        ) : g.phase === "over" ? <div className="setup-controls">
          <div><strong>Game over</strong><p>First out: {nameForSeat(g.finishedOrder[0] ?? -1)}</p></div>
          <div className="button-group">
            {mode === "local" && undoAvailable &&
              <button className="secondary-button" data-hotkey="undo" onClick={undo}>Undo last move</button>}
            <button className="primary-button" disabled={busy}
              onClick={() => setConfirmRestart(true)}>Play another round</button>
          </div>
        </div> : g.pendingDump?.seat === me ? <div className="setup-controls">
          <div><strong>Choose who takes the pile</strong><p>DUMP can target any active opponent.</p></div>
          <div className="button-group">{liveSeats.map(seat =>
            <button className="primary-button" key={seat} disabled={busy} onClick={() =>
              mode === "local" ? commitLocal(game => Engine.resolveDump(game, me, seat)) :
                room && void submit({ action: "dump-target", code: room.code, revision: room.revision, target: seat })
            }>{nameForSeat(seat)}</button>)}</div>
        </div> : needsTarget ? <div className="setup-controls">
          <div><strong>Choose a DUMP target</strong><p>Who should pick up the pile?</p></div>
          <div className="button-group">
            {liveSeats.map(seat => <button key={seat} className="primary-button"
              onClick={() => playSelected(seat)}>{nameForSeat(seat)}</button>)}
            <button className="secondary-button" onClick={() => setNeedsTarget(false)}>Cancel</button>
          </div>
        </div> : (
          <div className="play-controls">
            <div className="selection-note">{selectedCards.length ?
              <><strong>{selectedCards.length} selected</strong><span>{selectedAction ? ACTION_DESCRIPTIONS[selectedAction] : cardLabel(selectedCards[0])}</span></> :
              <><strong>{active ? "Your turn" : `Waiting for ${nameForSeat(g.turn)}`}</strong>
                <span>{active ? "Select one or more matching cards." : "Watch for a SNAP or SLAM opportunity."}</span></>}</div>
            <div className="button-group">
              {mode === "online" && <div className="reaction-menu">
                <button className="secondary-button reaction-trigger"
                  aria-expanded={reactionsOpen} aria-label="Send a reaction"
                  onClick={() => setReactionsOpen(open => !open)}>React</button>
                {reactionsOpen && <div className="reaction-picker" role="group" aria-label="Choose a reaction">
                  {(Object.keys(reactionSymbols) as Reaction["kind"][]).map(kind =>
                    <button key={kind} title={kind} aria-label={"React " + kind}
                      onClick={() => void sendReaction(kind)}>{reactionSymbols[kind]}</button>)}
                </div>}
              </div>}
              {mode === "local" && undoAvailable && <button className="secondary-button" data-hotkey="undo" onClick={undo}>Undo</button>}
              {!!g.followup.length && <button className="snap-button" data-hotkey="snap" disabled={busy}
                onClick={() => playMove(g.followup[0])}>SNAP</button>}
              {!!g.slam.length && <button className="slam-button" data-hotkey="slam" disabled={busy}
                onClick={() => playMove(g.slam[0])}>SLAM</button>}
              <button className="secondary-button" data-hotkey="take" disabled={busy || !canTake}
                onClick={() => playMove({ type: "take" })}>Take pile</button>
              <button className="primary-button" data-hotkey="play" disabled={busy || !active || !canPlay}
                onClick={() => playSelected()}>Play cards <span aria-hidden>→</span></button>
            </div>
          </div>
        )}
      </div>
      {notice && <div className="alert" role="alert">{notice}</div>}
      {showRules && <div className="modal-backdrop" role="presentation" onClick={() => setShowRules(false)}>
        <section className="game-modal" role="dialog" aria-modal="true" aria-label="STACK quick rules"
          onClick={e => e.stopPropagation()}>
          <div className="eyebrow">HOW TO PLAY</div><h2>One pile. One loser.</h2>
          <p>Play a number equal to or higher than the current restriction, or play any special card.
            Keep three cards in hand while the draw deck lasts. Empty your hand, then your face-up cards,
            then flip your face-down cards without looking. The last player with cards loses.</p>
          <div className="quick-rules">{ACTIONS.map(action => <div key={action}>
            <strong>{action.toUpperCase()}</strong><span>{ACTION_DESCRIPTIONS[action]}</span>
          </div>)}</div>
          <p><strong>SNAP:</strong> A matching number you just drew may be played until another player acts.
            <strong> SLAM:</strong> Complete four matching numbers to burn the pile. <strong>Final Duel:</strong> When
            only two players remain and the deck is empty, the top card burns before pile pickup.</p>
          <div className="button-group">
            <button className="secondary-button" aria-pressed={soundEnabled}
              onClick={() => {
                setSoundEnabled(enabled => !enabled);
                // Unlock browser audio on the explicit click when turning it on.
                if (!soundEnabled) playSound("select");
              }}>{soundEnabled ? "Sound on" : "Sound off"}</button>
            <button className="primary-button" onClick={() => setShowRules(false)}>Back to table</button>
          </div>
        </section>
      </div>}
      {confirmRestart && <div className="modal-backdrop" onClick={() => setConfirmRestart(false)}>
        <section className="game-modal" role="dialog" aria-modal="true" aria-label="Confirm next round"
          onClick={e => e.stopPropagation()}>
          <div className="eyebrow">FRESH SHUFFLE</div><h2>Another round?</h2>
          <p>{mode === "local" ? "Start a fresh local game against the bots?" : "Keep the same players and room, and deal a new round?"}</p>
          <div className="button-group">
            <button className="secondary-button" onClick={() => setConfirmRestart(false)}>Cancel</button>
            <button className="primary-button" onClick={() => {setConfirmRestart(false);newRound();}}>Deal again</button>
          </div>
        </section>
      </div>}
      <div className="table-footer"><span>STACK · React tabletop migration preview</span>
        <a href={classicHref}>Original Classic ↗</a></div>
    </main>
  );
}
