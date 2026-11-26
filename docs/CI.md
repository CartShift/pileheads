# STACK CI: fast feedback, full acceptance

The repository has **two CI levels**, not three overlapping browser runners.

| Level | Trigger | What runs | Purpose |
| --- | --- | --- | --- |
| **Fast checks** | Every relevant PR update (including Draft), and pushes to `main` | Locked npm installs, React TypeScript, all deterministic tests (`npm test`), shared-assets build, publish-boundary assertions | Find common regressions quickly without Chromium or a full Next.js production build |
| **Full acceptance** | Non-draft PR creation/update, Draft → **Ready for review**, manual GitHub Actions dispatch | Typecheck, complete production build, deterministic tests, single-origin server check, **React desktop/mobile browser suite, real HTTP/WebSocket multiplayer with mock Neon** | Verify production-relevant behavior before merging |

### Day-to-day

1. Develop using a **Draft PR**. Each commit runs the fast checks automatically; the full browser suite is skipped.
2. When the change is ready to merge, click **Ready for review**. This automatically triggers full acceptance against that PR's current head. No label or manual workflow trigger is needed.
3. Wait for **both** `STACK fast: engine, API, types and shared assets` and `STACK full: React, multiplayer` to pass before merging. If code changes after a green result, the corresponding checks rerun on the new commit.
4. For exceptional debugging, run the **STACK full acceptance** workflow with `workflow_dispatch`. Fast checks and production smoke still run for relevant main pushes.

When superseded commits arrive, the previous run of the *same workflow* is cancelled. Browser dependencies are cached and the full suite shares **one** installed Chromium and **one** production build for the sole frontend. A draft PR's skipped full job is **not** an approval for merge.

### Local equivalents

```bash
# Fast checks
npm ci
npm ci --prefix apps/web
npm run typecheck --prefix apps/web
npm test
npm run build:shared-assets

# Full acceptance
npm run build
node tests/stack-single-service.cjs
npm install --no-save playwright@1.56.1
npx playwright install --with-deps --only-shell chromium
node tests/stack-next-browser.cjs
```

Full browser tests run their own local servers, and the multiplayer fixtures replace Neon with an isolated mock. They do **not** verify two real devices or the uptime/configuration of the hosted Render service; those still require release smoke checks.

### Production protection

**Important:** As of the implementation, the private repository's `main` branch is **not protected**, and GitHub's ruleset endpoint reports that this account needs GitHub Pro or a public repository for that feature. GitHub Actions passing is therefore a documented **merge discipline**, not an enforced GitHub merge rule.

When branch protection becomes available, protect `main`, require pull requests and **both** exact status checks above, and disallow bypass/direct pushes. Until then, never merge a PR with a skipped, pending or failed full check. In particular, do not merge a Draft PR before marking it ready and seeing full green results.

CI time is measured from GitHub's actual workflow runs, not estimated from test count. Caching only saves time on cache hits, so compare cold and warm runs separately.

### Hosted runner migration

The repository is now `CartShift/pileheads`. GitHub Actions remains the CI orchestration and status-check interface; Blacksmith runs the Linux jobs. The migration (#106) passed both fast checks and full acceptance. Preserve the Blacksmith runner labels when changing workflows. Monitor actual billed runner usage before increasing machine size or enabling duplicate providers.

## Provider-neutral execution

Use `npm run ci:install` followed by `npm run ci:fast` or `npm run ci:full` (with browser installation). `ci:full-core` excludes browser coverage; `ci:browser-setup` and `ci:browser-test` are separate cacheable stages. All providers use these commands. `-- --plan` prints the selected stage without running it.

GitHub Actions on Blacksmith remains the primary gate. CircleCI and Bitrise are manual fallbacks only; do not run duplicates automatically. CircleCI requires `run_fallback=true`, with `full_acceptance=true` for full acceptance. Bitrise uses the repo-managed config after switching config source in its dashboard and validating the account allowance; no automatic triggers. Native builds are planned, not implemented. Neither fallback has been executed with this new shared script yet. See [CircleCI pilot](circleci-pilot.md).
