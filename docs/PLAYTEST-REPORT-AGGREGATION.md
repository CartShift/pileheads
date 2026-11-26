# Playtest report aggregation

Refs #138 and #137. This is a private, local organizer workflow, not production telemetry. No server, database, external provider, analytics cookie, account or scheduled task is required.

1. Invite adults to a formative session. On /play open Game settings > Help improve PILEHEADS and opt in before a round begins. The report observes only setup, play and round completion in the current page; drills and already-running rounds are excluded. Reload or opt out clears it.
2. Ask participants to export a report voluntarily and share it with the organizer via an agreed private channel. Never require feedback to play. Keep one final export per observation, review it and remove duplicates manually. Do not commit or publish raw files, even though the export excludes names and room keys.
3. Put the reviewed files in a private local folder outside the repository. Run from repository root:

```sh
node scripts/aggregate-playtest-reports.cjs /private/reports/*.json > /private/aggregate.json
```

4. Review the aggregate JSON. Separate local and online observations; an online round observed by two people appears twice. Missing completions are not proven dropouts. Ratings show their valid response denominator. Truncated reports are excluded and counted separately. No unique-player, acquisition, retention or invite metric can be inferred from these exports.
5. Follow the agreed privacy/retention policy for the voluntary files. Share only aggregate findings; do not identify players or publish tiny cohorts that might expose individuals.

## Next steps (not implemented)

Public analytics requires a reviewed data minimization and consent design, retention/deletion policy, abuse protection, authoritative event semantics, idempotency, privacy-preserving attribution and a protected operator view. Default disabled; no public ingestion endpoint in this change. Avoid duplicating infrastructure until measurement needs are established. Do not combine stated replay intent with observed rematch.

The CLI strictly rejects invalid schema, extra fields, inconsistent counts and oversized files, rejects repeated canonical file paths, and emits no partial aggregate on failure. Different copies of the same report cannot be reliably deduplicated because the schema intentionally contains no unique ID; the organizer must review files first.
