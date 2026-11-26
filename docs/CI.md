# STACK CI: fast feedback, full acceptance

The repository has **two CI levels**, not three overlapping browser runners.

| Level | Trigger | What runs | Purpose |
| --- | --- | --- | --- |
| **Fast checks** | Every relevant PR update (including Draft), and pushes to `main` | Locked npm installs, React TypeScript, all deterministic tests (`npm test`), Classic-only static build, publish-boundary assertions | Find common regressions quickly without Chromium or a full Next.js production build |
| **Full acceptance** | Non-draft PR creation/update, Draft → **Ready for review**, manual GitHub Actions dispatch, and direct `main` pushes | Typecheck, complete production build, deterministic tests, single-origin server check, **both Classic and React desktop/mobile browser suites, real HTTP/WebSocket multiplayer with mock Neon** | Verify production-relevant behavior before merging |

### Day-to-day

1. Develop using a **Draft PR**. Each commit runs the fast checks automatically; the full browser suite is skipped.
2. When the change is ready to merge, click **Ready for review**. This automatically triggers full acceptance against that PR's current head. No label or manual workflow trigger is needed.
3. Wait for **both** `STACK fast: engine, API, types and Classic` and `STACK full: Classic, React, multiplayer` to pass before merging. If code changes after a green result, the corresponding checks rerun on the new commit.
4. For exceptional debugging, run the **STACK full acceptance** workflow with `workflow_dispatch`. It also runs on pushes to `main` as a safety net while branch protection is unavailable.

When superseded commits arrive, the previous run of the *same workflow* is cancelled. Browser dependencies are cached and the full suite shares **one** installed Chromium and **one** production build across both frontends. A draft PR's skipped full job is **not** an approval for merge.

### Local equivalents

```bash
# Fast checks
npm ci
npm ci --prefix apps/web
npm run typecheck --prefix apps/web
npm test
npm run build:classic

# Full acceptance
npm run build
node tests/stack-single-service.cjs
npm install --no-save playwright@1.56.1
npx playwright install --with-deps --only-shell chromium
node tests/pilehead-browser.cjs
node tests/pilehead-live-browser.cjs
node tests/stack-next-browser.cjs
```

Full browser tests run their own local servers, and the multiplayer fixtures replace Neon with an isolated mock. They do **not** verify two real devices or the uptime/configuration of the hosted Render service; those still require release smoke checks.

### Production protection

**Important:** As of the implementation, the private repository's `main` branch is **not protected**, and GitHub's ruleset endpoint reports that this account needs GitHub Pro or a public repository for that feature. GitHub Actions passing is therefore a documented **merge discipline**, not an enforced GitHub merge rule.

When branch protection becomes available, protect `main`, require pull requests and **both** exact status checks above, and disallow bypass/direct pushes. Until then, never merge a PR with a skipped, pending or failed full check. In particular, do not merge a Draft PR before marking it ready and seeing full green results.

CI time is measured from GitHub's actual workflow runs, not estimated from test count. Caching only saves time on cache hits, so compare cold and warm runs separately.


## Provider-neutral fallback

The canonical commands are now `node scripts/ci.mjs fast` and
`node scripts/ci.mjs full-core`. The latter covers the production build
and single-service check, **not** the browser acceptance suite. GitHub
Actions retains the existing trigger policy, browser tests, artifact
collection and Render release checks. Do not treat a fallback result as
a substitute for the full browser gate.

| Provider | Default responsibility |
| --- | --- |
| GitHub Actions | Existing automatic PR gates and production sync |
| Bitrise | Manual fast fallback today; native mobile builds when native projects exist |
| CircleCI | Manual fast fallback |
| OpenDev/local | Run the same script without consuming hosted CI allowance |

- Bitrise: after merging, select repository-managed `bitrise.yml` in the
  Bitrise project's configuration settings (the current hosted configuration
  is separate). Run `run_tests` manually against the intended branch.
  Automatic triggers are intentionally absent. Node uses version prefix
  `24`, not `24.x`, because Bitrise's mise runtime installer rejects the latter.
  The existing Elite Linux machine is retained until a supported lower-cost
  machine is confirmed. Verify the workspace allowance before running.
- CircleCI: connect the repository and explicitly trigger a pipeline with
  boolean parameter `run_fallback=true`. The default false skips the workflow;
  disable automatic pipeline triggers in project settings if appropriate.
- Local: from the repository root, use the same Node 24 commands.

Do not enable the same automatic checks on multiple providers. Record cold
and warm build durations and actual quota consumption before changing the
default provider. Native mobile and OTA release workflows remain out of
scope until the React Native project and release requirements exist.

The fallback configuration is not a deployment pipeline. The existing
Classic-specific checks reflect the current main branch and must be
updated together with the planned Classic retirement.
