ALTER TABLE beacons
  ADD COLUMN IF NOT EXISTS node_role TEXT NOT NULL DEFAULT 'main'
    CHECK (node_role IN ('main', 'relay', 'backup', 'gateway'));

ALTER TABLE beacons
  ADD COLUMN IF NOT EXISTS mac_address TEXT;

ALTER TABLE beacons
  ADD COLUMN IF NOT EXISTS forward_target_id TEXT REFERENCES beacons(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_beacons_node_role ON beacons(node_role);
CREATE INDEX IF NOT EXISTS idx_beacons_forward_target_id ON beacons(forward_target_id);
