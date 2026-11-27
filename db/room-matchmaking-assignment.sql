-- Internal assignment foundation; apply only after room-matchmaking-queue.sql.
BEGIN;
ALTER TABLE public.pileheads_match_offers ADD COLUMN room_code varchar(10) UNIQUE REFERENCES public.pilehead_rooms(code) ON DELETE CASCADE;
ALTER TABLE public.pileheads_match_offers ADD COLUMN seat_key_version text CHECK(seat_key_version ~ '^[A-Za-z0-9_-]{1,32}$');
ALTER TABLE public.pileheads_match_offers ADD CONSTRAINT assigned_offer_complete CHECK ((room_code IS NULL AND seat_key_version IS NULL) OR (room_code IS NOT NULL AND seat_key_version IS NOT NULL AND ready_a AND ready_b));
COMMIT;
