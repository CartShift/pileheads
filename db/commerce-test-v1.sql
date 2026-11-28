-- Apply only to a dedicated disposable test database, never to production.
BEGIN;
CREATE SCHEMA pileheads_commerce_test;
REVOKE ALL ON SCHEMA pileheads_commerce_test FROM PUBLIC;
CREATE TABLE pileheads_commerce_test.orders (
 id uuid PRIMARY KEY,
 quantity integer NOT NULL CHECK(quantity BETWEEN 1 AND 10),
 amount_minor integer NOT NULL CHECK(amount_minor=quantity*1500),
 state text NOT NULL DEFAULT 'pending' CHECK(state IN ('pending','paid','expired')),
 session_id text UNIQUE,
 payment_id text UNIQUE,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 CHECK(state<>'paid' OR (session_id IS NOT NULL AND payment_id IS NOT NULL))
);
CREATE TABLE pileheads_commerce_test.events (
 event_id text PRIMARY KEY,
 order_id uuid NOT NULL REFERENCES pileheads_commerce_test.orders(id),
 state text NOT NULL CHECK(state IN ('paid','expired')),
 created_at timestamptz NOT NULL DEFAULT now()
);
-- Serialize new test orders and cap sandbox usage; retries don't consume quota.
CREATE FUNCTION pileheads_commerce_test.start_order(p_id uuid,p_quantity integer)
RETURNS SETOF pileheads_commerce_test.orders LANGUAGE plpgsql SECURITY INVOKER AS $$
BEGIN
 PERFORM pg_advisory_xact_lock(52731409);
 IF NOT EXISTS(SELECT 1 FROM pileheads_commerce_test.orders WHERE id=p_id) THEN
  IF (SELECT count(*) FROM pileheads_commerce_test.orders WHERE created_at>=now()-interval '24 hours')>=100 THEN RETURN; END IF;
  INSERT INTO pileheads_commerce_test.orders(id,quantity,amount_minor) VALUES(p_id,p_quantity,p_quantity*1500);
 END IF;
 RETURN QUERY SELECT * FROM pileheads_commerce_test.orders WHERE id=p_id AND quantity=p_quantity AND state='pending' AND created_at>=now()-interval '1 hour';
END;
$$;
REVOKE ALL ON FUNCTION pileheads_commerce_test.start_order(uuid,integer) FROM PUBLIC;
REVOKE ALL ON ALL TABLES IN SCHEMA pileheads_commerce_test FROM PUBLIC;
COMMIT;
