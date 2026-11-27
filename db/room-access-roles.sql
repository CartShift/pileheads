-- Run once as an administrator in the intended database.
-- NOLOGIN groups intentionally have no credentials.
BEGIN;
CREATE ROLE pileheads_runtime_access NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
CREATE ROLE pileheads_maintenance_access NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
GRANT USAGE ON SCHEMA public TO pileheads_runtime_access,pileheads_maintenance_access;
GRANT SELECT,INSERT,UPDATE ON public.pilehead_rooms,public.pilehead_members,public.pilehead_rate_limits TO pileheads_runtime_access;
GRANT SELECT,DELETE ON public.pilehead_rooms,public.pilehead_rate_limits TO pileheads_maintenance_access;
COMMIT;
-- Grant CONNECT on the intended database, then provision separate login roles
-- securely and grant the relevant group to each. Never grant the owner role.
