BEGIN;
CREATE TABLE IF NOT EXISTS stack_accounts(
 id uuid PRIMARY KEY,
 google_subject text NOT NULL UNIQUE CHECK(length(google_subject) BETWEEN 1 AND 255),
 preferred_deck text NOT NULL DEFAULT 'characters' CHECK(preferred_deck IN ('characters','original')),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS stack_account_sessions(
 token_hash text PRIMARY KEY CHECK(token_hash ~ '^[a-f0-9]{64}$'),
 account_id uuid NOT NULL REFERENCES stack_accounts(id) ON DELETE CASCADE,
 expires_at timestamptz NOT NULL DEFAULT(now()+interval '30 days')
);
CREATE INDEX IF NOT EXISTS stack_account_sessions_account_idx ON stack_account_sessions(account_id);
CREATE INDEX IF NOT EXISTS stack_account_sessions_expiry_idx ON stack_account_sessions(expires_at);
CREATE TABLE IF NOT EXISTS stack_products(
 id text PRIMARY KEY,
 name text NOT NULL
);
INSERT INTO stack_products(id,name) VALUES('founder-supporter','Founder supporter') ON CONFLICT DO NOTHING;
CREATE TABLE IF NOT EXISTS stack_entitlements(
 account_id uuid NOT NULL REFERENCES stack_accounts(id) ON DELETE CASCADE,
 product_id text NOT NULL REFERENCES stack_products(id),
 source text NOT NULL CHECK(source IN ('redemption','manual')),
 granted_at timestamptz NOT NULL DEFAULT now(),
 revoked_at timestamptz,
 PRIMARY KEY(account_id,product_id)
);
CREATE TABLE IF NOT EXISTS stack_redemption_codes(
 code_hash text PRIMARY KEY CHECK(code_hash ~ '^[a-f0-9]{64}$'),
 product_id text NOT NULL REFERENCES stack_products(id),
 batch_id text NOT NULL CHECK(length(batch_id) BETWEEN 1 AND 80),
 created_at timestamptz NOT NULL DEFAULT now(),
 expires_at timestamptz,
 redeemed_at timestamptz,
 redeemed_by uuid REFERENCES stack_accounts(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS stack_redemption_batch_idx ON stack_redemption_codes(batch_id);
CREATE INDEX IF NOT EXISTS stack_redemption_account_idx ON stack_redemption_codes(redeemed_by);
COMMIT;
