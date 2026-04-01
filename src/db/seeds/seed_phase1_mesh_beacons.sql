-- Phase 1 ESP32 mesh nodes for Aurora Sentinel.
-- Development plaintext key for all seeded nodes: change-me-beacon-key
-- Each beacon gets its own synthetic local user identity so beacon-triggered
-- SOS events are not attached to a real student account during hardware testing.
-- Replace the shared hashes before production use.

WITH beacon_users AS (
  SELECT
    'beacon.main@aurora.local'::text AS email,
    'Aurora Main Beacon Identity'::text AS name,
    '$2b$10$LlSc/VBmR0SPwH/oeFkq2ejdEaRu8eJRWq9xngonwqfvtBAZgO.di'::text AS password_hash
  UNION ALL
  SELECT
    'beacon.relay@aurora.local',
    'Aurora Relay Identity',
    '$2b$10$LlSc/VBmR0SPwH/oeFkq2ejdEaRu8eJRWq9xngonwqfvtBAZgO.di'
  UNION ALL
  SELECT
    'beacon.backup@aurora.local',
    'Aurora Backup Identity',
    '$2b$10$LlSc/VBmR0SPwH/oeFkq2ejdEaRu8eJRWq9xngonwqfvtBAZgO.di'
  UNION ALL
  SELECT
    'beacon.gateway@aurora.local',
    'Aurora Gateway Identity',
    '$2b$10$LlSc/VBmR0SPwH/oeFkq2ejdEaRu8eJRWq9xngonwqfvtBAZgO.di'
),
upserted_users AS (
  INSERT INTO users (
    email,
    name,
    password_hash,
    role,
    is_verified,
    security_approved
  )
  SELECT
    beacon_users.email,
    beacon_users.name,
    beacon_users.password_hash,
    'student',
    TRUE,
    TRUE
  FROM beacon_users
  ON CONFLICT (email) DO UPDATE SET
    name = EXCLUDED.name,
    password_hash = EXCLUDED.password_hash,
    role = EXCLUDED.role,
    is_verified = EXCLUDED.is_verified,
    security_approved = EXCLUDED.security_approved
  RETURNING id, email
),
resolved_users AS (
  SELECT id, email FROM upserted_users
  UNION
  SELECT users.id, users.email
  FROM users
  INNER JOIN beacon_users ON beacon_users.email = users.email
),
mesh_nodes AS (
  SELECT
    'ESP32_BEACON_1'::text AS id,
    'Aurora Main Beacon'::text AS name,
    '$2b$10$LlSc/VBmR0SPwH/oeFkq2ejdEaRu8eJRWq9xngonwqfvtBAZgO.di'::text AS device_key_hash,
    'main'::text AS node_role,
    '1C:C3:AB:B3:88:64'::text AS mac_address,
    'ESP32_RELAY_1'::text AS forward_target_id,
    'beacon.main@aurora.local'::text AS owner_email,
    '{
      "lat": 12.9716,
      "lng": 77.5946,
      "address": "Campus Hostel Block A",
      "building": "Hostel A",
      "floor": "Ground",
      "room": "Lobby"
    }'::jsonb AS location
  UNION ALL
  SELECT
    'ESP32_RELAY_1',
    'Aurora Relay Node',
    '$2b$10$LlSc/VBmR0SPwH/oeFkq2ejdEaRu8eJRWq9xngonwqfvtBAZgO.di',
    'relay',
    '00:70:07:E1:AE:84',
    'ESP32_BACKUP_1',
    'beacon.relay@aurora.local',
    '{
      "lat": 12.9718,
      "lng": 77.5949,
      "address": "Security Hallway Relay",
      "building": "Security Block",
      "floor": "Ground",
      "room": "Relay Point"
    }'::jsonb
  UNION ALL
  SELECT
    'ESP32_BACKUP_1',
    'Aurora Backup Node',
    '$2b$10$LlSc/VBmR0SPwH/oeFkq2ejdEaRu8eJRWq9xngonwqfvtBAZgO.di',
    'backup',
    '28:05:A5:35:3F:BC',
    'ESP32_GATEWAY_1',
    'beacon.backup@aurora.local',
    '{
      "lat": 12.9721,
      "lng": 77.5953,
      "address": "Admin Block Backup Relay",
      "building": "Admin Block",
      "floor": "Ground",
      "room": "Backup Relay Point"
    }'::jsonb
  UNION ALL
  SELECT
    'ESP32_GATEWAY_1',
    'Aurora Gateway Node',
    '$2b$10$LlSc/VBmR0SPwH/oeFkq2ejdEaRu8eJRWq9xngonwqfvtBAZgO.di',
    'gateway',
    'C0:49:EF:D0:50:98',
    NULL,
    'beacon.gateway@aurora.local',
    '{
      "lat": 12.9724,
      "lng": 77.5958,
      "address": "Main Gate Gateway",
      "building": "Main Gate",
      "floor": "Ground",
      "room": "Gateway Booth"
    }'::jsonb
)
INSERT INTO beacons (
  id,
  name,
  device_key_hash,
  assigned_user_id,
  location,
  status,
  node_role,
  mac_address,
  forward_target_id
)
SELECT
  mesh_nodes.id,
  mesh_nodes.name,
  mesh_nodes.device_key_hash,
  resolved_users.id AS assigned_user_id,
  mesh_nodes.location,
  'active' AS status,
  mesh_nodes.node_role,
  mesh_nodes.mac_address,
  mesh_nodes.forward_target_id
FROM mesh_nodes
INNER JOIN resolved_users ON resolved_users.email = mesh_nodes.owner_email
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  device_key_hash = EXCLUDED.device_key_hash,
  assigned_user_id = EXCLUDED.assigned_user_id,
  location = EXCLUDED.location,
  status = EXCLUDED.status,
  node_role = EXCLUDED.node_role,
  mac_address = EXCLUDED.mac_address,
  forward_target_id = EXCLUDED.forward_target_id;
