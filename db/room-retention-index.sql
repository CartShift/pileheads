-- Apply explicitly as a database administrator, separately from application deploys.
-- Test on an isolated database first. CONCURRENTLY cannot run in a transaction.
CREATE INDEX CONCURRENTLY IF NOT EXISTS pilehead_rate_limits_expire
  ON public.pilehead_rate_limits (expires_at);
