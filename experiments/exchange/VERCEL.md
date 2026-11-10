# Vercel playtest deployment

SPARK Exchange is deployed separately from the production SPARK Simple+ ChatGPT Sites game.

## Live links

- **Default lab**: https://spark-exchange-lab.vercel.app/
- **Exchange, 9 cards, 4 colors (primary study)**: https://spark-exchange-lab.vercel.app/?mode=ex934
- **Exchange, 7 cards, 4 colors**: https://spark-exchange-lab.vercel.app/?mode=ex734
- **Exchange, 7 cards, 4 colors, 2 cards in hand**: https://spark-exchange-lab.vercel.app/?mode=ex724
- **Original-style insertion control**: https://spark-exchange-lab.vercel.app/?mode=insert
- **Exchange, 9 cards, 3 colors**: https://spark-exchange-lab.vercel.app/?mode=ex933
- **Two humans on one phone, primary study**: https://spark-exchange-lab.vercel.app/?mode=ex934&opponents=hotseat&players=2

The app supports `mode`, `players=2|3|4`, `opponents=bots|hotseat`, and optional `seed=<uint32>` query parameters. Deep links with a valid `mode` start a fresh game in that ruleset rather than resuming a different saved session. Without a mode parameter, the page resumes an existing local session when available. Sessions and playtest data are browser-local; no server database or multiplayer service is attached.

## Deployment record

- Vercel team: CartShift (Hobby)
- Vercel project: `spark-exchange-lab`
- Project ID: `prj_aQI7p60c3h7AXNkXfzYWdf0lHLoO`
- Deployment ID: `dpl_3YaJ79xGGK5Fq3b72BKXuDWHsPED`
- Source snapshot: GitHub branch `experiment/exchange-core-2026-11-10`, commit `78eec3dd1a481e7ce408bd47a5d84df5083c4687`
- Source file: `experiments/exchange/playtest.html`, deployed to Vercel as root `index.html`
- Environment: production **of the standalone lab project only**; nothing published to the original SPARK Sites project.
- Project protection: Vercel Authentication, password, and trusted-IP restrictions are disabled so people with links can try the static lab.
- Vercel API reported `READY` for the updated physical-animation build on 2026-11-10, and the project's latest-deployment ID matched. Independent browser HTTP verification was unavailable in this execution environment. The aliases are `spark-exchange-lab.vercel.app` and `spark-exchange-lab-cart-shift.vercel.app`.

## Important operational limitation

This Vercel project was deployed from a **static file snapshot** via the Vercel API. It is **not linked to GitHub auto-deploy**. Pushing a new branch commit does **not** automatically refresh the live lab. To update the site, fetch the intended `playtest.html` from the reviewed experiment branch, run the local and UI tests, and create a new static Vercel deployment containing it as `index.html` under the **same existing project**.

Do not accidentally deploy the repository root or link the project to `main`: the actual production site there is a different app. A future dedicated deploy workflow may be added if recurring experiments justify the complexity.

## Physical card interactions restored

The deployed lab retains the gameplay changes of Exchange but restores key physical presentation from SPARK Simple+: layered printed card faces, corner icons, felt table, face-down deck, staged card movement, card-for-card exchange flight paths, matches collected to player score piles, cascade-by-cascade removal, collapsing row, face-down/refilled cards flipping into place, point feedback, and pointer/touch drag from the hand. The motion can be disabled with the Motion toggle or by reduced-motion OS preferences. Click/tap-to-play remains available.

The new animation presentation does **not** change scoring or game rules. Authoritative state is committed once, saved before the decorative sequence, and the animation can fail or be disabled without replaying a move. Bot hands remain concealed, and pass-and-play shows the privacy cover before the next player is exposed.

Verification:
- `node experiments/exchange/test.cjs`: deterministic rules and card accounting
- `node experiments/exchange/ui-test.cjs`: UI, bot hand/privacy regression
- `node experiments/exchange/motion-test.cjs`: WAAPI DOM-stub smoke test for exchange, two-wave chain, insertion, discard, refill, hotseat privacy and motion-off fallback

**Limit:** mock DOM tests are not real mobile Chrome performance or touch testing. Manual Android and desktop browser QA remains required.

## Validation still required

- Open a live URL in mobile Chrome and desktop browser, confirm page load (HTTP 200), rendered board, click/touch selection, and a complete match.
- Test two humans using `opponents=hotseat`, especially the privacy cover during handoffs.
- Confirm the direct mode links start the expected rulesets. Report mobile viewport/scroll issues and export behavior.
- Collect qualitative observations using [PLAYTEST_SCORECARD.md](PLAYTEST_SCORECARD.md). Simulations alone do not establish fun.

No environment variables, user secrets, Vercel functions or persistent remote database are needed for this static lab.
