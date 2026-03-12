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
  status: 'active' | 'disabled';
  last_seen_at: string | null;
  created_at: string;
  updated_at: string;
}

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
