BEGIN;
-- Test-mode orders are intentionally separate from real entitlements.
CREATE TABLE IF NOT EXISTS stack_test_orders(
 id uuid PRIMARY KEY,
 account_id uuid NOT NULL REFERENCES stack_accounts(id) ON DELETE CASCADE,
 amount integer NOT NULL CHECK(amount>0),
 currency text NOT NULL CHECK(currency ~ '^[a-z]{3}$'),
 stripe_session text UNIQUE,
 payment_intent text UNIQUE,
 created_at timestamptz NOT NULL DEFAULT now(),
 paid_at timestamptz
);
CREATE INDEX IF NOT EXISTS stack_test_order_account_idx ON stack_test_orders(account_id);
CREATE TABLE IF NOT EXISTS stack_test_refunds(
 payment_intent text PRIMARY KEY,
 received_at timestamptz NOT NULL DEFAULT now()
);
-- Serialize same-account redemptions so a second code is not consumed
-- for an already owned/revoked product.
CREATE OR REPLACE FUNCTION stack_redeem_code(p_account uuid,p_hash text)
RETURNS TABLE(product_id text) LANGUAGE plpgsql AS $$
DECLARE v_product text;
BEGIN
 PERFORM 1 FROM stack_accounts WHERE id=p_account FOR UPDATE;
 IF NOT FOUND THEN RETURN; END IF;
 SELECT c.product_id INTO v_product FROM stack_redemption_codes c
 WHERE c.code_hash=p_hash AND c.redeemed_at IS NULL AND (c.expires_at IS NULL OR c.expires_at>now()) FOR UPDATE;
 IF NOT FOUND OR EXISTS(SELECT 1 FROM stack_entitlements e WHERE e.account_id=p_account AND e.product_id=v_product) THEN RETURN; END IF;
 UPDATE stack_redemption_codes SET redeemed_at=now(),redeemed_by=p_account WHERE code_hash=p_hash;
 INSERT INTO stack_entitlements(account_id,product_id,source) VALUES(p_account,v_product,'redemption');
 RETURN QUERY SELECT v_product;
END;
$$;
COMMIT;
