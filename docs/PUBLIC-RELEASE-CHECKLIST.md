# Publishing STACK: portfolio release checklist

This repository is currently **private** and internally named `yotamon/spark-card-game`. Preparing a portfolio narrative is not the same as making the application or its code public.

## Before switching repository visibility

- [ ] Decide whether to publish the full source and original card artwork. Making a GitHub repo public exposes the repository history as well as the current files; confirm the artwork and any third-party assets are yours to publish.
- [ ] Review Git history for credentials, private room/session data, test fixtures, personal information and any third-party code. The current tree does not include obvious `.env` files; **this is not a full secrets/history audit**.
- [ ] Choose and add a LICENSE intentionally, or keep the default **all rights reserved** status. Do not call this project open-source until a license is added.
- [ ] Ensure staging/prod environment variables remain in Render/Neon secrets and never in client code.
- [ ] Confirm the configured Render host is reachable: `/livez`, `/readyz`, `/pilehead/index.html`, `/stack`, `/play`.
- [ ] Complete an actual two-browser/two-device hosted game: create/join, hidden-hand privacy, special cards, SNAP/SLAM, reconnect, rematch.
- [ ] Run the source regression, build, React typecheck, automated browser acceptance and the current production SHA check.
- [ ] Capture **actual** polished screenshots of Classic and React on mobile + desktop and a short, consent-safe multiplayer demo clip. Do not replace these with rendered concepts and label them screenshots.
- [ ] Check responsive layout, reduced motion, keyboard navigation, image credits and copy.

## GitHub presentation settings

When you decide to go public, update the repository's **Settings > General > Danger Zone > Change repository visibility**. The linked GitHub connector does not expose that administrative mutation.

Recommended repository description:

> STACK is a physical-first card game with a custom rules engine, real-time multiplayer, bots, and React/Next.js + Node.js architecture.

Suggested topics:

`card-game`, `multiplayer`, `nextjs`, `react`, `typescript`, `nodejs`, `websockets`, `postgresql`, `game-development`, `full-stack`.

Recommended Website URL once the host is verified:

`https://stack-card-game-t7vx.onrender.com/stack`

**Repository naming:** rename to `stack-card-game` only after reviewing CI, Render branch tracking, integrations and legacy deep links. GitHub redirects help visitors but do not automatically update every configured dependency or deployment permission.

## Public profile

A public, source-independent case study can live in `yotamon/yotamon/stories/stack.md` even while the game repository remains private. The public GitHub profile README should link to that story first. Once STACK is public and audited, add the direct source-repo link and consider pinning it in **Customize your pins**.

## Suggested publishing order

1. Verify the live demo and capture real gameplay screenshots.
2. Complete the code/assets/secrets and release checks above.
3. Make an explicit visibility and licensing decision.
4. Update repository About, Topics, Website and pins.
5. Add STACK to LinkedIn Featured, CV and the portfolio site, using the concise copy in the case study.

**Do not claim a production acceptance test passed without the actual run evidence.**
