-- Apply only after the growth v1 migration and approval.
-- Each row is one opted-in browser session, not a person. Tokens are hashed.
CREATE TABLE IF NOT EXISTS pileheads_funnel_sessions (
  id uuid PRIMARY KEY,
  token_hash text NOT NULL,
  notice_version text NOT NULL,
  source text CHECK(source IN ('instagram','tiktok','youtube','community','creator','player_share')),
  medium text CHECK(medium IN ('organic_social','community','creator','referral')),
  campaign text CHECK(campaign IN ('launch','playtest','round_result')),
  entry text NOT NULL CHECK(entry IN ('home','play','invite')),
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT now()+interval '24 hours',
  play_opened boolean NOT NULL DEFAULT false,
  first_started boolean NOT NULL DEFAULT false,
  first_completed boolean NOT NULL DEFAULT false,
  rematch_started boolean NOT NULL DEFAULT false,
  invite_copied boolean NOT NULL DEFAULT false,
  room_joined boolean NOT NULL DEFAULT false,
  result_shared boolean NOT NULL DEFAULT false,
  CHECK(NOT first_started OR play_opened),
  CHECK(NOT first_completed OR first_started),
  CHECK(NOT rematch_started OR first_completed),
  CHECK(NOT result_shared OR first_completed)
);
CREATE INDEX IF NOT EXISTS pileheads_funnel_created ON pileheads_funnel_sessions(created_at);
CREATE TABLE IF NOT EXISTS pileheads_funnel_quota (
  day date PRIMARY KEY,
  hits integer NOT NULL CHECK(hits>=0)
);
-- Schedule and verify deletion before enabling:
-- DELETE FROM pileheads_funnel_sessions WHERE created_at<now()-interval '30 days';
-- DELETE FROM pileheads_funnel_quota WHERE day<current_date-2;
