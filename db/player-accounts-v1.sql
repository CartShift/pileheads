-- Account persistence only; no provider endpoint, purchase or room linkage.
BEGIN;
CREATE TABLE IF NOT EXISTS public.pileheads_accounts (
 id uuid PRIMARY KEY,
 provider text NOT NULL CHECK(provider='google'),
 provider_subject text NOT NULL CHECK(char_length(provider_subject) BETWEEN 1 AND 255),
 display_name text NOT NULL DEFAULT 'Player' CHECK(char_length(display_name) BETWEEN 1 AND 24),
 preferred_deck text NOT NULL DEFAULT 'refined' CHECK(preferred_deck IN ('refined','characters','original')),
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(provider,provider_subject)
);
CREATE TABLE IF NOT EXISTS public.pileheads_account_sessions (
 token_hash text PRIMARY KEY CHECK(token_hash ~ '^[0-9a-f]{64}$'),
 account_id uuid NOT NULL REFERENCES public.pileheads_accounts(id) ON DELETE CASCADE,
 created_at timestamptz NOT NULL DEFAULT now(),
 expires_at timestamptz NOT NULL DEFAULT(now()+interval '30 days')
);
CREATE INDEX IF NOT EXISTS pileheads_account_sessions_account_idx ON public.pileheads_account_sessions(account_id);
CREATE INDEX IF NOT EXISTS pileheads_account_sessions_expiry_idx ON public.pileheads_account_sessions(expires_at);
COMMIT;
