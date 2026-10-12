CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE "public"."Reservation"
ADD CONSTRAINT "Reservation_time_window_check"
CHECK ("startAt" < "endAt");

ALTER TABLE "public"."Reservation"
ADD CONSTRAINT "reservation_no_overlap"
EXCLUDE USING gist (
    "resourceId" WITH =,
    tsrange("startAt", "endAt", '[)') WITH &&
)
WHERE ("status" <> 'CANCELLED');
