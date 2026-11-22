"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { Engine, type Card, type Event, type Game, type Move } from "../lib/engine";
import { backendOrigin, requestRoom, roomMove, sessionKey, type Room, type RoomGame } from "../lib/room";

type Mode = "home" | "local" | "online";
const ACTIONS = ["reset", "ghost", "under", "skip", "burn", "dump"];
const classicHref = `${backendOrigin || "https://stack-card-game-t7vx.onrender.com"}/pilehead/index.html`;
const ACTION_DESCRIPTIONS: Record<string, string> = {
  reset: "Any number can follow", ghost: "Keep the current restriction",
  under: "Next number must be 1–4", skip: "Skip the next player's turn",
  burn: "Burn the pile and play again", dump: "Give the pile to any opponent"
};
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
    stockCount: game.stock.length, pile: game.pile, ashesCount: game.ashes.length,
    limit: game.limit, pendingDump: game.pendingDump || null,
    finishedOrder: game.finishedOrder, loser: game.loser,
    players: game.people.map(p => ({
      seat: p.seat, out: p.out, up: p.up, handCount: p.hand.length, hand: p.hand,
      downCount: p.down.length, blindSlots: p.down.map((_, i) => i),
      pickups: p.pickups
    })),
    events: game.events,
    legal: game.phase === "play" && game.turn === 0 ? Engine.options(game, 0) : [],
    slam: game.phase === "play" ? Engine.slamOptions(game, 0) : [],
    followup: game.phase === "play" ? Engine.followUpOptions(game, 0) : [],
    setupReady: game.setupReady || []
  };
}

function PlayingCard({ card, hidden = false, selected = false, small = false, onClick, disabled = false,
  description }: {
  card?: Card; hidden?: boolean; selected?: boolean; small?: boolean;
  onClick?: () => void; disabled?: boolean; description?: string;
}) {
  const index = !hidden && card
    ? card.kind === "number" ? (card.rank || 1) - 1 : 10 + ACTIONS.indexOf(card.action || "")
    : -1;
  const faceStyle: CSSProperties = index >= 0 ? {
    backgroundPosition: `${(index % 4) * 100 / 3}% ${Math.floor(index / 4) * 100 / 3}%`
  } : {};
  return (
    <motion.div layout="position"
      initial={{ opacity: 0, y: 9, scale: .97 }}
      animate={{ opacity: 1, y: selected ? -13 : 0, scale: 1 }}
      exit={{ opacity: 0, y: -26, scale: .85 }}
      transition={{ type: "spring", stiffness: 460, damping: 36 }}
      className={`playing-card ${hidden ? "is-back" : ""} ${selected ? "is-selected" : ""} ${small ? "is-small" : ""} ${onClick && !disabled ? "is-interactive" : ""}`}>
      <div aria-hidden="true" className="card-art" style={faceStyle} />
      {onClick && !disabled ? (
        <button type="button" className="card-hit"
          aria-label={description || (hidden ? "Flip a face-down card" : card ? cardLabel(card) : "Card")}
          aria-pressed={selected}
          onClick={onClick} />
      ) : null}
    </motion.div>
  );
}

function PlayerPosition({ name, seat, active, self, out, handCount, up, downCount }: {
  name: string; seat: number; active: boolean; self: boolean; out: boolean;
  handCount: number; up: Card[]; downCount: number;
}) {
  return <div className={`opponent-seat ${active ? "seat-active" : ""} ${out ? "seat-out" : ""}`}
    aria-label={`${name}: ${handCount} in hand, ${up.length} face-up, ${downCount} face-down`}>
    <div className="seat-heading">
      <span className="avatar" aria-hidden="true">{self ? "Y" : String(seat + 1)}</span>
      <div><strong>{name}</strong><small>{out ? "Finished" : active ? "Playing now" : `${handCount} in hand`}</small></div>
      {active && <span className="turn-dot" aria-label="Current turn" />}
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
  const inFlight = useRef(false);
  const roomRef = useRef<Room | null>(null);
  const tokenRef = useRef<string | null>(null);
  const localRef = useRef<Game | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  const applyRoom = useCallback((next: Room) => {
    if (roomRef.current?.code === next.code && next.revision < roomRef.current.revision) return;
    if (next.session) {
      tokenRef.current = next.session;
      localStorage.setItem(sessionKey(next.code), next.session);
    }
    roomRef.current = next;
    setRoom(next);
    setMode("online");
    history.replaceState(null, "", `/play?room=${encodeURIComponent(next.code)}`);
  }, []);

  const synchronize = useCallback(async (code: string, token: string, quiet = false) => {
    try {
      const next = await requestRoom({ action: "state", code, heartbeat: true }, token);
      applyRoom(next);
      if (!quiet) setNotice("");
    } catch (err) {
      if (!quiet) setNotice(err instanceof Error ? err.message : "Unable to restore room");
    }
  }, [applyRoom]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("room")?.trim().toUpperCase();
    const savedName = localStorage.getItem("stack-next-display-name");
    if (savedName) setName(savedName);
    if (!code) return;
    setJoinCode(code);
    const token = localStorage.getItem(sessionKey(code));
    if (token) { tokenRef.current = token; void synchronize(code, token); }
  }, [synchronize]);

  const submit = useCallback(async (payload: Record<string, unknown>, noAuth = false) => {
    if (inFlight.current) return;
    inFlight.current = true; setBusy(true); setNotice("");
    try {
      const next = await requestRoom(payload, noAuth ? null : tokenRef.current);
      applyRoom(next);
      setSelection([]); setSwapHand(null); setNeedsTarget(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Network request failed";
      setNotice(message === "stale_revision" ? "Someone moved first. Updating the table…" : message.replaceAll("_", " "));
      if (message === "stale_revision" && roomRef.current && tokenRef.current) {
        await synchronize(roomRef.current.code, tokenRef.current, true);
      }
    } finally { inFlight.current = false; setBusy(false); }
  }, [applyRoom, synchronize]);

  // Revision invalidations arrive over WebSocket. HTTP is the source of truth.
  useEffect(() => {
    if (mode !== "online" || !room?.code || !tokenRef.current) return;
    const code = room.code, token = tokenRef.current;
    const wsUrl = new URL(`${backendOrigin || window.location.origin}/api/pilehead/live`);
    wsUrl.protocol = wsUrl.protocol === "https:" ? "wss:" : "ws:";
    let ws: WebSocket;
    try { ws = new WebSocket(wsUrl.toString()); } catch { return; }
    wsRef.current = ws;
    ws.onopen = () => ws.send(JSON.stringify({ type: "auth", code, token }));
    ws.onmessage = ev => {
      try {
        const packet = JSON.parse(ev.data);
        if (packet.type === "invalidate" && (packet.force || packet.revision > (roomRef.current?.revision ?? -1))) {
          void synchronize(code, token, true);
        }
      } catch { /* malformed transport message: next poll will recover */ }
    };
    const interval = window.setInterval(() => void synchronize(code, token, true), 3500);
    return () => { clearInterval(interval); ws.close(); if (wsRef.current === ws) wsRef.current = null; };
  }, [mode, room?.code, synchronize]);

  const commitLocal = useCallback((change: (g: Game) => void) => {
    setLocal(prev => {
      if (!prev) return prev;
      try {
        const next = structuredClone(prev);
        change(next);
        Engine.invariant(next);
        localRef.current = next;
        return next;
      } catch (err) {
        setNotice(err instanceof Error ? err.message : "Invalid action");
        return prev;
      }
    });
    setSelection([]); setNeedsTarget(false);
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
  const current = g?.players[me];
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
    setNotice("");
    setSelection(prev => {
      if (prev.includes(card.id)) return prev.filter(id => id !== card.id);
      const cards = prev.map(id => [...(current?.hand || []), ...(current?.up || [])].find(c => c.id === id));
      return cards.length && !cards.every(c => sameFace(c, card)) ? [card.id] : [...prev, card.id];
    });
  }

  function playMove(move: Move) {
    setNotice("");
    if (mode === "local") commitLocal(game => { Engine.move(game, me, move); });
    else if (room) {
      const onlineMove = move.source === "down"
        ? { type: "play", source: "down", index: move.index }
        : move;
      void submit(roomMove(onlineMove as Move, room.code, room.revision));
    }
    setSelection([]);
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

  function startLocalGame() {
    const game = createGame(players);
    localRef.current = game;
    setLocal(game); setRoom(null); setMode("local"); setSelection([]); setNotice("");
  }

  function newRound() {
    if (mode === "local") startLocalGame();
    else if (room) void submit({ action: "rematch", code: room.code, revision: room.revision });
  }

  function leaveTable() {
    if (wsRef.current) wsRef.current.close();
    setMode("home"); setLocal(null); setRoom(null); roomRef.current = null;
    setSelection([]); setNotice("");
    history.replaceState(null, "", "/play");
  }

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
          <div className="mode-card">
            <div className="eyebrow">PRACTICE</div><h2>Play with bots</h2>
            <p>Local, instant, no account required.</p>
            <label>Players <select value={players} onChange={e => setPlayers(Number(e.target.value))}>
              {[2, 3, 4, 5].map(n => <option key={n} value={n}>{n} players</option>)}
            </select></label>
            <button className="cta" onClick={startLocalGame}>Start game <span aria-hidden>→</span></button>
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
  const canPlay = !!legal.find(m => m.type === "play" && identicalIds(m.ids || [], selection));
  const canTake = legal.some(m => m.type === "take");
  const rule = g.limit?.type === "under" ? "Next number: 1–4" : g.limit?.type === "min"
    ? `Next number: ${g.limit.value} or higher` : "Any number can follow";
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
          <span className="beta-tag">REACT TABLE · PREVIEW</span>
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

      <div className="tabletop" role="region" aria-label="STACK card game">
        <div className="table-texture" aria-hidden="true" />
        <div className="opponents-row">
          {g.players.filter(p => p.seat !== me).map(p =>
            <PlayerPosition key={p.seat} seat={p.seat} name={nameForSeat(p.seat)} self={false} out={p.out}
              active={g.phase === "play" && g.turn === p.seat}
              handCount={p.handCount} up={p.up} downCount={p.downCount} />)}
        </div>
        <div className="table-center">
          <div className="pile-zone">
            <span className="pile-title">DRAW DECK</span>
            <div className="pile-slot">
              {g.stockCount > 0 ? <PlayingCard hidden /> : <div className="slot-empty">Empty</div>}
              {g.stockCount > 1 && <span className="stack-depth" />}
            </div>
            <span className="pile-counter">{g.stockCount} cards</span>
          </div>
          <div className="pile-zone is-main">
            <span className="pile-title">PLAY PILE</span>
            <div className="pile-slot played">
              <AnimatePresence initial={false}>
                {g.pile.slice(-4).map((card, i) => <div key={card.id}
                  className="pile-layer" style={{ transform: `translate(${(i - 1.5) * 6}px, ${(i - 1.5) * -2}px) rotate(${(i - 1.5) * 3}deg)` }}>
                  <PlayingCard card={card} />
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
                  <PlayingCard hidden onClick={stage === "down" && active ? () => clickBlind(index) : undefined} />
                </div>}
                {upCard && <div className="visible-up">
                  <PlayingCard card={upCard} selected={selection.includes(upCard.id)}
                    onClick={canUp ? () => g.phase === "setup" ? swap(upCard, "up") : chooseCard(upCard) : undefined} />
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
                <PlayingCard key={card.id} card={card} selected={selection.includes(card.id) || swapHand === card.id}
                  onClick={g.phase === "setup" ? (!ready ? () => swap(card, "hand") : undefined) :
                    (active || g.followup.length > 0) && stage === "hand" ? () => chooseCard(card) : undefined} />)}
            </AnimatePresence>
            {!current.handCount && <span className="hand-placeholder">No cards in hand</span>}
          </div>
        </div>
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
          <button className="primary-button" disabled={busy} onClick={newRound}>Play another round</button>
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
              {!!g.followup.length && <button className="snap-button" disabled={busy}
                onClick={() => playMove(g.followup[0])}>SNAP</button>}
              {!!g.slam.length && <button className="slam-button" disabled={busy}
                onClick={() => playMove(g.slam[0])}>SLAM</button>}
              <button className="secondary-button" disabled={busy || !canTake}
                onClick={() => playMove({ type: "take" })}>Take pile</button>
              <button className="primary-button" disabled={busy || !active || !canPlay}
                onClick={() => playSelected()}>Play cards <span aria-hidden>→</span></button>
            </div>
          </div>
        )}
      </div>
      {notice && <div className="alert" role="alert">{notice}</div>}
      <div className="table-footer"><span>STACK · React tabletop migration preview</span>
        <a href={classicHref}>Original Classic ↗</a></div>
    </main>
  );
}
