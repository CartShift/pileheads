-- Operator-owned configuration; no runtime write access, default OFF.
BEGIN;
CREATE TABLE public.pileheads_product_settings (
 singleton boolean PRIMARY KEY DEFAULT true CHECK(singleton),
 database_id uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),
 privacy_reviewed boolean NOT NULL DEFAULT false,
 guest_profiles boolean NOT NULL DEFAULT false,
 accounts boolean NOT NULL DEFAULT false,
 round_history boolean NOT NULL DEFAULT false,
 private_history boolean NOT NULL DEFAULT false,
 progression boolean NOT NULL DEFAULT false,
 quick_play boolean NOT NULL DEFAULT false,
 pilot_accounts uuid[] NOT NULL DEFAULT '{}' CHECK(cardinality(pilot_accounts)<=50 AND array_position(pilot_accounts,NULL) IS NULL),
 CHECK(NOT accounts OR privacy_reviewed),
 CHECK(NOT guest_profiles OR privacy_reviewed),
 CHECK(NOT private_history OR (round_history AND accounts)),
 CHECK(NOT progression OR private_history),
 CHECK(NOT quick_play OR (accounts AND cardinality(pilot_accounts)>0))
);
INSERT INTO public.pileheads_product_settings(singleton) VALUES(true);
CREATE TABLE public.pileheads_pilot_invites (
 email_hash text PRIMARY KEY CHECK(email_hash ~ '^[0-9a-f]{64}$')
);
GRANT SELECT ON public.pileheads_product_settings TO pileheads_runtime_access,pileheads_player_runtime_access;
GRANT SELECT ON public.pileheads_pilot_invites TO pileheads_player_runtime_access;
COMMIT;
