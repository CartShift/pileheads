-- Internal queue/offer foundation. No public admission or room assignment.
BEGIN;
CREATE TABLE public.pileheads_match_offers (
 id uuid PRIMARY KEY,
 account_a uuid NOT NULL REFERENCES public.pileheads_accounts(id) ON DELETE CASCADE,
 account_b uuid NOT NULL REFERENCES public.pileheads_accounts(id) ON DELETE CASCADE,
 ready_a boolean NOT NULL DEFAULT false,
 ready_b boolean NOT NULL DEFAULT false,
 created_at timestamptz NOT NULL DEFAULT now(),
 expires_at timestamptz NOT NULL DEFAULT now()+interval '20 seconds',
 CHECK(account_a<>account_b),
 CHECK(expires_at>created_at)
);
CREATE INDEX pileheads_match_offers_a_idx ON public.pileheads_match_offers(account_a);
CREATE INDEX pileheads_match_offers_b_idx ON public.pileheads_match_offers(account_b);
CREATE INDEX pileheads_match_offers_expiry_idx ON public.pileheads_match_offers(expires_at);
CREATE TABLE public.pileheads_queue_tickets (
 account_id uuid PRIMARY KEY REFERENCES public.pileheads_accounts(id) ON DELETE CASCADE,
 ticket_id uuid NOT NULL UNIQUE,
 joined_at timestamptz NOT NULL DEFAULT now(),
 expires_at timestamptz NOT NULL DEFAULT now()+interval '5 minutes',
 offer_id uuid REFERENCES public.pileheads_match_offers(id) ON DELETE CASCADE,
 CHECK(expires_at>joined_at)
);
CREATE INDEX pileheads_queue_waiting_idx ON public.pileheads_queue_tickets(joined_at,account_id) WHERE offer_id IS NULL;
CREATE INDEX pileheads_queue_expiry_idx ON public.pileheads_queue_tickets(expires_at);
CREATE INDEX pileheads_queue_offer_idx ON public.pileheads_queue_tickets(offer_id);
-- Internal block relationship contract; no public moderation endpoint yet.
CREATE TABLE public.pileheads_match_blocks (
 account_id uuid NOT NULL REFERENCES public.pileheads_accounts(id) ON DELETE CASCADE,
 blocked_account_id uuid NOT NULL REFERENCES public.pileheads_accounts(id) ON DELETE CASCADE,
 PRIMARY KEY(account_id,blocked_account_id),
 CHECK(account_id<>blocked_account_id)
);
CREATE INDEX pileheads_match_blocks_reverse_idx ON public.pileheads_match_blocks(blocked_account_id);
COMMIT;
