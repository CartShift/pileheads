# Production artwork RC3 review

Status: review only, no commercial or live deployment approval. Source-of-truth: [Drive production plan](https://docs.google.com/document/d/17L3mSKtd_aHKT33YhftWkiiyxgpNnofo/edit) and [release workspace](https://drive.google.com/drive/folders/18BFs-pmcY_YbpJFHYQFHSdVl35WhnIu6).

## Import
Download the original three ZIPs into a single local directory:
- [Sprites](https://drive.google.com/file/d/18WYN7vxM1mwx6Zswh2r3Kz4FxSQw2Dyj/view)
- [Individual digital cards](https://drive.google.com/file/d/1uiXSseSxD2x0368l_fjrE2TjiSVRiGea/view)
- [Website assets](https://drive.google.com/file/d/1vx5Vpx2q5w5DmSTT2GP7xoamDmv13UKV/view)

From this review branch, run `python3 scripts/import-production-rc3-art.py /path/to/archives`. Inspect the dry run, then repeat with `--apply`. The importer checks whole archive hashes, entry hashes, WebP dimensions and known old sprite hashes, preserves historical paths and the 1008x1420 legacy sprite dimensions, updates cache markers and test digests. It intentionally does not touch the geometry-only stack-sheet.webp or change game rules. The RC3 importer supersedes the older RC1 importer. It adds 4 packaging panel exports to the 9 card assets. No imports are performed by this commit.

## Acceptance checklist
- [ ] Import files into this branch; inspect all 16 sprite cells, both back assets, visual white border and print scale.
- [ ] Run npm run test:pilehead-art, npm test, npm run build, npm run test:web and npm run test:integrated.
- [ ] Desktop and mobile real browser review of official homepage, game, gallery, print, all themes; verify cache-busted assets, no clipping in dense hands, and same directional back on every relevant surface.
- [ ] Capture fresh real gameplay screenshots (the current homepage uses version-labelled V7 browser acceptance captures; don't substitute illustrations for real screenshots).
- [ ] Separately approve favicon, app icon, maskable and open graph image; adjust metadata and test actual shares. Do not silently publish candidates.
- [ ] Review action text, particularly GHOST, BURN and DUMP. The engine is canonical; DUMP card itself is spent, only the previous pile transfers, eligible preexisting hand DUMP may counter, recipient takes next turn on successful counter. If they keep the cards, attacker retains repeat turn if active. Final Duel erosion occurs only on original transfer.
- [ ] [Motion and Sonic RC3](https://drive.google.com/file/d/1yasKZCM5dhTmteMeYb4LozOfxvtYVEml/view): all 14 videos decoded successfully; 26 source audio files unchanged. These are review concept renders, not gameplay recordings. Verify actual event binding, mute, reduced motion, runtime privacy, and audio usage rights separately.
- [ ] No changes to main, deployment, or retail status until approval and checks.

## Open physical and brand gates
Native vector trace is approximate; keep approved raster primary. RC3 caption typography, retouched front packaging visual sign-off, typography/color sign-off, manufacturer dieline/stock/ICC/physical proof, real photography, trademark and legal marking clearance remain open. No factory-ready status is implied by RGB proofs.

## RC3 binary integration
The 13 mapped paths are integrated in a single review-branch commit. The 11 unique Git blobs were verified against the local RC3 exports. Cache versions and SHA-256 regression assertions are updated together. CI, browser review and live deployment remain separate gates. The importer remains available for reproducibility; it need not be rerun on this commit.
