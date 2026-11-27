# Launch performance baseline
Run `node tests/stack-launch-performance.cjs` after the integrated build and pinned Playwright setup, or run normal full browser CI. No external service, paid provider or user tracking.
- Four public routes in fresh browser contexts: homepage, play lobby, rules, deck.
- Desktop local and simulated mobile (390px, 1.6Mbps downstream, 100ms latency, 4x CPU slowdown). Collect LCP, observed layout shifts, TTFB, DCL, load, transfer, encoded bodies, JS bytes and request counts.
- This is a report-only baseline for performance; hard fail on horizontal overflow, uncaught client errors and third-party requests before consent. Existing asset-size budgets remain enforced by the integrated tests.
- Report `artifacts/next/launch-performance.json` is uploaded by existing full CI. LCP 2.5s, CLS 0.1 are targets, not a claim about real devices or field percentiles. CLS here is total observed unexpected shifts, not the field session-window algorithm; INP is not measured. Run real devices and field measurement only after appropriate privacy review.
- Use initial evidence to prioritize image loading, JS splitting and local font delivery. Do not remove useful content or weaken tests to meet a budget.
