import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

globalThis.PileheadEngine = require('../dist/pilehead/engine.js');
const { runSimulation } = require('../dist/pilehead-sim-core.js');
const [games = '120', players = '4', seed = '20261113'] = process.argv.slice(2);
const result = runSimulation({ games: Number(games), players: Number(players), seed: Number(seed) });
process.stdout.write(JSON.stringify(result, null, 2) + '\n');
