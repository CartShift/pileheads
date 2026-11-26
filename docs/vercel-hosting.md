# Vercel hosting migration

The production web target is https://pileheads.com; www redirects to the apex.
The root build exports the Next.js application and the shared assets.
`api/pilehead.js` serves the authoritative HTTP room API and
`api/pilehead/live.mjs` exports a Node HTTP server with the existing
authenticated WebSocket hub. No persistent listener is started by the function.
Vercel Fluid compute is required for WebSocket support.

## Configuration

- Node.js 24, root directory of the repository, `npm run build`,
  output directory `vercel-static`.
- Configure `PILEHEAD_DATABASE_URL` as a server-only secret for Production
  and a dedicated test database for Preview where possible. Do not commit
  the value or expose it via NEXT_PUBLIC variables.
- Keep the client and API same-origin. The existing hub reconciles persisted
  revisions and reactions through Neon every 2.5 seconds; instances do not
  share an in-memory peer map. Clients already reconnect and poll on disconnect.
- Vercel WebSocket invocations have finite lifetimes; verify reconnect and
  cross-instance latency under real deployed conditions before release.

## Acceptance gates

1. Verify preview homepage, /play, /stack, assets and old invitation redirects.
2. Check /api/pilehead?health=1 returns 200 with a working database.
3. Check /api/pilehead/live rejects non-upgrade requests and authenticates a
   real socket; test two clients across reconnect, moves, reactions, private
   hands, special actions and rematches.
4. Confirm CI for the exact release commit. Stage production, test again,
   and only then promote. Verify HTTPS, www redirect and production logs.
5. Keep Render available until all gates pass; migrate old links and retire
   Render only after successful real-device acceptance. Do not delete Neon.
6. Confirm Vercel plan eligibility before commercial use; review repository
   history for secrets and asset licensing after the public visibility change.

First preview of the routing-only commit 0a469c2 returned HTTP 200 for /,
/play, /stack and the legacy invite route. Database health returned 503
online_not_configured. Native WebSocket deployment and authenticated
multiplayer remain to be verified; do not treat a successful build as
production acceptance.
