-- Owner-approved migration only. No live checkout or runtime grants.
BEGIN;
CREATE SCHEMA pileheads_commerce;
REVOKE ALL ON SCHEMA pileheads_commerce FROM PUBLIC;
CREATE TABLE pileheads_commerce.products (
 sku text PRIMARY KEY CHECK(sku ~ '^[A-Z0-9][A-Z0-9-]{0,63}$'),
 name text NOT NULL,
 kind text NOT NULL CHECK(kind IN ('physical','digital')),
 status text NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','active','retired'))
);
CREATE TABLE pileheads_commerce.offers (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 sku text NOT NULL REFERENCES pileheads_commerce.products(sku),
 currency text NOT NULL CHECK(currency='EUR'),
 unit_minor integer NOT NULL CHECK(unit_minor BETWEEN 1 AND 100000000),
 provider_price_id text UNIQUE,
 active boolean NOT NULL DEFAULT false,
 created_at timestamptz NOT NULL DEFAULT now(),
 CHECK(NOT active OR provider_price_id IS NOT NULL)
);
CREATE UNIQUE INDEX one_active_offer_per_sku ON pileheads_commerce.offers(sku) WHERE active;
CREATE TABLE pileheads_commerce.inventory (
 sku text PRIMARY KEY REFERENCES pileheads_commerce.products(sku),
 on_hand integer NOT NULL DEFAULT 0 CHECK(on_hand>=0),
 reserved integer NOT NULL DEFAULT 0 CHECK(reserved>=0 AND reserved<=on_hand)
);
CREATE TABLE pileheads_commerce.orders (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 channel text NOT NULL DEFAULT 'direct' CHECK(channel IN ('direct','wholesale')),
 payment_state text NOT NULL DEFAULT 'pending' CHECK(payment_state IN ('pending','paid','failed','expired','partially_refunded','refunded')),
 fulfillment_state text NOT NULL DEFAULT 'unfulfilled' CHECK(fulfillment_state IN ('unfulfilled','processing','shipped','delivered','cancelled','returned')),
 currency text NOT NULL CHECK(currency='EUR'),
 subtotal_minor integer NOT NULL CHECK(subtotal_minor>=0),
 shipping_minor integer NOT NULL CHECK(shipping_minor>=0),
 tax_minor integer NOT NULL CHECK(tax_minor>=0),
 -- Explicit gross total; tax may be inclusive, so do not sum it twice.
 total_minor integer NOT NULL CHECK(total_minor>=0 AND tax_minor<=total_minor),
 provider_session_id text UNIQUE,
 provider_payment_id text UNIQUE,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE pileheads_commerce.order_lines (
 order_id uuid NOT NULL REFERENCES pileheads_commerce.orders(id),
 sku text NOT NULL REFERENCES pileheads_commerce.products(sku),
 offer_id uuid NOT NULL REFERENCES pileheads_commerce.offers(id),
 product_name text NOT NULL,
 quantity integer NOT NULL CHECK(quantity BETWEEN 1 AND 1000000),
 unit_minor integer NOT NULL CHECK(unit_minor BETWEEN 1 AND 100000000),
 PRIMARY KEY(order_id,sku)
);
CREATE TABLE pileheads_commerce.payment_events (
 provider_event_id text PRIMARY KEY,
 event_type text NOT NULL,
 processed_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO pileheads_commerce.products(sku,name,kind) VALUES ('PH-ORIGINAL-01','PILEHEADS Original Deck','physical');
INSERT INTO pileheads_commerce.inventory(sku) VALUES ('PH-ORIGINAL-01');
REVOKE ALL ON ALL TABLES IN SCHEMA pileheads_commerce FROM PUBLIC;
COMMIT;
