-- Create sos_event_history table for tracking all events within a SOS
CREATE TABLE IF NOT EXISTS sos_event_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sos_id UUID NOT NULL REFERENCES sos_events(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('sos_triggered', 'ai_risk', 'zone_entered', 'acknowledged', 'resolved')),
  risk_value FLOAT,
  meta JSONB DEFAULT '{}',
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_sos_event_history_sos_id ON sos_event_history(sos_id);
CREATE INDEX idx_sos_event_history_timestamp ON sos_event_history(timestamp ASC);
CREATE INDEX idx_sos_event_history_type ON sos_event_history(type);
