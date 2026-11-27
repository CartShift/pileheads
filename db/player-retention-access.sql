-- Run as database administrator after player and account schemas exist.
BEGIN;
CREATE ROLE pileheads_player_maintenance_access NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
GRANT USAGE ON SCHEMA public TO pileheads_player_maintenance_access;
GRANT SELECT,DELETE ON public.pileheads_guest_profiles,public.pileheads_account_sessions,public.pileheads_profile_quota TO pileheads_player_maintenance_access;
COMMIT;
-- Create a separate login securely, grant CONNECT and membership in the group.
-- Do not grant access to persistent accounts or provider identifiers.
