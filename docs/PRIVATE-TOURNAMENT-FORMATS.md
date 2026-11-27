# Private tournament formats (increment 2)
- Optional fixed 3, 5 or 10 rounds. Default remains endless and backwards compatible. The 3-round format is fixed rounds for every seat count, not best-of-three.
- Creator selects format and Final Duel before room creation. Fixed formats lock the rule setting. All human seats must affirm continuation before the next deal (#156); ready votes can be withdrawn before the deal. No forced active play. Every round scores the same N minus placement contract.
- Terminal last round refuses rematch on the server. Final shared standings appear in the existing result region; leave table and create a fresh room for a new tournament. No auto-reset.
- Room-scoped and expires with room; no ranked ladder, durable account identity, ranked forfeits or global progression. This is not a full implementation of the competitive roadmap.
- Verify API and browser tests and real phones. New tournament format is additive to the protocol; old clients may display a rematch button on the final round, but the API rejects it safely.

See [continuation consent](TOURNAMENT-REMATCH-CONSENT.md) and [PR #158](https://github.com/CartShift/pileheads/pull/158) for explicit tournament withdrawal. Verify integration/deployment separately.
