-- Aurora Campus Sentinel Database Schema
-- For Supabase PostgreSQL
-- Fixed version that handles existing objects

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users Table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL CHECK (role IN ('student', 'security')),
  is_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes (drop if exists first to avoid errors)
DROP INDEX IF EXISTS idx_users_email;
DROP INDEX IF EXISTS idx_users_role;
DROP INDEX IF EXISTS idx_users_verified;
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_verified ON users(is_verified);

-- OTP Codes Table
CREATE TABLE IF NOT EXISTS otp_codes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  otp_hash VARCHAR(255) NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

DROP INDEX IF EXISTS idx_otp_user_id;
DROP INDEX IF EXISTS idx_otp_expires_at;
CREATE INDEX idx_otp_user_id ON otp_codes(user_id);
CREATE INDEX idx_otp_expires_at ON otp_codes(expires_at);

-- SOS Events Table
CREATE TABLE IF NOT EXISTS sos_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  risk_score DECIMAL(5,2) NOT NULL,
  factors JSONB NOT NULL,
  location JSONB,
  trigger_type VARCHAR(50) NOT NULL CHECK (trigger_type IN ('manual', 'ai', 'beacon')),
  status VARCHAR(50) NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'acknowledged', 'resolved')),
  attachments TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

DROP INDEX IF EXISTS idx_sos_user_id;
DROP INDEX IF EXISTS idx_sos_status;
DROP INDEX IF EXISTS idx_sos_created_at;
DROP INDEX IF EXISTS idx_sos_risk_score;
CREATE INDEX idx_sos_user_id ON sos_events(user_id);
CREATE INDEX idx_sos_status ON sos_events(status);
CREATE INDEX idx_sos_created_at ON sos_events(created_at DESC);
CREATE INDEX idx_sos_risk_score ON sos_events(risk_score DESC);

-- Risk Snapshots Table
CREATE TABLE IF NOT EXISTS risk_snapshots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID REFERENCES sos_events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  audio JSONB,
  motion JSONB,
  time JSONB,
  location JSONB,
  total DECIMAL(5,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

DROP INDEX IF EXISTS idx_risk_snapshots_event_id;
DROP INDEX IF EXISTS idx_risk_snapshots_user_id;
DROP INDEX IF EXISTS idx_risk_snapshots_created_at;
CREATE INDEX idx_risk_snapshots_event_id ON risk_snapshots(event_id);
CREATE INDEX idx_risk_snapshots_user_id ON risk_snapshots(user_id);
CREATE INDEX idx_risk_snapshots_created_at ON risk_snapshots(created_at DESC);

-- Security Actions Table
CREATE TABLE IF NOT EXISTS security_actions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sos_id UUID NOT NULL REFERENCES sos_events(id) ON DELETE CASCADE,
  security_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action VARCHAR(50) NOT NULL CHECK (action IN ('acknowledged', 'resolved')),
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

DROP INDEX IF EXISTS idx_security_actions_sos_id;
DROP INDEX IF EXISTS idx_security_actions_security_id;
DROP INDEX IF EXISTS idx_security_actions_timestamp;
CREATE INDEX idx_security_actions_sos_id ON security_actions(sos_id);
CREATE INDEX idx_security_actions_security_id ON security_actions(security_id);
CREATE INDEX idx_security_actions_timestamp ON security_actions(timestamp DESC);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at (drop first to avoid errors)
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
DROP TRIGGER IF EXISTS update_sos_events_updated_at ON sos_events;

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sos_events_updated_at BEFORE UPDATE ON sos_events
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
