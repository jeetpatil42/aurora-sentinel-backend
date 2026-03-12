CREATE TABLE IF NOT EXISTS beacons (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  device_key_hash TEXT NOT NULL,
  assigned_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  location JSONB,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disabled')),
  last_seen_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_beacons_assigned_user_id ON beacons(assigned_user_id);
CREATE INDEX IF NOT EXISTS idx_beacons_status ON beacons(status);
CREATE INDEX IF NOT EXISTS idx_beacons_last_seen_at ON beacons(last_seen_at DESC);

DROP TRIGGER IF EXISTS update_beacons_updated_at ON beacons;
CREATE TRIGGER update_beacons_updated_at BEFORE UPDATE ON beacons
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
