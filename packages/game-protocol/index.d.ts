/* Shared redacted room DTOs, NOT the authoritative engine state. */
import type { Card, Event, WireMove } from "../game-engine";

export type Reaction = { id: string; seat: number; kind: "fire" | "wow" | "laugh" | "ouch" | "gg"; at: number };
export type BlindReveal = { seat: number; card: Omit<Card,"id">; move: number; expiresAt: number };
export type PublicSeat = {
  seat: number; out: boolean; up: Card[]; handCount: number; downCount: number;
  hand?: Card[]; blindSlots?: number[]; pickups: number;
};
export type TableStandings = { trackedFrom: number; completedRounds: number; seats: { seat: number; points: number; wins: number; lastPlace: number | null }[] };
export type RoomGame = {
  phase: "setup" | "play" | "over";
  turn: number;
  moves: number;
  round: number;
  standings?: TableStandings;
  /** Null or omitted means an endless private table. */
  roundLimit?: 3 | 5 | 10 | null;
  rulesVersion?: string;
  humanCount?: number;
  starterSeat?: number;
  starterReason?: "draw" | "winner" | "practice";
  startedAt?: number | null;
  slamOpen?: boolean;
  botSeats: number[];
  endgameRule?: "final-duel" | "classic";
  omitSkip?: boolean;
  botFollowupReady?: boolean;
  botSlamReady?: boolean;
  reactions?: Reaction[];
  blindReveal?: BlindReveal | null;
  stockCount: number;
  pile: Card[];
  ashesCount: number;
  limit: null | { type: "under" | "min"; value?: number };
  pendingDump: null | { seat: number };
  pendingCounter?: null | { seat: number; attacker: number; count: number };
  finishedOrder: number[];
  loser: number | null;
  players: PublicSeat[];
  events: Event[];
  legal: WireMove[];
  slam: WireMove[];
  followup: WireMove[];
  setupReady: boolean[];
};
export type Room = {
  ok: boolean;
  code: string;
  session?: string;
  revision: number;
  status: string;
  me: number;
  host: boolean;
  capacity: number;
  humanCount?: number;
  botCount?: number;
  expiresAt?: string;
  members: { seat: number; name: string; presence: string }[];
  game: RoomGame;
};

/** HTTP command; blind play indexes refer only to the caller's hidden slots. */
export type RoomMoveCommand = { action: "move"; code: string; revision: number; move: WireMove };
export type RoomCommandResult = Room | { ok: false; error: string };
