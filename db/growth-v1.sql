-- Explicit owner-approved migration only. No schema changes at runtime.
-- Use a scoped database role; do not grant the growth service access to rooms.
CREATE TABLE IF NOT EXISTS pileheads_growth_reports (
  id uuid PRIMARY KEY,
  report jsonb NOT NULL,
  attribution jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS pileheads_growth_reports_created ON pileheads_growth_reports(created_at);
CREATE TABLE IF NOT EXISTS pileheads_growth_quota (
  day date NOT NULL,
  kind text NOT NULL CHECK (kind IN ('report','waitlist')),
  hits integer NOT NULL CHECK (hits >= 0),
  PRIMARY KEY(day,kind)
);
CREATE TABLE IF NOT EXISTS pileheads_waitlist (
  email text PRIMARY KEY CHECK (length(email) <= 254),
  confirm_hash text UNIQUE,
  unsubscribe_hash text UNIQUE NOT NULL,
  requested_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  confirmed_at timestamptz
);
-- Run separately on the approved retention schedule, not on deploy:
-- DELETE FROM pileheads_growth_reports WHERE created_at < now() - interval '30 days';
-- DELETE FROM pileheads_growth_quota WHERE day < current_date - 2;
-- DELETE FROM pileheads_waitlist WHERE confirmed_at IS NULL AND expires_at < now();
-- Confirmed-address retention and deletion on campaign closure require owner approval.
