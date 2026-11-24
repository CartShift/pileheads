BEGIN;
CREATE TABLE IF NOT EXISTS stack_entitlement_audit(
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 account_id uuid REFERENCES stack_accounts(id) ON DELETE SET NULL,
 product_id text NOT NULL REFERENCES stack_products(id),
 action text NOT NULL CHECK(action IN ('grant','revoke','restore')),
 reason text NOT NULL CHECK(reason IN ('support','promotion','correction','refund','abuse')),
 operator_role text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE OR REPLACE FUNCTION stack_admin_entitlement(p_account uuid,p_product text,p_action text,p_reason text)
RETURNS boolean LANGUAGE plpgsql SECURITY INVOKER AS $$
DECLARE changed integer;
BEGIN
 IF p_action NOT IN ('grant','revoke','restore') OR p_action IS NULL OR p_reason NOT IN ('support','promotion','correction','refund','abuse') OR p_reason IS NULL THEN RAISE EXCEPTION 'invalid admin action'; END IF;
 PERFORM 1 FROM stack_accounts WHERE id=p_account FOR UPDATE;
 IF NOT FOUND THEN RETURN false; END IF;
 IF p_action='grant' THEN
  INSERT INTO stack_entitlements(account_id,product_id,source) VALUES(p_account,p_product,'manual') ON CONFLICT DO NOTHING;
 ELSIF p_action='revoke' THEN
  UPDATE stack_entitlements SET revoked_at=now() WHERE account_id=p_account AND product_id=p_product AND revoked_at IS NULL;
 ELSE
  UPDATE stack_entitlements SET revoked_at=NULL WHERE account_id=p_account AND product_id=p_product AND revoked_at IS NOT NULL;
 END IF;
 GET DIAGNOSTICS changed=ROW_COUNT;
 IF changed=0 THEN RETURN false; END IF;
 INSERT INTO stack_entitlement_audit(account_id,product_id,action,reason,operator_role) VALUES(p_account,p_product,p_action,p_reason,current_user);
 RETURN true;
END;
$$;
REVOKE ALL ON FUNCTION stack_admin_entitlement(uuid,text,text,text) FROM PUBLIC;
COMMIT;
