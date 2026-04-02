ALTER TABLE beacons
  ADD COLUMN IF NOT EXISTS manual_check_requested_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE beacons
  ADD COLUMN IF NOT EXISTS manual_check_responded_at TIMESTAMP WITH TIME ZONE;

CREATE INDEX IF NOT EXISTS idx_beacons_manual_check_requested_at
  ON beacons(manual_check_requested_at DESC);
