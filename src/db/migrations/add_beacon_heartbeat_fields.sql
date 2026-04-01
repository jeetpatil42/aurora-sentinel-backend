ALTER TABLE beacons
  ADD COLUMN IF NOT EXISTS last_heartbeat_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE beacons
  ADD COLUMN IF NOT EXISTS wifi_connected BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE beacons
  ADD COLUMN IF NOT EXISTS last_mode TEXT NOT NULL DEFAULT 'wifi'
    CHECK (last_mode IN ('wifi', 'esp_now_fallback', 'offline'));

ALTER TABLE beacons
  ADD COLUMN IF NOT EXISTS last_temperature_c DOUBLE PRECISION;

ALTER TABLE beacons
  ADD COLUMN IF NOT EXISTS last_smoke_level DOUBLE PRECISION;

CREATE INDEX IF NOT EXISTS idx_beacons_last_heartbeat_at ON beacons(last_heartbeat_at DESC);
