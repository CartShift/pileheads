-- Disposable sandbox only, after commerce-test-v1.sql. No production migration.
BEGIN;
ALTER TABLE pileheads_commerce_test.orders ADD COLUMN fulfillment_state text NOT NULL DEFAULT 'unfulfilled'
 CHECK(fulfillment_state IN ('unfulfilled','packed','shipped'));
ALTER TABLE pileheads_commerce_test.orders ADD CHECK(fulfillment_state='unfulfilled' OR state='paid');
CREATE TABLE pileheads_commerce_test.fulfillment_events (
 id uuid PRIMARY KEY,
 order_id uuid NOT NULL REFERENCES pileheads_commerce_test.orders(id),
 from_state text NOT NULL,
 to_state text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 CHECK((from_state='unfulfilled' AND to_state='packed') OR (from_state='packed' AND to_state='shipped'))
);
CREATE TABLE pileheads_commerce_test.stock (
 singleton boolean PRIMARY KEY DEFAULT true CHECK(singleton),
 units integer NOT NULL CHECK(units BETWEEN 0 AND 100000),
 low_threshold integer NOT NULL CHECK(low_threshold BETWEEN 0 AND 100000),
 version integer NOT NULL DEFAULT 0 CHECK(version>=0)
);
INSERT INTO pileheads_commerce_test.stock(singleton,units,low_threshold) VALUES(true,0,10);
CREATE TABLE pileheads_commerce_test.stock_events (
 id uuid PRIMARY KEY,
 delta integer NOT NULL CHECK(delta<>0 AND delta BETWEEN -100000 AND 100000),
 reason text NOT NULL CHECK(reason IN ('count_correction','test_receipt')),
 expected_version integer NOT NULL CHECK(expected_version>=0),
 resulting_units integer NOT NULL CHECK(resulting_units BETWEEN 0 AND 100000),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE FUNCTION pileheads_commerce_test.advance_order(p_event uuid,p_order uuid,p_expected text,p_next text)
RETURNS boolean LANGUAGE plpgsql SECURITY INVOKER AS $advance$
DECLARE current_state text; pay_state text;
BEGIN
 SELECT fulfillment_state,state INTO current_state,pay_state FROM pileheads_commerce_test.orders WHERE id=p_order FOR UPDATE;
 IF EXISTS(SELECT 1 FROM pileheads_commerce_test.fulfillment_events WHERE id=p_event) THEN
  RETURN EXISTS(SELECT 1 FROM pileheads_commerce_test.fulfillment_events WHERE id=p_event AND order_id=p_order AND from_state=p_expected AND to_state=p_next);
 END IF;
 IF pay_state IS DISTINCT FROM 'paid' OR current_state IS DISTINCT FROM p_expected THEN RETURN false; END IF;
 IF NOT ((p_expected='unfulfilled' AND p_next='packed') OR (p_expected='packed' AND p_next='shipped')) THEN RETURN false; END IF;
 INSERT INTO pileheads_commerce_test.fulfillment_events(id,order_id,from_state,to_state) VALUES(p_event,p_order,p_expected,p_next);
 UPDATE pileheads_commerce_test.orders SET fulfillment_state=p_next,updated_at=now() WHERE id=p_order;
 RETURN true;
END;
$advance$;
REVOKE ALL ON FUNCTION pileheads_commerce_test.advance_order(uuid,uuid,text,text) FROM PUBLIC;
CREATE FUNCTION pileheads_commerce_test.adjust_stock(p_event uuid,p_delta integer,p_version integer,p_reason text)
RETURNS boolean LANGUAGE plpgsql SECURITY INVOKER AS $adjust$
DECLARE current_units integer; current_version integer;
BEGIN
 SELECT units,version INTO current_units,current_version FROM pileheads_commerce_test.stock WHERE singleton FOR UPDATE;
 IF NOT FOUND THEN RETURN false; END IF;
 IF EXISTS(SELECT 1 FROM pileheads_commerce_test.stock_events WHERE id=p_event) THEN
  RETURN EXISTS(SELECT 1 FROM pileheads_commerce_test.stock_events WHERE id=p_event AND delta=p_delta AND reason=p_reason AND expected_version=p_version);
 END IF;
 IF p_delta IS NULL OR p_delta=0 OR p_delta NOT BETWEEN -100000 AND 100000 OR p_version IS DISTINCT FROM current_version OR p_reason IS NULL OR p_reason NOT IN ('count_correction','test_receipt') OR (p_reason='test_receipt' AND p_delta<0) OR current_version=2147483647 THEN RETURN false; END IF;
 IF current_units+p_delta NOT BETWEEN 0 AND 100000 THEN RETURN false; END IF;
 UPDATE pileheads_commerce_test.stock SET units=units+p_delta,version=version+1 WHERE singleton;
 INSERT INTO pileheads_commerce_test.stock_events(id,delta,reason,expected_version,resulting_units) VALUES(p_event,p_delta,p_reason,p_version,current_units+p_delta);
 RETURN true;
END;
$adjust$;
REVOKE ALL ON FUNCTION pileheads_commerce_test.adjust_stock(uuid,integer,integer,text) FROM PUBLIC;
-- Fulfillment is a rehearsal only. No real inventory is allocated or shipped.
REVOKE ALL ON ALL TABLES IN SCHEMA pileheads_commerce_test FROM PUBLIC;
COMMIT;
