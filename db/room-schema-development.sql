-- Empty development databases only. Do not copy production data into preview environments.
-- Match the multiplayer schema; growth/waitlist schemas are deliberately separate.
BEGIN;
CREATE TABLE public.pilehead_rooms (
 code varchar(10) PRIMARY KEY,
 capacity smallint NOT NULL CHECK(capacity BETWEEN 2 AND 5),
 revision integer NOT NULL DEFAULT 0,
 status text NOT NULL CHECK(status IN ('lobby','playing','finished')),
 state jsonb NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 expires_at timestamptz NOT NULL DEFAULT now()+interval '24 hours'
);
CREATE TABLE public.pilehead_members (
 code varchar(10) NOT NULL REFERENCES public.pilehead_rooms(code) ON DELETE CASCADE,
 seat smallint NOT NULL CHECK(seat BETWEEN 0 AND 4),
 display_name varchar(24) NOT NULL,
 token_hash text NOT NULL UNIQUE,
 joined_at timestamptz NOT NULL DEFAULT now(),
 last_seen_at timestamptz NOT NULL DEFAULT now(),
 is_away boolean NOT NULL DEFAULT false,
 PRIMARY KEY(code,seat)
);
CREATE TABLE public.pilehead_rate_limits (
 bucket text PRIMARY KEY, hits integer NOT NULL DEFAULT 1, expires_at timestamptz NOT NULL
);
CREATE INDEX pilehead_rooms_expire ON public.pilehead_rooms(expires_at);
CREATE INDEX pilehead_members_token ON public.pilehead_members(token_hash);
CREATE INDEX pilehead_rate_limits_expire ON public.pilehead_rate_limits(expires_at);
COMMIT;
