# Partner edition beta

Set STACK_PARTNER_CONTACT_EMAIL to an approved public inquiry address. Published partner landing pages can be configured with STACK_PARTNER_EDITIONS_ENABLED=true and STACK_PARTNER_EDITIONS_JSON, an array of objects with slug, name, description, deck (refined, characters or original), accent (six-digit hex), and published:true. Example route: /partners?partner=example. No example customer is published by default.

Only public allowlisted presentation metadata is returned. Unpublished/invalid editions are omitted. This is not tenant isolation, custom artwork, paid access or a partner analytics portal. The edition uses an existing free deck; custom deck manifests and partner-specific assets require additional work. The redemption batches are managed through authorized internal SQL, not a public admin API. Do not expose personal records, hashes or room information to partners. No email is sent by the app.
