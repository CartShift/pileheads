-- Apply explicitly before enabling guest profiles. No gameplay or analytics table changes.
BEGIN;
CREATE TABLE IF NOT EXISTS stack_guest_players (
  id uuid PRIMARY KEY,
  token_hash text NOT NULL UNIQUE CHECK (token_hash ~ '^[0-9a-f]{64}$'),
  preferred_deck text NOT NULL DEFAULT 'characters' CHECK (preferred_deck IN ('characters','original')),
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now()+interval '90 days')
);
CREATE INDEX IF NOT EXISTS stack_guest_players_expiry_idx ON stack_guest_players(expires_at);
COMMIT;
