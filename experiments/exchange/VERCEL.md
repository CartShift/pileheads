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
- Deployment ID: `dpl_C6g2apmAc39L8fc3Cm9xcjavc8GE`
- Source snapshot: GitHub branch `experiment/exchange-core-2026-11-10`, commit `9bbebdf9bba8ae3491738adc4497f2fe4e7e3d86`
- Source file: `experiments/exchange/playtest.html`, deployed to Vercel as root `index.html`
- Environment: production **of the standalone lab project only**; nothing published to the original SPARK Sites project.
- Project protection: Vercel Authentication, password, and trusted-IP restrictions are disabled so people with links can try the static lab.
- Vercel API reported `READY`, with the aliases `spark-exchange-lab.vercel.app` and `spark-exchange-lab-cart-shift.vercel.app`.

## Important operational limitation

This Vercel project was deployed from a **static file snapshot** via the Vercel API. It is **not linked to GitHub auto-deploy**. Pushing a new branch commit does **not** automatically refresh the live lab. To update the site, fetch the intended `playtest.html` from the reviewed experiment branch, run the local and UI tests, and create a new static Vercel deployment containing it as `index.html` under the **same existing project**.

Do not accidentally deploy the repository root or link the project to `main`: the actual production site there is a different app. A future dedicated deploy workflow may be added if recurring experiments justify the complexity.

## Validation still required

- Open a live URL in mobile Chrome and desktop browser, confirm page load (HTTP 200), rendered board, click/touch selection, and a complete match.
- Test two humans using `opponents=hotseat`, especially the privacy cover during handoffs.
- Confirm the direct mode links start the expected rulesets. Report mobile viewport/scroll issues and export behavior.
- Collect qualitative observations using [PLAYTEST_SCORECARD.md](PLAYTEST_SCORECARD.md). Simulations alone do not establish fun.

No environment variables, user secrets, Vercel functions or persistent remote database are needed for this static lab.
