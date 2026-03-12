"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createBeaconSOS = void 0;
const sos_1 = require("../services/sos");
const supabaseAdmin_1 = require("../db/supabaseAdmin");
async function resolveUserDisplayByUserId(userId) {
    const { data: userRow } = await supabaseAdmin_1.supabaseAdmin
        .from('users')
        .select('email,name')
        .eq('id', userId)
        .single();
    if (userRow?.email || userRow?.name) {
        return { email: userRow?.email, name: userRow?.name };
    }
    return {};
}
const createBeaconSOS = async (req, res) => {
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
        const source = String(req.body?.source || 'beacon').trim();
        const eventType = String(req.body?.type || 'manual_sos').trim();
        const pressedAt = req.body?.pressed_at || new Date().toISOString();
        const batteryLevel = req.body?.battery_level;
        const rssi = req.body?.rssi;
        const firmwareVersion = req.body?.firmware_version;
        const location = beacon.location || null;
        const beaconLocation = {
            ...(location || {}),
            source,
            beacon_id: beacon.id,
            beacon_name: beacon.name || 'Beacon',
            beacon_triggered_at: pressedAt,
        };
        const event = await (0, sos_1.createSOSEvent)({
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
        const chatInsert = await supabaseAdmin_1.supabaseAdmin
            .from('sos_chats')
            .insert({
            sos_id: event.id,
            student_id: beacon.assigned_user_id,
        });
        if (chatInsert.error && !/duplicate|unique/i.test(chatInsert.error.message || '')) {
            console.warn('Failed to create sos_chats row for beacon SOS:', chatInsert.error.message);
        }
        await (0, sos_1.createRiskSnapshot)({
            event_id: event.id,
            user_id: beacon.assigned_user_id,
            audio: {},
            motion: {},
            time: { beacon_pressed_at: pressedAt },
            location: beaconLocation,
            total: 100,
        });
        await (0, sos_1.logSOSEvent)({
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
        const storedEvent = await (0, sos_1.getSOSEventById)(event.id);
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
        const io = req.io;
        if (io) {
            io.to('security_room').emit('new_sos_alert', eventWithContext);
            io.to('security_room').emit('sos:created', eventWithContext);
            io.to(`user_${storedEvent.user_id}`).emit('sos:created', eventWithContext);
        }
        res.status(201).json(eventWithContext);
    }
    catch (error) {
        res.status(400).json({ error: error?.message || 'Failed to create beacon SOS event' });
    }
};
exports.createBeaconSOS = createBeaconSOS;
//# sourceMappingURL=beacon.controller.js.map