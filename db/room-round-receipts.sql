-- Isolated acceptance and explicit operator migration only.
BEGIN;
CREATE TABLE IF NOT EXISTS public.pileheads_round_receipts (
 room_instance_id uuid NOT NULL,
 round_no integer NOT NULL CHECK(round_no>=1),
 scoring_version smallint NOT NULL DEFAULT 1 CHECK(scoring_version=1),
 rules_version text NOT NULL CHECK(rules_version ~ '^pilehead-[0-9]+\.[0-9]+\.[0-9]+$'),
 endgame_rule text NOT NULL CHECK(endgame_rule IN ('classic','final-duel')),
 round_limit smallint CHECK(round_limit IN (3,5,10) AND round_no<=round_limit),
 player_count smallint NOT NULL CHECK(player_count BETWEEN 2 AND 5),
 human_count smallint NOT NULL CHECK(human_count BETWEEN 1 AND player_count),
 placements smallint[] NOT NULL CHECK(cardinality(placements)=player_count AND array_ndims(placements)=1 AND array_lower(placements,1)=1 AND
   placements @> CASE player_count
    WHEN 2 THEN ARRAY[1,2]::smallint[]
    WHEN 3 THEN ARRAY[1,2,3]::smallint[]
    WHEN 4 THEN ARRAY[1,2,3,4]::smallint[]
    WHEN 5 THEN ARRAY[1,2,3,4,5]::smallint[]
   END),
 moves integer NOT NULL CHECK(moves>=0),
 recorded_at timestamptz NOT NULL DEFAULT now(),
 expires_at timestamptz NOT NULL DEFAULT (now()+interval '90 days') CHECK(expires_at>recorded_at),
 PRIMARY KEY(room_instance_id,round_no)
);
CREATE INDEX IF NOT EXISTS pileheads_round_receipts_expiry_idx ON public.pileheads_round_receipts(expires_at);
COMMIT;
