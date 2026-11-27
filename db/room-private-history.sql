-- Opt-in private casual history. Apply only after room receipts and accounts,
-- in the SAME PostgreSQL database. No client-visible account or room IDs.
BEGIN;
CREATE TABLE public.pileheads_round_consents (
 code varchar(10) NOT NULL,
 seat smallint NOT NULL CHECK(seat BETWEEN 0 AND 4),
 room_instance_id uuid NOT NULL,
 round_no integer NOT NULL CHECK(round_no>=1),
 account_id uuid NOT NULL REFERENCES public.pileheads_accounts(id) ON DELETE CASCADE,
 consented_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(code,seat,round_no),
 UNIQUE(room_instance_id,round_no,account_id),
 FOREIGN KEY(code,seat) REFERENCES public.pilehead_members(code,seat) ON DELETE CASCADE
);
CREATE INDEX pileheads_round_consents_account_idx ON public.pileheads_round_consents(account_id);
CREATE TABLE public.pileheads_player_rounds (
 room_instance_id uuid NOT NULL,
 round_no integer NOT NULL,
 account_id uuid NOT NULL REFERENCES public.pileheads_accounts(id) ON DELETE CASCADE,
 seat smallint NOT NULL CHECK(seat BETWEEN 0 AND 4),
 PRIMARY KEY(room_instance_id,round_no,account_id),
 UNIQUE(room_instance_id,round_no,seat),
 FOREIGN KEY(room_instance_id,round_no) REFERENCES public.pileheads_round_receipts(room_instance_id,round_no) ON DELETE CASCADE
);
CREATE INDEX pileheads_player_rounds_account_idx ON public.pileheads_player_rounds(account_id);
COMMIT;
