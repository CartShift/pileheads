# STACK UX clarity pass · 21 November 2026

This release improves gameplay presentation, not the 54-card rules or multiplayer protocol.

## Implemented
- Mobile playing view tightened: smaller gaps, opponent seating and table balanced with the hand; fixed safe-area-aware action rail and prominent primary play button.
- Existing action-effect explanation moved above the table, retaining its original semantic text and accessible live region.
- An explicit, user-opened quick reference lists each special action. It does not highlight SNAP opportunities.
- Optional **Learn with a bot** route starts a genuine local two-player game with the learner starting. Lessons progress through actual moves and stages, can be dismissed, and disappear after the first ten moves.
- Online pending controls expose a busy state. Active-play polling is now 850–1250 ms while visible; error backoff, reconnect, and authoritative server validation are unchanged.
- Modestly quicker physical animations, with preserved reduced-motion preferences.
- Source-level regression assertions for setup, rules, controller syntax, and build assets.

## Not yet validated or completed
- Real-device screenshots at 360 px portrait, 390 px portrait, landscape phone and tablet; two independent online devices; full reconnect/rematch tests. Source contracts cannot prove the experience is polished.
- A push transport: online play still polls. A WebSocket upgrade should address multi-instance delivery, authentication, reconnect, latency and load.
- Shared online emotes: do not simulate fake remote reactions. An authenticated, rate-limited, ephemeral broadcast store separate from move revision is required.
- Human UX study: first-move completion, action comprehension, error and undo rate, online wait times, voluntary replay.

## Manual acceptance
1. Tap Learn with a bot, optionally swap starting cards, play a legal card, dismiss help, and reach the next turn.
2. On a small phone, verify the dock does not obscure cards or DUMP targeting, hand horizontal swipes work after a large pickup, and vertical page scrolling remains usable.
3. Confirm SNAP remains a button without extra prompts; the next player's move proceeds immediately.
4. Test an online room on two phones, a SNAP race, reconnect and rematch.
5. Confirm in-round rules open and close and action explanations appear above the table.
