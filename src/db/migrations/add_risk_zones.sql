-- Add risk_zones table for GeoJSON polygon storage
CREATE TABLE IF NOT EXISTS risk_zones (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('high', 'low')),
  polygon JSONB NOT NULL, -- GeoJSON format
  multiplier FLOAT NOT NULL DEFAULT 1.0,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_risk_zones_type ON risk_zones(type);
CREATE INDEX idx_risk_zones_created_at ON risk_zones(created_at DESC);

-- Trigger for updated_at
CREATE TRIGGER update_risk_zones_updated_at BEFORE UPDATE ON risk_zones
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Example high-risk zone (Parking Lot)
INSERT INTO risk_zones (name, type, polygon, multiplier, description) VALUES
(
  'Parking Lot',
  'high',
  '{
    "type": "Polygon",
    "coordinates": [[
      [-122.4194, 37.7749],
      [-122.4190, 37.7749],
      [-122.4190, 37.7752],
      [-122.4194, 37.7752],
      [-122.4194, 37.7749]
    ]]
  }'::jsonb,
  1.5,
  'High-risk parking area with limited visibility'
) ON CONFLICT DO NOTHING;

-- Example low-risk zone (Library)
INSERT INTO risk_zones (name, type, polygon, multiplier, description) VALUES
(
  'Library',
  'low',
  '{
    "type": "Polygon",
    "coordinates": [[
      [-122.4200, 37.7750],
      [-122.4196, 37.7750],
      [-122.4196, 37.7753],
      [-122.4200, 37.7753],
      [-122.4200, 37.7750]
    ]]
  }'::jsonb,
  0.5,
  'Low-risk secure area with staff presence'
) ON CONFLICT DO NOTHING;
