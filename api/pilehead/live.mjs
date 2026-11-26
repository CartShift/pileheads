import { createServer } from 'node:http';
import roomApi from '../pilehead.js';
import realtime from '../../scripts/realtime-hub.cjs';

// Vercel owns the listener and invocation lifecycle. The same hub is used
// by Render; Neon-backed reconciliation propagates revisions and reactions
// across function instances without sharing private hands over the socket.
const server = createServer((_req, res) => {
  res.writeHead(426, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'Upgrade': 'websocket'
  });
  res.end(JSON.stringify({ ok: false, error: 'websocket_required' }));
});
const hub = realtime.attachRealtime(server, roomApi);
server.once('close', () => hub.shutdown());
export default server;
