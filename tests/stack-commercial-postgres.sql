-- Executed in a fresh throwaway schema in a single transaction.
DO $verify$
DECLARE
 a uuid:='12345678-1234-4234-8234-123456789abc';
 b uuid:='22345678-1234-4234-8234-123456789abc';
 code1 text:=repeat('a',64);
 code2 text:=repeat('b',64);
 code3 text:=repeat('c',64);
 n integer;
BEGIN
 INSERT INTO stack_accounts(id,google_subject) VALUES(a,'test-subject-a'),(b,'test-subject-b');
 INSERT INTO stack_account_sessions(token_hash,account_id) VALUES(repeat('d',64),a);
 INSERT INTO stack_redemption_codes(code_hash,product_id,batch_id) VALUES(code1,'founder-supporter','test'),(code2,'founder-supporter','test'),(code3,'founder-supporter','test');
 SELECT count(*) INTO n FROM stack_redeem_code(a,code1);
 IF n<>1 THEN RAISE EXCEPTION 'first redemption failed'; END IF;
 SELECT count(*) INTO n FROM stack_redeem_code(b,code1);
 IF n<>0 THEN RAISE EXCEPTION 'code reused'; END IF;
 SELECT count(*) INTO n FROM stack_redeem_code(a,code2);
 IF n<>0 OR EXISTS(SELECT 1 FROM stack_redemption_codes WHERE code_hash=code2 AND redeemed_at IS NOT NULL) THEN RAISE EXCEPTION 'duplicate ownership consumed code'; END IF;
 IF NOT stack_admin_entitlement(a,'founder-supporter','revoke','refund') THEN RAISE EXCEPTION 'revoke failed'; END IF;
 IF EXISTS(SELECT 1 FROM stack_entitlements WHERE account_id=a AND revoked_at IS NULL) THEN RAISE EXCEPTION 'revocation not enforced'; END IF;
 SELECT count(*) INTO n FROM stack_redeem_code(a,code3);
 IF n<>0 OR EXISTS(SELECT 1 FROM stack_redemption_codes WHERE code_hash=code3 AND redeemed_at IS NOT NULL) THEN RAISE EXCEPTION 'revoked account consumed another code'; END IF;
 IF NOT stack_admin_entitlement(a,'founder-supporter','restore','correction') THEN RAISE EXCEPTION 'restore failed'; END IF;
 IF stack_admin_entitlement(a,'founder-supporter','restore','correction') THEN RAISE EXCEPTION 'no-op restore changed row'; END IF;
 SELECT count(*) INTO n FROM stack_entitlement_audit WHERE account_id=a;
 IF n<>2 THEN RAISE EXCEPTION 'audit mismatch'; END IF;
 INSERT INTO stack_test_refunds(payment_intent) VALUES('pi_test_before_payment');
 INSERT INTO stack_test_orders(id,account_id,amount,currency,paid_at,payment_intent) VALUES('32345678-1234-4234-8234-123456789abc',a,299,'eur',now(),'pi_test_before_payment');
 IF EXISTS(SELECT 1 FROM stack_test_orders o WHERE o.account_id=a AND o.paid_at IS NOT NULL AND NOT EXISTS(SELECT 1 FROM stack_test_refunds r WHERE r.payment_intent=o.payment_intent)) THEN RAISE EXCEPTION 'refund before payment not suppressed'; END IF;
 DELETE FROM stack_accounts WHERE id=a;
 IF EXISTS(SELECT 1 FROM stack_account_sessions WHERE account_id=a) OR EXISTS(SELECT 1 FROM stack_entitlements WHERE account_id=a) OR EXISTS(SELECT 1 FROM stack_test_orders WHERE account_id=a) THEN RAISE EXCEPTION 'account deletion cascade failed'; END IF;
 IF NOT EXISTS(SELECT 1 FROM stack_redemption_codes WHERE code_hash=code1 AND redeemed_at IS NOT NULL AND redeemed_by IS NULL) THEN RAISE EXCEPTION 'consumed code deletion invariant failed'; END IF;
 SELECT count(*) INTO n FROM stack_entitlement_audit WHERE account_id IS NULL;
 IF n<>2 THEN RAISE EXCEPTION 'audit account reference not anonymized'; END IF;
END;
$verify$;
