/* Thin typed web adapter. The runtime vendor bundle is generated from the shared package. */
import type { EngineApi } from "../../../packages/game-engine";
export type { Action, Card, Move, LocalMove, WireMove, Event, Player, Game, FullGameState, EngineApi } from "../../../packages/game-engine";
export const Engine = require("../vendor/pilehead-engine.cjs") as EngineApi;
