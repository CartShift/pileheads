-- Apply explicitly before enabling analytics. No gameplay tables changed.
BEGIN;
CREATE TABLE IF NOT EXISTS stack_product_events (
  id uuid PRIMARY KEY,
  event text NOT NULL CHECK (event IN ('landing_view','catalog_view','lobby_view','deck_selected','round_started','round_completed','rematch_requested','invite_copied')),
  mode text CHECK (mode IN ('local','online')),
  deck text CHECK (deck IN ('refined','characters','original')),
  received_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((event IN ('round_started','round_completed','rematch_requested','invite_copied')) = (mode IS NOT NULL)),
  CHECK ((event IN ('deck_selected','round_started','round_completed','rematch_requested','invite_copied')) = (deck IS NOT NULL)),
  CHECK (event <> 'invite_copied' OR mode = 'online')
);
CREATE INDEX IF NOT EXISTS stack_product_events_received_at_idx ON stack_product_events(received_at);
COMMIT;
