import type { Move } from "./engine";
import type { Room, RoomMoveCommand } from "../../../packages/game-protocol";
export type { Reaction, BlindReveal, PublicSeat, RoomGame, Room, RoomMoveCommand, RoomCommandResult } from "../../../packages/game-protocol";

export const backendOrigin = (process.env.NEXT_PUBLIC_STACK_API_ORIGIN || "").replace(/\/$/, "");
export class RoomError extends Error {}
export async function requestRoom<T extends object>(payload: T, token?: string | null,
  signal?: AbortSignal): Promise<Room> {
  // Never retry unknown-result card moves automatically. The caller can fetch
  // a new authoritative snapshot when a request is interrupted.
  const timeout = new AbortController();
  const timer = setTimeout(() => timeout.abort(), 20000);
  // Compose cancellation without AbortSignal.any, which is not available on
  // some older mobile Safari/embedded WebViews.
  const cancel = () => timeout.abort();
  if (signal?.aborted) cancel();
  else signal?.addEventListener("abort", cancel, {once:true});
  try {
    const response = await fetch(`${backendOrigin}/api/pilehead`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: JSON.stringify(payload),
      cache: "no-store",
      signal: timeout.signal
    });
    const result = await response.json().catch(() => null);
    if (!response.ok || !result?.ok)
      throw new RoomError(result?.error || `HTTP ${response.status}`);
    return result as Room;
  } catch (error) {
    if (error instanceof RoomError) throw error;
    if (error instanceof Error && error.name === "AbortError")
      throw new RoomError("request_timeout");
    throw new RoomError("network_unavailable");
  } finally { clearTimeout(timer); signal?.removeEventListener("abort", cancel); }
}
export function sessionKey(code: string) { return `stack-next-room-${code.toUpperCase()}`; }
export function roomMove(choice: Move, code: string, revision: number): RoomMoveCommand {
  return { action: "move", code, revision, move: choice };
}
