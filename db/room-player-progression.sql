-- Private casual progression, not ranked rating or redeemable currency.
BEGIN;
ALTER TABLE public.pileheads_round_consents ADD COLUMN IF NOT EXISTS progression_opt_in boolean NOT NULL DEFAULT false;
CREATE TABLE IF NOT EXISTS public.pileheads_player_progression (
 account_id uuid PRIMARY KEY REFERENCES public.pileheads_accounts(id) ON DELETE CASCADE,
 total_xp bigint NOT NULL CHECK(total_xp>=0 AND total_xp<=9007199254740990 AND total_xp%10=0),
 award_day date NOT NULL,
 daily_xp smallint NOT NULL CHECK(daily_xp BETWEEN 0 AND 50 AND daily_xp%10=0),
 CHECK(total_xp>=daily_xp)
);
COMMIT;
