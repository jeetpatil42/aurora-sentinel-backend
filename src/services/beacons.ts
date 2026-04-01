import bcrypt from 'bcrypt';
import { supabaseAdmin } from '../db/supabaseAdmin';

export interface BeaconDevice {
  id: string;
  name: string;
  device_key_hash: string;
  assigned_user_id: string | null;
  location: {
    lat?: number;
    lng?: number;
    address?: string;
    building?: string;
    floor?: string;
    room?: string;
  } | null;
  node_role: 'main' | 'relay' | 'backup' | 'gateway';
  mac_address: string | null;
  forward_target_id: string | null;
  status: 'active' | 'disabled';
  last_seen_at: string | null;
  last_heartbeat_at: string | null;
  wifi_connected: boolean;
  last_mode: 'wifi' | 'esp_now_fallback' | 'offline';
  last_temperature_c: number | null;
  last_smoke_level: number | null;
  created_at: string;
  updated_at: string;
}

export interface BeaconStatusSnapshot {
  id: string;
  name: string;
  node_role: BeaconDevice['node_role'];
  mac_address: string | null;
  forward_target_id: string | null;
  location: BeaconDevice['location'];
  wifi_connected: boolean;
  last_mode: BeaconDevice['last_mode'];
  last_seen_at: string | null;
  last_heartbeat_at: string | null;
  last_temperature_c: number | null;
  last_smoke_level: number | null;
  is_online: boolean;
}

const HEARTBEAT_TIMEOUT_MS = 60_000;

export async function getBeaconById(beaconId: string): Promise<BeaconDevice | null> {
  const normalizedId = String(beaconId || '').trim();
  if (!normalizedId) {
    return null;
  }

  const { data, error } = await supabaseAdmin
    .from('beacons')
    .select('*')
    .eq('id', normalizedId)
    .single();

  if (error || !data) {
    return null;
  }

  return data as BeaconDevice;
}

export async function verifyBeaconDevice(beaconId: string, deviceKey: string): Promise<BeaconDevice | null> {
  const beacon = await getBeaconById(beaconId);
  if (!beacon || beacon.status !== 'active') {
    return null;
  }

  const isValid = await bcrypt.compare(deviceKey, beacon.device_key_hash);
  if (!isValid) {
    return null;
  }

  return beacon;
}

export async function touchBeacon(beaconId: string): Promise<void> {
  const normalizedId = String(beaconId || '').trim();
  if (!normalizedId) {
    return;
  }

  await supabaseAdmin
    .from('beacons')
    .update({ last_seen_at: new Date().toISOString() })
    .eq('id', normalizedId);
}

function toStatusSnapshot(beacon: BeaconDevice): BeaconStatusSnapshot {
  const referenceTime = beacon.last_heartbeat_at || beacon.last_seen_at;
  const isOnline = !!referenceTime && Date.now() - new Date(referenceTime).getTime() <= HEARTBEAT_TIMEOUT_MS;

  return {
    id: beacon.id,
    name: beacon.name,
    node_role: beacon.node_role,
    mac_address: beacon.mac_address,
    forward_target_id: beacon.forward_target_id,
    location: beacon.location,
    wifi_connected: beacon.wifi_connected,
    last_mode: beacon.last_mode,
    last_seen_at: beacon.last_seen_at,
    last_heartbeat_at: beacon.last_heartbeat_at,
    last_temperature_c: beacon.last_temperature_c,
    last_smoke_level: beacon.last_smoke_level,
    is_online: isOnline,
  };
}

export async function recordBeaconHeartbeat(
  beaconId: string,
  payload: {
    wifi_connected?: boolean;
    mode?: BeaconDevice['last_mode'];
    temperature_c?: number | null;
    smoke_level?: number | null;
  }
): Promise<BeaconStatusSnapshot | null> {
  const normalizedId = String(beaconId || '').trim();
  if (!normalizedId) {
    return null;
  }

  const now = new Date().toISOString();
  const updatePayload: Record<string, unknown> = {
    last_seen_at: now,
    last_heartbeat_at: now,
    wifi_connected: Boolean(payload.wifi_connected),
    last_mode: payload.mode || (payload.wifi_connected ? 'wifi' : 'esp_now_fallback'),
  };

  if (typeof payload.temperature_c === 'number') {
    updatePayload.last_temperature_c = payload.temperature_c;
  }

  if (typeof payload.smoke_level === 'number') {
    updatePayload.last_smoke_level = payload.smoke_level;
  }

  const { data, error } = await supabaseAdmin
    .from('beacons')
    .update(updatePayload)
    .eq('id', normalizedId)
    .select('*')
    .single();

  if (error || !data) {
    return null;
  }

  return toStatusSnapshot(data as BeaconDevice);
}

export async function listBeaconStatuses(): Promise<BeaconStatusSnapshot[]> {
  const { data, error } = await supabaseAdmin
    .from('beacons')
    .select('*')
    .order('created_at', { ascending: true });

  if (error || !data) {
    return [];
  }

  return (data as BeaconDevice[]).map(toStatusSnapshot);
}
