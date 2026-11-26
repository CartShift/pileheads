# @stack/game-engine
Private, dependency-free CommonJS package for Node, Metro/Hermes and browser bundlers. Edit src/rules.js (rules, seeded state and events), src/bots.js (injected bot policy) or src/snapshot.js (versioned local save codec). index.d.ts is the shared public type contract.
- Existing engine API is preserved, including in-place mutations. createEngine({now}) provides an isolated clock; default uses Date.now. RNG is stored in game state; no platform APIs or global assignment in the package.
- serialize/restore is for trusted local full-state saves, not network payloads; validates envelope, shape, supported versions and card invariants, not authentication or arbitrary adversarial state. Server redaction stays at the API boundary.
- Run npm run sync:engine after any source change. The checked-in Classic engine is generated, not an edit target. npm run check:engine rejects drift; Next predev/prebuild renders the same bundle into its ignored vendor directory. Browser legacy global is intentionally retained only by that bundle.
- npm run test:shared-core; npm test; npm run build:classic; npm run typecheck --prefix apps/web; npm run build; npm run test:integrated. Real Hermes/device testing is Phase 2.

For the extraction migration, run `npm run test:engine-parity` with the baseline commit present locally. It compares pre-extraction, package and browser states/events, including clock, SNAP/SLAM and snapshot round-trips. Future gameplay changes must intentionally update their expected behavior rather than blindly enforce parity to the old baseline.
