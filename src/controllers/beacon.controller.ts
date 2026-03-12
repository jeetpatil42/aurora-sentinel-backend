import { Response } from 'express';
import { BeaconRequest } from '../middlewares/beaconAuth';
import { createSOSEvent, createRiskSnapshot, getSOSEventById, logSOSEvent } from '../services/sos';
import { supabaseAdmin } from '../db/supabaseAdmin';

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

export const createBeaconSOS = async (req: BeaconRequest, res: Response): Promise<void> => {
  try {
    const beacon = req.beacon;
    if (!beacon) {
      res.status(401).json({ error: 'Beacon authentication required' });
      return;
    }

    if (!beacon.assigned_user_id) {
      res.status(400).json({ error: 'Beacon is not assigned to a user' });
      return;
    }

    const source = String((req.body as any)?.source || 'beacon').trim();
    const eventType = String((req.body as any)?.type || 'manual_sos').trim();
    const pressedAt = (req.body as any)?.pressed_at || new Date().toISOString();
    const batteryLevel = (req.body as any)?.battery_level;
    const rssi = (req.body as any)?.rssi;
    const firmwareVersion = (req.body as any)?.firmware_version;

    const location = beacon.location || null;
    const beaconLocation = {
      ...(location || {}),
      source,
      beacon_id: beacon.id,
      beacon_name: beacon.name || 'Beacon',
      beacon_triggered_at: pressedAt,
    };

    const event = await createSOSEvent({
      user_id: beacon.assigned_user_id,
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
        student_id: beacon.assigned_user_id,
      });

    if (chatInsert.error && !/duplicate|unique/i.test(chatInsert.error.message || '')) {
      console.warn('Failed to create sos_chats row for beacon SOS:', chatInsert.error.message);
    }

    await createRiskSnapshot({
      event_id: event.id,
      user_id: beacon.assigned_user_id,
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
        beacon_id: beacon.id,
        beacon_name: beacon.name,
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
    const beaconLabel = beacon.name || 'Beacon';
    const eventWithContext = {
      ...storedEvent,
      email: beaconLabel,
      name: beaconLabel,
      student_email: display.email,
      student_name: display.name,
      source,
      beacon_id: beacon.id,
      beacon_name: beacon.name,
    };

    const io = (req as any).io;
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
