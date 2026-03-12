-- Seed one test beacon linked to student@test.com
-- Default plaintext device key for local testing: change-me-beacon-key
-- Replace the bcrypt hash before using outside development.

INSERT INTO beacons (
  id,
  name,
  device_key_hash,
  assigned_user_id,
  location,
  status
)
SELECT
  'ESP32_BEACON_1',
  'Hostel Panic Button 1',
  '$2b$10$LlSc/VBmR0SPwH/oeFkq2ejdEaRu8eJRWq9xngonwqfvtBAZgO.di',
  u.id,
  '{
    "lat": 12.9716,
    "lng": 77.5946,
    "address": "Campus Hostel Block A",
    "building": "Hostel A",
    "floor": "Ground",
    "room": "Lobby"
  }'::jsonb,
  'active'
FROM users u
WHERE u.email = 'student@test.com'
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  device_key_hash = EXCLUDED.device_key_hash,
  assigned_user_id = EXCLUDED.assigned_user_id,
  location = EXCLUDED.location,
  status = EXCLUDED.status;
