# Retire the Classic tabletop

Next.js /play is the only supported game UI. The root serves Next, old Classic game URLs redirect to /play preserving room query parameters, and only shared assets, gallery, rules, print and Endgame Lab are published. API, WebSockets, engine, database and game rules are unchanged.

The old root redirect, Classic tabletop HTML/controllers, UI-only styles and Classic-only tests are removed from the active tree. Git history retains them. Mixed tests retain engine/API, print, gallery, assets and React assertions. Shared lab presentation, `engine.js`, and the `classic` endgame rule remain intact. PR #101 moves the canonical rules into a workspace package independently; reconcile its build manifest and CI changes during integration. Older local-only Classic saved games are not imported by this change; old room links preserve their query parameters.

Acceptance: run npm test, npm run build, npm run test:integrated, browser acceptance and live smoke after deployment. No production deployment is implied by this PR.
