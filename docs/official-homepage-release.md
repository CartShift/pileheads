# Official homepage release checklist

- Design reference: https://drive.google.com/file/d/1zy1cbbli_Btag1yZYRHUIXyu-M70mTYX/view
- Build: `npm run build`; then `npm run test:integrated`.
- Focused browser check: with the same Playwright setup as the existing browser acceptance suite, run `node tests/stack-homepage-browser.cjs`. Screenshots: artifacts/website (320, 390, 768 and 1440 px).
- Compare screenshots with approved concept; verify typography, hero mascot silhouette, image loading, mobile legibility, focus, and CTA destinations.
- Current game screenshot is a genuine local acceptance capture in Original deck theme; replace with a current V2-theme capture when available.
- Confirm both Classic and React games, room creation/reconnect and rules pages still function. No fabricated reviews, retail prices, or checkout.
- First publish at /stack on the existing Render service after checks. Only promote to / after explicit visual acceptance and testing existing root invite-link behavior; preserve /pilehead/index.html and /play.
- Roll back by reverting the website commit if the release causes regressions. Never alter the simulator engine to fix marketing layout.
