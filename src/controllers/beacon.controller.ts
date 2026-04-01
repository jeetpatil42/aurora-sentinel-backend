import { Response } from 'express';
import { BeaconRequest } from '../middlewares/beaconAuth';
import { createSOSEvent, createRiskSnapshot, getSOSEventById, logSOSEvent } from '../services/sos';
import { supabaseAdmin } from '../db/supabaseAdmin';
import { BeaconDevice, getBeaconById, listBeaconStatuses, recordBeaconHeartbeat } from '../services/beacons';
import { AuthRequest } from '../middlewares/auth';

async function resolveUserDisplayByUserId(userId: string): Promise<{ email?: string; name?: string }> {
  const { data: userRow } = await supabaseAdmin
    .from('users')
    .select('email,name')
    .eq('id', userId)
    .single();

  if (userRow?.email || (userRow as any)?.name) {
    return { email: (userRow as any)?.email, name: (userRow as any)?.name };
  }

  return {};
}

async function resolveSourceBeacon(
  authenticatedBeacon: BeaconDevice,
  requestedBeaconId: string
): Promise<BeaconDevice | null> {
  const normalizedRequestedBeaconId = String(requestedBeaconId || '').trim();
  const authenticatedNodeRole = authenticatedBeacon.node_role || 'main';

  if (!normalizedRequestedBeaconId || normalizedRequestedBeaconId === authenticatedBeacon.id) {
    return authenticatedBeacon;
  }

  if (authenticatedNodeRole === 'main') {
    return null;
  }

  const sourceBeacon = await getBeaconById(normalizedRequestedBeaconId);
  if (!sourceBeacon || sourceBeacon.status !== 'active') {
    return null;
  }

  return sourceBeacon;
}

export const createBeaconSOS = async (req: BeaconRequest, res: Response): Promise<void> => {
  try {
    const ingressBeacon = req.beacon;
    if (!ingressBeacon) {
      res.status(401).json({ error: 'Beacon authentication required' });
      return;
    }

    const requestedBeaconId = String((req.body as any)?.beacon_id || '').trim();
    const sourceBeacon = await resolveSourceBeacon(ingressBeacon, requestedBeaconId);

    if (!sourceBeacon) {
      res.status(400).json({ error: 'Invalid source beacon for forwarded SOS' });
      return;
    }

    if (!sourceBeacon.assigned_user_id) {
      res.status(400).json({ error: 'Beacon is not assigned to a user' });
      return;
    }

    const source = String((req.body as any)?.source || 'beacon').trim();
    const eventType = String((req.body as any)?.type || 'manual_sos').trim();
    const pressedAt = (req.body as any)?.pressed_at || new Date().toISOString();
    const batteryLevel = (req.body as any)?.battery_level;
    const rssi = (req.body as any)?.rssi;
    const firmwareVersion = (req.body as any)?.firmware_version;
    const networkMeta = (req.body as any)?.network || {};
    const ingressNodeRole = ingressBeacon.node_role || 'main';

    const location = sourceBeacon.location || null;
    const beaconLocation = {
      ...(location || {}),
      source,
      beacon_id: sourceBeacon.id,
      beacon_name: sourceBeacon.name || 'Beacon',
      beacon_triggered_at: pressedAt,
      ingress_beacon_id: ingressBeacon.id,
      ingress_beacon_name: ingressBeacon.name,
      ingress_node_role: ingressNodeRole,
      route: networkMeta.route,
      hop_count: networkMeta.hop_count,
      last_hop: networkMeta.last_hop,
    };

    const event = await createSOSEvent({
      user_id: sourceBeacon.assigned_user_id,
      risk_score: 100,
      factors: {
        audio: 0,
        motion: 0,
        time: 100,
        location: location ? 100 : 0,
      },
      location: beaconLocation,
      trigger_type: 'beacon',
      attachments: [],
    });

    const chatInsert = await supabaseAdmin
      .from('sos_chats')
      .insert({
        sos_id: event.id,
        student_id: sourceBeacon.assigned_user_id,
      });

    if (chatInsert.error && !/duplicate|unique/i.test(chatInsert.error.message || '')) {
      console.warn('Failed to create sos_chats row for beacon SOS:', chatInsert.error.message);
    }

    await createRiskSnapshot({
      event_id: event.id,
      user_id: sourceBeacon.assigned_user_id,
      audio: {},
      motion: {},
      time: { beacon_pressed_at: pressedAt },
      location: beaconLocation,
      total: 100,
    });

    await logSOSEvent({
      sos_id: event.id,
      type: 'zone_entered',
      risk_value: 100,
      meta: {
        source,
        event_type: eventType,
        beacon_id: sourceBeacon.id,
        beacon_name: sourceBeacon.name,
        ingress_beacon_id: ingressBeacon.id,
        ingress_beacon_name: ingressBeacon.name,
        ingress_node_role: ingressNodeRole,
        route: networkMeta.route,
        hop_count: networkMeta.hop_count,
        last_hop: networkMeta.last_hop,
        firmware_version: firmwareVersion,
        battery_level: batteryLevel,
        rssi,
        pressed_at: pressedAt,
      },
    });

    const storedEvent = await getSOSEventById(event.id);
    if (!storedEvent) {
      res.status(500).json({ error: 'Failed to load created beacon SOS event' });
      return;
    }

    const display = await resolveUserDisplayByUserId(storedEvent.user_id);
    const beaconLabel = sourceBeacon.name || 'Beacon';
    const eventWithContext = {
      ...storedEvent,
      email: beaconLabel,
      name: beaconLabel,
      student_email: display.email,
      student_name: display.name,
      source,
      beacon_id: sourceBeacon.id,
      beacon_name: sourceBeacon.name,
      ingress_beacon_id: ingressBeacon.id,
      ingress_beacon_name: ingressBeacon.name,
      ingress_node_role: ingressNodeRole,
    };

    const io = req.io;
    if (io) {
      io.to('security_room').emit('new_sos_alert', eventWithContext);
      io.to('security_room').emit('sos:created', eventWithContext);
      io.to(`user_${storedEvent.user_id}`).emit('sos:created', eventWithContext);
    }

    res.status(201).json(eventWithContext);
  } catch (error: any) {
    res.status(400).json({ error: error?.message || 'Failed to create beacon SOS event' });
  }
};

export const recordHeartbeat = async (req: BeaconRequest, res: Response): Promise<void> => {
  try {
    const beacon = req.beacon;
    if (!beacon) {
      res.status(401).json({ error: 'Beacon authentication required' });
      return;
    }

    const heartbeat = await recordBeaconHeartbeat(beacon.id, {
      wifi_connected: Boolean((req.body as any)?.wifi_connected),
      mode: (req.body as any)?.mode,
      temperature_c: typeof (req.body as any)?.temperature_c === 'number' ? (req.body as any).temperature_c : null,
      smoke_level: typeof (req.body as any)?.smoke_level === 'number' ? (req.body as any).smoke_level : null,
    });

    if (!heartbeat) {
      res.status(400).json({ error: 'Failed to record beacon heartbeat' });
      return;
    }

    const io = req.io;
    if (io) {
      io.to('security_room').emit('beacon:heartbeat', heartbeat);
      io.to('security_room').emit('beacon:status', heartbeat);
    }

    res.status(200).json(heartbeat);
  } catch (error: any) {
    res.status(400).json({ error: error?.message || 'Failed to record beacon heartbeat' });
  }
};

export const getBeaconStatuses = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user || req.user.role !== 'security') {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }

    const statuses = await listBeaconStatuses();
    res.status(200).json(statuses);
  } catch (error: any) {
    res.status(500).json({ error: error?.message || 'Failed to load beacon statuses' });
  }
};
