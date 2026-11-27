-- Explicit migration only. No room, growth or commerce data is modified.
BEGIN;
CREATE TABLE IF NOT EXISTS pileheads_guest_profiles (
 id uuid PRIMARY KEY,
 token_hash text NOT NULL UNIQUE CHECK (token_hash ~ '^[0-9a-f]{64}$'),
 display_name text NOT NULL DEFAULT 'Player' CHECK (char_length(display_name) BETWEEN 1 AND 24),
 preferred_deck text NOT NULL DEFAULT 'refined' CHECK (preferred_deck IN ('refined','characters','original')),
 created_at timestamptz NOT NULL DEFAULT now(),
 expires_at timestamptz NOT NULL DEFAULT (now()+interval '90 days')
);
CREATE INDEX IF NOT EXISTS pileheads_guest_profiles_expiry_idx ON pileheads_guest_profiles(expires_at);
CREATE TABLE IF NOT EXISTS pileheads_profile_quota (
 day date PRIMARY KEY,
 hits integer NOT NULL CHECK(hits BETWEEN 1 AND 250)
);
COMMIT;
