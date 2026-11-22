/* Typed adapter for the ORIGINAL deterministic game engine.
 * Gameplay rules are intentionally not duplicated during the migration.
 */
export type Action = "reset" | "ghost" | "under" | "skip" | "burn" | "dump";
export type Card = {
  id: number;
  kind: "number" | "action";
  rank?: number;
  action?: Action;
};
export type Move = {
  type: "play" | "take" | "slam" | "followup";
  source?: "hand" | "up" | "down";
  ids?: number[];
  target?: number;
  index?: number; // wire-only blind slot for the online server
};
export type Event = {
  type: string;
  seat: number;
  reason?: string;
  count?: number;
  target?: number;
  burned?: boolean;
  rank?: number;
  move?: number;
};
export type Player = {
  seat: number; hand: Card[]; up: Card[]; down: Card[];
  out: boolean; pickups: number;
};
export type Game = {
  version: string;
  phase: "setup" | "play" | "over";
  turn: number;
  moves: number;
  stock: Card[];
  pile: Card[];
  ashes: Card[];
  people: Player[];
  limit: null | { type: "under" | "min"; value?: number };
  pendingDump?: null | { seat: number };
  followUp?: null | { seat: number };
  finishedOrder: number[];
  loser: number | null;
  events: Event[];
  setupReady?: boolean[];
};
export type EngineApi = {
  VERSION: string;
  create(input: { seed: number; players: number }): Game;
  autoSetup(game: Game, seat: number): Game;
  start(game: Game): Game;
  swap(game: Game, seat: number, handId: number, upId: number): Game;
  invariant(game: Game): boolean;
  options(game: Game, seat: number): Move[];
  slamOptions(game: Game, seat: number): Move[];
  followUpOptions(game: Game, seat: number): Move[];
  stage(game: Game, seat: number): "hand" | "up" | "down" | "out";
  move(game: Game, seat: number, choice: Move): Event;
  resolveDump(game: Game, seat: number, target: number): Event;
  dumpTargets(game: Game, seat: number): number[];
  botDumpTarget(game: Game, seat: number): number;
  choose(game: Game, seat: number, style?: "greedy" | "saver" | "random"): Move;
  topRun(game: Game): { rank: number | null; count: number };
  autoSlam(game: Game, style?: "greedy" | "saver" | "random", exclude?: number): Event | null;
};

// The CJS/UMD file supplies module.exports and globalThis.PileheadEngine.
// Next bundles this dependency for client-side local simulation.
export const Engine = require("../../../dist/pilehead/engine.js") as EngineApi;
