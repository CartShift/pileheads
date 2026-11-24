-- Internal aggregate reports, execute only with authorized read access.
SELECT product_id,count(*) FILTER(WHERE revoked_at IS NULL) AS active_grants,count(*) FILTER(WHERE revoked_at IS NOT NULL) AS revoked_grants FROM stack_entitlements GROUP BY 1;
SELECT batch_id,product_id,count(*) AS issued,count(*) FILTER(WHERE redeemed_at IS NOT NULL) AS redeemed FROM stack_redemption_codes GROUP BY 1,2 ORDER BY 1,2;
SELECT currency,count(*) AS test_orders,count(*) FILTER(WHERE paid_at IS NOT NULL) AS test_paid FROM stack_test_orders GROUP BY 1;
-- Never expose individual accounts, session hashes or redemption hashes to partners.
