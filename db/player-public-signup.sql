-- Open beta signup budget. Counts new registration attempts, not existing sign-ins.
BEGIN;
CREATE TABLE public.pileheads_account_signup_quota (
 day date PRIMARY KEY,
 hits integer NOT NULL CHECK(hits BETWEEN 1 AND 250)
);
GRANT SELECT,INSERT,UPDATE ON public.pileheads_account_signup_quota TO pileheads_player_runtime_access;
COMMIT;
