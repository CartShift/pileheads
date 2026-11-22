import type { Card, Event, Move } from "./engine";

export type Reaction = { id: string; seat: number; kind: "fire" | "wow" | "laugh" | "ouch" | "gg"; at: number };
export type BlindReveal = { seat: number; card: Omit<Card,"id">; move: number; expiresAt: number };
export type PublicSeat = {
  seat: number; out: boolean; up: Card[]; handCount: number; downCount: number;
  hand?: Card[]; blindSlots?: number[]; pickups: number;
};
export type RoomGame = {
  phase: "setup" | "play" | "over";
  turn: number;
  moves: number;
  round: number;
  botSeats: number[];
  botFollowupReady?: boolean;
  botSlamReady?: boolean;
  reactions?: Reaction[];
  blindReveal?: BlindReveal | null;
  stockCount: number;
  pile: Card[];
  ashesCount: number;
  limit: null | { type: "under" | "min"; value?: number };
  pendingDump: null | { seat: number };
  finishedOrder: number[];
  loser: number | null;
  players: PublicSeat[];
  events: Event[];
  legal: Move[];
  slam: Move[];
  followup: Move[];
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
  members: { seat: number; name: string; presence: string }[];
  game: RoomGame;
};
export const backendOrigin = (process.env.NEXT_PUBLIC_STACK_API_ORIGIN || "").replace(/\/$/, "");
export class RoomError extends Error {}
export async function requestRoom<T extends object>(payload: T, token?: string | null, signal?: AbortSignal): Promise<Room> {
  const response = await fetch(`${backendOrigin}/api/pilehead`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: JSON.stringify(payload),
    cache: "no-store",
    signal
  });
  const result = await response.json().catch(() => null);
  if (!response.ok || !result?.ok) throw new RoomError(result?.error || `HTTP ${response.status}`);
  return result as Room;
}
export function sessionKey(code: string) { return `stack-next-room-${code.toUpperCase()}`; }
export function roomMove(choice: Move, code: string, revision: number) {
  return { action: "move", code, revision, move: choice };
}
