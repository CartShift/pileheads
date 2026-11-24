-- Read-only, aggregate event counts, not unique users or authoritative matches.
SELECT (received_at AT TIME ZONE 'UTC')::date AS day,
       event, mode, deck, count(*) AS observations
FROM stack_product_events
WHERE received_at >= now() - interval '30 days'
GROUP BY 1,2,3,4 ORDER BY 1 DESC,2,3,4;

-- Manual retention maintenance when ingestion is disabled or idle:
-- DELETE FROM stack_product_events WHERE received_at < now() - interval '30 days';
