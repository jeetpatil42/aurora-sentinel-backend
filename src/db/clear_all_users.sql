-- Clear All Users and Related Data
-- WARNING: This will delete ALL users, OTP codes, SOS events, and related data!
-- Run this in Supabase SQL Editor

-- Delete in order (respecting foreign key constraints)

-- 1. Delete security actions (references sos_events)
DELETE FROM security_actions;

-- 2. Delete risk snapshots (references sos_events and users)
DELETE FROM risk_snapshots;

-- 3. Delete SOS events (references users)
DELETE FROM sos_events;

-- 4. Delete OTP codes (references users)
DELETE FROM otp_codes;

-- 5. Delete all users
DELETE FROM users;

-- Verify tables are empty
SELECT 
  (SELECT COUNT(*) FROM users) as users_count,
  (SELECT COUNT(*) FROM otp_codes) as otp_codes_count,
  (SELECT COUNT(*) FROM sos_events) as sos_events_count,
  (SELECT COUNT(*) FROM risk_snapshots) as risk_snapshots_count,
  (SELECT COUNT(*) FROM security_actions) as security_actions_count;
