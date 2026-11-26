# Retire the Classic tabletop

Next.js /play is the only supported game UI. The root serves Next, old Classic game URLs redirect to /play preserving room query parameters, and only shared assets, gallery, rules, print and Endgame Lab are published. API, WebSockets, engine, database and game rules are unchanged.

The old UI source and its source-level regression tests remain temporarily to avoid collisions with the in-flight mobile engine extraction (#101). After that PR is integrated, delete obsolete UI-only files/tests and audit remaining references; keep shared assets and rules variants (including the `classic` endgame rule). Do not remove the old URL redirect.

Acceptance: run npm test, npm run build, npm run test:integrated, browser acceptance and live smoke after deployment. No production deployment is implied by this PR.
