# CircleCI pilot and cutover

This is an additive pilot. Existing GitHub Actions triggers, check names and coverage, and Render deployment are unchanged until the CircleCI runs have been verified.

## Set up and validate

1. In CircleCI, create/select a project for `yotamon/spark-card-game` and authorize the GitHub integration for this repository.
2. Use the existing `.circleci/config.yml` from branch `ci/circleci-pilot`. Start with a manual trigger, not all-push triggers.
3. Run the default pipeline: `full_acceptance=false`. Verify the `stack-fast-checks` job passes.
4. Trigger again with `full_acceptance=true`. Verify the `stack-full-acceptance` job passes, including browser scenarios and screenshots. Confirm no database or deployment credentials are needed.
5. Compare billed credits and elapsed time with GitHub Actions. Enable redundant-workflow auto-cancellation where supported.

Both modes use Node 24, locked dependencies and npm caching. Full acceptance replaces the fast mode in the same pipeline rather than running both; it includes typechecking, the integrated build, regression tests, single-origin checks and browser coverage. Chromium is cached separately. Review the actual resource usage before increasing the executor size.

## Cutover (only after successful pilot)

- Confirm the GitHub branch rules and exact CircleCI check names; ensure the required checks will still be reported and enforce equivalent coverage before disabling any GitHub Actions workflow.
- Configure triggers for relevant PR updates and main as appropriate, with full acceptance before merge (or an explicit manual run per ready PR). Avoid duplicate fast/full runs and unnecessary docs-only work; do not leave a required check permanently pending.
- Replace or disable the two GitHub test workflows only after confirming the new gates and testing merge behavior. Keep `.github/workflows/deploy-render.yml` unchanged: it mirrors main to the Render deployment branch and verifies the live service.
- If a CircleCI run fails due to infrastructure, retain GitHub checks as fallback. No production deploy should be triggered by the pilot alone.

## Rollback

Keep the GitHub workflows intact during the pilot. Disable CircleCI triggers if the pilot is unsuccessful. After a later cutover, restore GitHub workflows and required status checks together before removing CircleCI as a merge gate.

## Shared CI contract

All providers execute the same commands from the repository root with Node 24:

- `npm run ci:install`: install both locked dependency trees.
- `npm run ci:fast`: React types, regressions, Classic build and publish boundaries.
- `npm run ci:full`: React types, integrated build, regressions, server integration, pinned browser installation and Classic/React browser acceptance.
- `npm run ci:build`: integrated production build only.

Use `npm run ci:install` first. Hosted providers split full acceptance into `ci:full-core`, `ci:browser-setup` and `ci:browser-test` so that caching and artifacts remain provider-specific. OpenDev can call the same npm scripts. Append `-- --plan` to list the commands without executing them.

`scripts/ci.mjs` owns the commands and Playwright version. Do not duplicate test commands in provider YAML. Provider-specific triggers, resource limits, cache storage and artifact handling stay in their respective adapters. Render release automation remains separate. During the pilot, both providers may execute the same checks; do not disable existing merge gates until the CircleCI run and branch protection have been verified.
