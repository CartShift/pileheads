-- Run once as database administrator in an isolated preview database after
-- all player/history/progression/matchmaking migrations and room roles exist.
-- This script deliberately creates no LOGIN, password, or production connection.
BEGIN;
CREATE ROLE pileheads_player_runtime_access NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
GRANT USAGE ON SCHEMA public TO pileheads_player_runtime_access;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.pileheads_guest_profiles,public.pileheads_accounts,public.pileheads_account_sessions TO pileheads_player_runtime_access;
GRANT SELECT,INSERT,UPDATE ON public.pileheads_profile_quota TO pileheads_player_runtime_access;
GRANT SELECT ON public.pileheads_player_rounds,public.pileheads_round_receipts,public.pileheads_player_progression TO pileheads_player_runtime_access;
GRANT SELECT(token_hash,account_id,expires_at) ON public.pileheads_account_sessions TO pileheads_runtime_access;
GRANT INSERT,SELECT(room_instance_id) ON public.pileheads_round_receipts TO pileheads_runtime_access;
GRANT SELECT,INSERT,DELETE ON public.pileheads_round_consents TO pileheads_runtime_access;
GRANT INSERT,SELECT(account_id,seat) ON public.pileheads_player_rounds TO pileheads_runtime_access;
GRANT SELECT,INSERT,UPDATE ON public.pileheads_player_progression TO pileheads_runtime_access;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.pileheads_queue_tickets,public.pileheads_match_offers TO pileheads_runtime_access;
GRANT SELECT ON public.pileheads_match_blocks TO pileheads_runtime_access;
COMMIT;
