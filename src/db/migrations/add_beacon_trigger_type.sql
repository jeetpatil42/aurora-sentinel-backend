ALTER TABLE sos_events DROP CONSTRAINT IF EXISTS sos_events_trigger_type_check;

ALTER TABLE sos_events
  ADD CONSTRAINT sos_events_trigger_type_check
  CHECK (trigger_type IN ('manual', 'ai', 'beacon'));
