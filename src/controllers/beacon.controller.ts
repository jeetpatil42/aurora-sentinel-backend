import { Response } from 'express';
import { BeaconRequest } from '../middlewares/beaconAuth';
import { createSOSEvent, createRiskSnapshot, getSOSEventById, logSOSEvent } from '../services/sos';
import { supabaseAdmin } from '../db/supabaseAdmin';
import {
  BeaconDevice,
  getBeaconById,
  getBeaconManualCheckInstruction,
  listBeaconStatuses,
  recordBeaconHeartbeat,
  requestBeaconManualCheck,
} from '../services/beacons';
import { AuthRequest } from '../middlewares/auth';

const MAIN_BEACON_WARNING_TEMP_C = 35;
const MAIN_BEACON_WARNING_SMOKE = 120;
const MAIN_BEACON_WARNING_COOLDOWN_MS = 90_000;
const lastBeaconWarningAt = new Map<string, number>();

function buildBeaconPopupPayload(
  sourceBeacon: BeaconDevice,
  ingressBeacon: BeaconDevice,
  payload: Record<string, any>
) {
  const temperature =
    typeof payload?.temperature_c === 'number'
      ? payload.temperature_c
      : typeof payload?.environment?.temperature_c === 'number'
        ? payload.environment.temperature_c
        : null;
  const smoke =
    typeof payload?.smoke_level === 'number'
      ? payload.smoke_level
      : typeof payload?.environment?.smoke_level === 'number'
        ? payload.environment.smoke_level
        : null;

  return {
    beacon_id: sourceBeacon.id,
    beacon_name: sourceBeacon.name,
    node_role: sourceBeacon.node_role,
    ingress_beacon_id: ingressBeacon.id,
    ingress_beacon_name: ingressBeacon.name,
    ingress_node_role: ingressBeacon.node_role,
    temperature_c: temperature,
    smoke_level: smoke,
    message: String(payload?.message || `Fire risk detected at ${sourceBeacon.name || 'Main Beacon'}`),
    recorded_at: new Date().toISOString(),
    location: sourceBeacon.location,
    source: String(payload?.source || 'beacon'),
    type: String(payload?.type || 'auto_sensor_sos'),
  };
}

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

export const createBeaconAutoAlert = async (req: BeaconRequest, res: Response): Promise<void> => {
  try {
    const ingressBeacon = req.beacon;
    if (!ingressBeacon) {
      res.status(401).json({ error: 'Beacon authentication required' });
      return;
    }

    const requestedBeaconId = String((req.body as any)?.beacon_id || '').trim();
    const sourceBeacon = await resolveSourceBeacon(ingressBeacon, requestedBeaconId);

    if (!sourceBeacon) {
      res.status(400).json({ error: 'Invalid source beacon for auto alert' });
      return;
    }

    const popupPayload = buildBeaconPopupPayload(sourceBeacon, ingressBeacon, (req.body as any) || {});

    const io = req.io;
    if (io) {
      io.to('security_room').emit('beacon:auto-alert', popupPayload);
    }

    res.status(202).json({
      ok: true,
      delivered: Boolean(io),
      ...popupPayload,
    });
  } catch (error: any) {
    res.status(400).json({ error: error?.message || 'Failed to dispatch beacon auto alert' });
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

      const temperature = heartbeat.last_temperature_c;
      const smoke = heartbeat.last_smoke_level;
      const exceedsWarningThreshold =
        heartbeat.node_role === 'main' &&
        typeof temperature === 'number' &&
        typeof smoke === 'number' &&
        temperature >= MAIN_BEACON_WARNING_TEMP_C &&
        smoke >= MAIN_BEACON_WARNING_SMOKE;

      if (exceedsWarningThreshold) {
        const nowMs = Date.now();
        const previousWarningAt = lastBeaconWarningAt.get(heartbeat.id) ?? 0;

        if (nowMs - previousWarningAt >= MAIN_BEACON_WARNING_COOLDOWN_MS) {
          lastBeaconWarningAt.set(heartbeat.id, nowMs);
          io.to('security_room').emit('beacon:warning', {
            beacon_id: heartbeat.id,
            beacon_name: heartbeat.name,
            node_role: heartbeat.node_role,
            temperature_c: temperature,
            smoke_level: smoke,
            message: `High temp recorded at ${heartbeat.name}`,
            recorded_at: new Date(nowMs).toISOString(),
            location: heartbeat.location,
          });
        }
      }
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

export const requestManualCheck = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user || req.user.role !== 'security') {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }

    const beaconId = String(req.params.beaconId || '').trim();
    const snapshot = await requestBeaconManualCheck(beaconId);

    if (!snapshot) {
      res.status(404).json({ error: 'Beacon not found' });
      return;
    }

    const io = req.io;
    if (io) {
      io.to('security_room').emit('beacon:status', snapshot);
    }

    res.status(200).json(snapshot);
  } catch (error: any) {
    res.status(400).json({ error: error?.message || 'Failed to request manual beacon check' });
  }
};

export const getManualCheckInstruction = async (req: BeaconRequest, res: Response): Promise<void> => {
  try {
    const beacon = req.beacon;
    if (!beacon) {
      res.status(401).json({ error: 'Beacon authentication required' });
      return;
    }

    const instruction = await getBeaconManualCheckInstruction(beacon.id);
    if (!instruction) {
      res.status(404).json({ error: 'Beacon not found' });
      return;
    }

    res.status(200).json(instruction);
  } catch (error: any) {
    res.status(400).json({ error: error?.message || 'Failed to load manual check instruction' });
  }
};
