# Private tournament formats (increment 2)
- Optional fixed 3, 5 or 10 rounds. Default remains endless and backwards compatible. The 3-round format is fixed rounds for every seat count, not best-of-three.
- Creator selects format and Final Duel before room creation. Fixed formats lock the rule setting. Existing ready and rematch flows remain; no forced active play. Every round scores the same N minus placement contract.
- Terminal last round refuses rematch on the server. Final shared standings appear in the existing result region; leave table and create a fresh room for a new tournament. No auto-reset.
- Room-scoped and expires with room; no ranked ladder, durable account identity, forfeits or full per-human rematch consent yet. This is not a full implementation of the competitive roadmap.
- Verify API and browser tests and real phones. New tournament format is additive to the protocol; old clients may display a rematch button on the final round, but the API rejects it safely.
