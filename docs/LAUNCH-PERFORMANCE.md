# Launch performance baseline
Run `node tests/stack-launch-performance.cjs` after the integrated build and pinned Playwright setup, or run normal full browser CI. No external service, paid provider or user tracking.
- Four public routes in fresh browser contexts: homepage, play lobby, rules, deck.
- Desktop local and simulated mobile (390px, 1.6Mbps downstream, 100ms latency, 4x CPU slowdown). Collect LCP, observed layout shifts, TTFB, DCL, load, transfer, encoded bodies, JS bytes and request counts.
- This is a report-only baseline for performance; hard fail on horizontal overflow, uncaught client errors and third-party requests before consent. Existing asset-size budgets remain enforced by the integrated tests.
- Report `artifacts/next/launch-performance.json` is uploaded by existing full CI. LCP 2.5s, CLS 0.1 are targets, not a claim about real devices or field percentiles. CLS here is total observed unexpected shifts, not the field session-window algorithm; INP is not measured. Run real devices and field measurement only after appropriate privacy review.
- Use initial evidence to prioritize image loading, JS splitting and local font delivery. Do not remove useful content or weaken tests to meet a budget.

## Initial baseline (PR #155)
Mobile LCP ms: home 2236, play 2176, rules 2032, deck 9688. CLS: .0385, .1395, .0019, .0019. Deck loaded the full master sprite. Use pinned optimized mobile/desktop sheets, early font preload and avoid prefetching adjacent public routes. Re-measure rather than assuming improvement. Record layout shift sources to identify remaining movement.

## Second baseline (#157)
Mobile LCP ms: home 2340, play 2296, rules 2288, deck 5292. Deck improved 45%; lobby CLS unchanged .1395, shift sources indicate wrapping navigation. Third iteration: individual lazy-loaded WebP cards generated from the official master with fixed dimensions and responsive srcset; fixed mobile navigation grid. Verify again; no quality change to canonical assets.

## Third baseline (#159)
[CI evidence](https://github.com/CartShift/pileheads/actions/runs/45916949496), head 8aefbaca27addf2091e748556e8a5def8284f7df. Mobile LCP ms: home 2352, play 2308, rules 2284, deck 2280. CLS: .0385, .0068, 0, 0. Deck LCP improved from 9688ms to 2280ms (76.5%); lobby CLS fell from .1395 to .0068. No page errors, horizontal overflow, or third-party requests in this run. Four routes met lab targets in this run. Do not infer field performance from it; INP is unmeasured. Use these measurements to investigate future regressions; retain existing hard safety checks and asset budgets. Production #159 uses the new individual art URLs.
