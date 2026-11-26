import type { RoomGame } from "./room";

export type CardAvailability = "playable" | "blocked" | "snap" | "slam" | "snap-slam" | "neutral";

/** Display hints only. The engine/server already supplied these move groups.
 * Never evaluate hidden cards or infer new moves from visible ranks. */
export function getCardAvailability(game: RoomGame, active: boolean, id: number): CardAvailability {
  if (game.phase !== "play" || game.pendingDump || game.pendingCounter) return "neutral";
  const contains = (move: {ids?: number[]}) => !!move.ids?.includes(id);
  if (active && game.legal.some(move =>
    move.type === "play" && move.source !== "down" && contains(move))) return "playable";
  const snap = game.followup.some(contains);
  const slam = game.slam.some(contains);
  if (snap && slam) return "snap-slam";
  if (snap) return "snap";
  if (slam) return "slam";
  return active ? "blocked" : "neutral";
}

export const availabilityDescription: Record<CardAvailability, string> = {
  playable: "Available as part of a legal play.",
  blocked: "Not currently part of a legal play.",
  snap: "Available for SNAP. Use the SNAP action.",
  slam: "Available for SLAM. Use the SLAM action.",
  "snap-slam": "Available for SNAP or SLAM. Use the corresponding action.",
  neutral: ""
};

/** A plus marker means the existing selection can be extended by this card
 * within at least one engine-provided legal group, not merely a matching rank. */
export function canExtendSelection(game: RoomGame, active: boolean, selection:number[], id:number): boolean {
  return active && selection.length>0 && !selection.includes(id) &&
    game.legal.some(move=>move.type==="play" && move.source!=="down" &&
      move.ids?.includes(id) && selection.every(selected=>move.ids?.includes(selected)));
}
