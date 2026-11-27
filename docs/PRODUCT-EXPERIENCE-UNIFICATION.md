# PILEHEADS product experience unification

## Direction
Use the existing PILEHEADS brand system (cream printed paper, teal, red, yellow, Barlow display) as the single source of identity. Editorial screens and the lobby/profile share one shell. Active games retain a focused dark tabletop, the same logo and brand accents, and compact context-specific controls.

## Phase 1
- One SiteHeader across home, deck, rules, lobby, profile and tournament-withdrawal lobby.
- Identical navigation order, active route semantics, campaign-aware play link and mobile layout.
- Physical game link remains in the homepage and footer; print link stays in the lobby footer.
- Shared public hero and CTA tokens; no changes to game rules, card assets, persistence, networking or print geometry.
- Browser scenario: `STACK_ACCEPTANCE_SCENARIO=unifiedNavigation npm run test:web` after integrated build. Check 320/390/768/1440 widths; use existing launch and game acceptance scenarios for regressions.

## Next phases
1. Compare actual rendered screenshots across routes and table states; resolve typography, spacing, surfaces and responsive overflow.
2. Extract common button, panel, input, dialog and feedback primitives, preserving semantic states and existing actions.
3. Align waiting rooms, match setup, live table controls, results, standings and profile states.
4. Verify keyboard interaction, focus, contrast, reduced motion and multiplayer behavior; capture screenshots on desktop and mobile before deployment.

No visual approval or runtime verification is implied by a source change.

## Phase 2 — shared primitives and account surfaces
- Shared logo component for both the public masthead and compact live-table header.
- Canonical tokens for control geometry, dark surfaces and destructive actions.
- Consistent paper cards, public CTA, settings/rules/restart/inspection panels, action dock and results without changing geometry, game actions, status signals or rules.
- Profile hierarchy and destructive-action styling; email confirmation/unsubscribe route shares public shell. Operator-only growth route intentionally stays separate.
- Extended browser scenario verifies the deck-update shell and in-game rules dialog. Actual screenshot review still required before visual sign-off.

- Integrated concurrent private-history features from main without changing opt-in, authorization, retention or round logic; styled the history summaries and consent section using existing brand tokens.

- Preserved concurrent progression UI and opt-in XP, aligned achievement and level styling, and updated the static design-system contract to verify the shared BrandLink instead of requiring duplicate logo markup.

- Aligned the restricted Quick Play preview with the shared header and paper control styling without adding public entry links or changing queue eligibility.

## Public discoverability and activation
The public navigation and play lobby now advertise Quick Play as a real destination, with live availability messaging. Account, history and progression panels explain disabled states instead of disappearing. No public queue operation is enabled by these UI changes. Maintain the production denial until the public launch safeguards are implemented, tested and deployed. Keep verified accounts, per-round consent, independent seat credentials, privacy and rate limits. No fake availability, opponents, XP or history.
