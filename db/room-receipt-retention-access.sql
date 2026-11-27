-- Requires existing room maintenance role and round receipt schema.
BEGIN;
GRANT SELECT,DELETE ON public.pileheads_round_receipts TO pileheads_maintenance_access;
COMMIT;
-- If personal round associations exist, their FK cascade removes them
-- automatically. The maintenance login does not need account privileges.
