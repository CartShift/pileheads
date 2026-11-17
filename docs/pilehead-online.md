# PILEHEAD Online Rooms + Physical Table (beta)

This is the actual PILEHEAD engine in \`dist/pilehead/engine.js\`, with server-authoritative multiplayer, not a mock room or a local pass-and-play simulation.

## What is deployed

- \`/pilehead/index.html\`: local bot/hotseat and online entry; same physical-card styling, hand fan, touch drag, desktop drag, pile-drop gestures, action badges, and SLAM burn motion. There is a reduced-motion fallback.
- \`/pilehead/index.html?online=1\`: create a hosted private room for 2–5 humans.
- \`/pilehead/index.html?room=XXXXXXXX\`: join a room by invite.
- \`/api/pilehead\`: same-origin Vercel Node 24 Function, dynamic import of pinned \`@neondatabase/serverless\` driver and dedicated Postgres database.
- \`dist/pilehead/online.js\`: online client, local private seat storage, seat-specific views, lobby setup swapping, host-controlled start, revisioned turns, and out-of-turn SLAM. Polls while visible (1.75s), and refreshes after returning to the tab.

## Database and configuration

The dedicated Neon Postgres project is named **Pilehead Multiplayer** (\`little-wind-33960014\`), in Frankfurt / EU Central. This is deliberately separate from WakeMyWay, StarLinker, Atlas Irwin, SPARK, and other products.

The following tables already exist in that project:

- \`pilehead_rooms\` (room code, capacity, revision, game JSONB, status, timestamps and expiry)
- \`pilehead_members\` (one unique seat and hashed session token per player)
- \`pilehead_rate_limits\` (hashed network-hour buckets to limit unauthenticated room creation/joining)

**Required environment variable on the existing Vercel project** (\`spark-card-game\`, team \`CartShift\`):

\`PILEHEAD_DATABASE_URL\` = the Neon Postgres connection string for this dedicated project (set as **encrypted**, for **production + preview**).

Retrieve the value in Neon Console and enter it through Vercel Settings → Environment Variables. Never commit it, put it in the browser bundle, append it to a URL, or paste it into chat. Vercel must rebuild/redeploy after saving the variable. If connector permissions allow, configure it via the Vercel integration without displaying its value.

The Vercel connector was denied permission to write project environment variables (403) during this implementation. **This feature remains unavailable until the credential is actually configured.** The client displays an explicit error instead of falsely pretending that the room is working.

## Privacy and consistency

- Only room members with 256-bit random bearer tokens can query the room. Tokens are never placed in invitation URLs or database plaintext; their SHA-256 hashes are stored instead.
- Seat isolation: public face-up cards, public pile and event log, own hand and blind *slot indexes* only. Neither opponents' hidden hands nor any hidden card identities, raw deck, seed, or private session tokens are returned.
- The server validates every card, action, setup swap and SLAM using the canonical engine. It never accepts client-supplied authoritative state.
- Updates are optimistic concurrency-controlled via \`revision\`. A stale command gets HTTP 409 and the client refreshes. This prevents double moves and lost simultaneous SLAM updates.
- Each room expires after 24 hours; tables retain expired rows until explicit cleanup is added. There is a per-network-hour limit for creating and joining rooms. This is a lightweight friend playtest, **not** account-grade identity, moderation, matchmaking or public-scale service.
- Browser Origin + JSON Content-Type checks block ordinary cross-site requests. The session token is sent in an Authorization header, not a URL.
- When Vercel Deployment Protection is active, friends need a share link with \`_vercel_share\`. The online UI preserves that parameter when it constructs invite links. Share links expire; for long-term frictionless invitations configure a deliberately public game deployment without accidentally exposing the original private SPARK friends backend.

## Limitations and validation

- Existing SPARK/D1 online rooms are unchanged and not exposed on Vercel.
- PILEHEAD online synchronization currently uses polling, not low-latency WebSocket transport. A technically first successful SLAM request wins, so real-world latency can matter; this is a known playtest limitation.
- The game may be playable on a shared device locally without server credentials, via the older hotseat mode, but that is NOT online multiplayer.
- Full live two-device QA cannot be claimed until Vercel environment permission is resolved and at least two independent browser sessions join and complete a game.
- Validate portrait + landscape phones, tablet, desktop, keyboard, screen reader and prefers-reduced-motion on actual hardware. Code-level and simulation tests alone are not sufficient.

## Activation smoke test

1. Configure encrypted \`PILEHEAD_DATABASE_URL\` on the existing Vercel project, redeploy the latest main commit and verify the deployment says READY.
2. Open \`https://spark-card-game.vercel.app/pilehead/index.html?online=1\` (or a permitted share link if protected) in browser A. Create a room.
3. Copy the resulting invitation link into an **independent** browser B. Join with a different name, inspect that B cannot see A's hand or blind cards.
4. As host, verify the two-person lobby fills, exchange face-up cards, and Start.
5. Play valid and invalid moves, test a concurrent SLAM, refresh both devices mid-game, and confirm exact shared pile, turn, revision and game completion.
6. Run \`npm run test:pilehead\`, \`npm run test:pilehead-online\` and \`npm run build:vercel\` with Node 24.

## Design decisions

A printed deck remains mandatory for design decisions. The graphical hand/felt is a tactile *simulation* and must be tested with human players. Keep cards readable, opponent hands private and the centre pile prominent. Do not add unrelated action cards until evidence suggests the current deck benefits from a change.

## Playtest ergonomics update

- Before a multiplayer game starts, every seat explicitly confirms its three face-up choices. The host can start only once all seats are marked ready. Unready again to change cards.
- DUMP burns the played DUMP card(s) and sends only the existing pile to the next player, then gives the actor another turn.
- SLAM can interrupt with a complete four-of-a-kind from the active layer while a pile exists, even if the current top rank differs. Existing completion of the top rank remains supported.
- Hand selection now picks a full same-face group on the first tap; tapping individual selected cards removes them. Hand sorting is presentation-only.

## Result screen
Both online participants receive the end state from the server; the winner/last-place overlay is derived solely from finishedOrder and loser. Rematches start a fresh room (no secret seat tokens reused). Local games have a Play again action.

BURN already exists as two dedicated action cards in the 52-card deck. Its action burns the entire played pile, including BURN, and awards another turn; the controls and rules now make this explicit.

## Immersive tabletop and result stage (Nov 2026)
- Both the local simulator and private-seat online rooms use one common resultHTML presentation in `dist/pilehead/immersive.js`; finish states remain engine/server authoritative, never inferred from animations.
- The results show first to escape, ordered finishers, PILEHEAD, moves and burned cards, with a physical card fan, confetti and opt-in original victory chime. In online play, "New online table" creates a new room; it is not automatic same-room rematch.
- Focus Table is an optional, locally saved presentation mode that hides decorative navigation while leaving the action rail, HUD, cards and exit control available.
- Confetti, transitions and chimes honor reduced-motion and the existing sound preference. Endgame modal has labelled dialog semantics and keyboard focus containment.
- Visual verification remains necessary at narrow phone, tablet and desktop sizes, and a full two-device multiplayer finish should be exercised before treating this as production QA-complete.

## Mixed online human + bot tables and same-room replay

- Room creation now allows **1–5 human seats** and **0–4 bot seats**, with **2–5 seats in total**. Examples: 1 human + 2 bots, 2 humans + 1 bot, 3 humans + 2 bots.
- Humans occupy contiguous seats starting at seat 0; the remaining seats are server-owned bots and cannot be claimed through invitation URLs or member tokens. Old rooms with no `humanCount` remain all-human.
- Bots automatically choose their face-up cards and are ready from the lobby. Only humans have to join and confirm their cards before the host can start.
- Bot actions are simulated **authoritatively on the server**, one at a time, through the revision-controlled `advance` action. Clients automatically ask for another bot move when the current turn belongs to a bot; no bot hand or deck information is sent to browsers.
- After `phase=over`, any authenticated human can select **Play again · same room**. The server shuffles a fresh 52-card deck, increments the round, retains the room code, human seats/sessions and bot composition, and returns everyone to the face-up-selection lobby. The first seat remains the host for starting the next round.
- If the host is away, human participants can trigger the rematch, but starting the round still requires the host and every human seat to confirm readiness. Rematch requests use optimistic concurrency control to avoid two competing resets.
- The live table remains polling-based; browsers advance bot turns approximately every 1.75 seconds while visible. When all humans leave the page, bot turns pause until a participant reconnects. Bots use the existing engine strategy, not an AI language model.

## Physical follow-up rules and explainable card effects

- `SNAP!`: after a number play, only matching numbers **freshly replenished from stock in that exact move** can be thrown immediately, out of turn, as `type=followup`. This option expires after another move, including a pickup; a successful non-burning SNAP does not steal the next player's turn. A 4-of-a-kind still burns normally. Players can explicitly decline the SNAP opportunity.
- `LAST-HAND COMBO`: when the stock is completely empty and a player has exactly one numeric hand card, any identical face-up cards may be placed together with that last card. The engine validates ownership and removes cards from both layers in the same atomic move.
- All SNAP and bridge checks are validated on the authoritative engine; exposed-card combinations and only the owner's possible SNAP are sent to the relevant seat.
- `drawnCount` is a non-sensitive count added to public events for the stock-to-hand animation. A DUMP pickup animates the pile moving to its intended recipient, and special cards display the outcome in plain language.

## Server-authoritative drawn-match priority

A matching card drawn immediately after a numbered play opens a seven-second SNAP priority window online. Other normal turns, including bot turns, are delayed until SNAP, decline, or expiry. Four-card SLAM may still interrupt. On a shared device the reaction is untimed. The deadline belongs to the room state and is not based on client clocks.
