# STACK on Render: Vercel outage fallback

This deployment serves the same STATIC browser UI and Neon-backed API as the Vercel site. It does not migrate or duplicate database contents.

## Deploy

1. In Render, link the private GitHub repository `yotamon/spark-card-game` (authorize access to this repository).
2. Create a **New > Blueprint** from this repository's `render.yaml`. Choose the branch containing these changes, or merge the reviewed PR first. Free web services sleep while idle; choose a paid instance if reliable availability is required.
3. In Render's secure environment-variable prompt, set `PILEHEAD_DATABASE_URL` to the existing dedicated Neon project **Pilehead Multiplayer** connection string. The connection string must not be committed or shared in chat or logs.
4. Deploy. Verify `/pilehead/index.html` renders and `/api/pilehead?health=1` returns `{ "ok": true }`.
5. Visit `/pilehead/index.html?online=1` on one browser, create a room, join from a separate browser/device, play a few turns, reload, and test rematch. Only share the Render URL once this succeeds.

The new `scripts/render-server.cjs` adapter maps the existing `/api/pilehead` handler to Node HTTP and serves `vercel-static/` produced by `npm run build`. This preserves same-origin requests, the card rules, room code/session semantics, and existing Neon tables. Do not create a new database. Room sessions still expire after 24 hours.

## Operating notes

- A paused Vercel *team* remains paused even if its deployment is READY or you redeploy it. A functioning Render URL is independent of the suspended Vercel team.
- Render Free web services spin down after inactivity and can take time to wake; this is a beta/playtest fallback, not a production uptime commitment.
- The client currently polls for room state roughly every 1.75 seconds while visible. Before moving production traffic, measure server usage and optimize fetching. Do not assume STACK caused the entire CartShift-wide CPU overage without checking Vercel Usage.
- Avoid changing DNS/production domains until a working two-device online game has been verified.

## Operational probes and release monitoring

- `GET /livez`: process alive; does not certify multiplayer storage.
- `GET /readyz`: database-aware readiness; succeeds only if the room database responds. Do not switch Render's health path from `/` to this endpoint until `PILEHEAD_DATABASE_URL` is confirmed configured and the probe returns 200 in production.
- Slow requests (>1,000 ms) and HTTP 5xx responses emit a compact JSON warning with route, status and duration. Room codes, session tokens and client IPs are deliberately omitted.
- Keep main as the sole release source. The currently configured Render service follows the temporary fallback branch via a fast-forward mirror action; move it to main in the dashboard and remove the mirror workflow after verifying one successful main build.
- Verify room creation, two independent clients, reconnect, SNAP/SLAM races and rematch after each release. Green unit tests and `/livez` are not proofs of database readiness.
