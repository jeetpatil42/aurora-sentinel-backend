"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSOSEventHistoryController = exports.clearHistory = exports.updateStatus = exports.getSOSById = exports.getSOS = exports.sendSOSChatMessage = exports.getSOSChatById = exports.getRecentSOSChat = exports.createSOS = void 0;
const sos_1 = require("../services/sos");
const sos_2 = require("../services/sos");
const supabaseAdmin_1 = require("../db/supabaseAdmin");
const geojson_1 = require("../utils/geojson");
async function resolveUserDisplayByUserId(userId) {
    const { data: userRow } = await supabaseAdmin_1.supabaseAdmin
        .from('users')
        .select('email,name')
        .eq('id', userId)
        .single();
    if (userRow?.email || userRow?.name) {
        return { email: userRow?.email, name: userRow?.name };
    }
    try {
        const { data } = await supabaseAdmin_1.supabaseAdmin.auth.admin.getUserById(userId);
        const email = data?.user?.email || undefined;
        const name = data?.user?.user_metadata?.name || undefined;
        return { email, name };
    }
    catch {
        return {};
    }
}
async function getBeaconMetaForSOSIds(sosIds) {
    const ids = Array.from(new Set(sosIds.filter(Boolean)));
    const bySosId = new Map();
    if (ids.length === 0)
        return bySosId;
    const { data } = await supabaseAdmin_1.supabaseAdmin
        .from('sos_event_history')
        .select('sos_id, meta, timestamp')
        .in('sos_id', ids)
        .eq('type', 'zone_entered')
        .order('timestamp', { ascending: false });
    (data || []).forEach((row) => {
        if (!row?.sos_id || bySosId.has(row.sos_id))
            return;
        const meta = row.meta || {};
        if (meta?.source === 'beacon' || meta?.beacon_id || meta?.beacon_name) {
            bySosId.set(row.sos_id, {
                source: meta?.source || 'beacon',
                beacon_id: meta?.beacon_id,
                beacon_name: meta?.beacon_name,
            });
        }
    });
    return bySosId;
}
function applyBeaconDisplay(event, beaconMeta) {
    const locationBeaconMeta = event.location && (event.location.source === 'beacon' || event.location.beacon_id || event.location.beacon_name)
        ? {
            source: event.location.source || 'beacon',
            beacon_id: event.location.beacon_id,
            beacon_name: event.location.beacon_name,
        }
        : undefined;
    const resolvedBeaconMeta = beaconMeta || locationBeaconMeta;
    if (!resolvedBeaconMeta)
        return event;
    return {
        ...event,
        source: resolvedBeaconMeta.source || 'beacon',
        beacon_id: resolvedBeaconMeta.beacon_id,
        beacon_name: resolvedBeaconMeta.beacon_name,
        email: resolvedBeaconMeta.beacon_name || 'Beacon',
        name: resolvedBeaconMeta.beacon_name || 'Beacon',
    };
}
const createSOS = async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({ error: 'Authentication required' });
            return;
        }
        const { risk_score, factors, location, trigger_type, attachments } = req.body;
        console.log('ðŸ“ Creating SOS event for user:', req.user.id, 'risk_score:', risk_score);
        const event = await (0, sos_1.createSOSEvent)({
            user_id: req.user.id,
            risk_score,
            factors,
            location,
            trigger_type: trigger_type || 'manual',
            attachments,
        });
        if (!event || !event.id) {
            console.error('âŒ SOS event creation returned invalid event:', event);
            res.status(500).json({ error: 'Failed to create SOS event: Invalid response from database' });
            return;
        }
        console.log('âœ… SOS event created successfully:', event.id);
        // Ensure chat thread exists for this SOS (non-blocking)
        try {
            await supabaseAdmin_1.supabaseAdmin.from('sos_chats').insert({
                sos_id: event.id,
                student_id: req.user.id,
            });
        }
        catch (chatError) {
            const msg = chatError?.message || chatError;
            if (typeof msg === 'string' && /duplicate|unique/i.test(msg)) {
                // Ignore
            }
            else {
                console.warn('âš ï¸ Failed to create sos_chats row (non-blocking):', msg);
            }
        }
        // Save initial risk snapshot
        await (0, sos_2.createRiskSnapshot)({
            event_id: event.id,
            user_id: req.user.id,
            audio: factors?.audio || {},
            motion: factors?.motion || {},
            time: factors?.time || {},
            location: location || {},
            total: risk_score,
        });
        // Log zone_entered event if location is provided
        if (location && typeof location.lat === 'number' && typeof location.lng === 'number') {
            try {
                // Fetch risk zones
                const { data: riskZones } = await supabaseAdmin_1.supabaseAdmin
                    .from('risk_zones')
                    .select('*');
                if (riskZones && riskZones.length > 0) {
                    let foundZone = false;
                    for (const zone of riskZones) {
                        if ((0, geojson_1.isPointInPolygon)({ lat: location.lat, lng: location.lng }, zone.polygon)) {
                            // Found a zone match
                            await (0, sos_1.logSOSEvent)({
                                sos_id: event.id,
                                type: 'zone_entered',
                                risk_value: risk_score,
                                meta: {
                                    zoneName: zone.name,
                                    zoneType: zone.type,
                                    zone_type: zone.type,
                                    zone_name: zone.name,
                                    multiplier: zone.multiplier,
                                },
                            });
                            foundZone = true;
                            break;
                        }
                    }
                    // If not inside any polygon, log normal zone
                    if (!foundZone) {
                        await (0, sos_1.logSOSEvent)({
                            sos_id: event.id,
                            type: 'zone_entered',
                            risk_value: risk_score,
                            meta: {
                                normal_zone: true,
                            },
                        });
                    }
                }
                else {
                    // No zones available, treat as normal zone
                    await (0, sos_1.logSOSEvent)({
                        sos_id: event.id,
                        type: 'zone_entered',
                        risk_value: risk_score,
                        meta: {
                            normal_zone: true,
                        },
                    });
                }
            }
            catch (error) {
                // Log error but don't break SOS creation
                console.error('Failed to log zone_entered event:', error.message);
            }
        }
        const display = await resolveUserDisplayByUserId(event.user_id);
        const eventWithEmail = {
            ...event,
            email: display.email,
            name: display.name,
        };
        // Emit real-time event (handled by socket handler)
        const io = req.io;
        if (io) {
            // Emit to security room
            io.to('security_room').emit('new_sos_alert', eventWithEmail);
            io.to('security_room').emit('sos:created', eventWithEmail);
            // Also emit to user's room
            if (req.user?.id) {
                io.to(`user_${req.user.id}`).emit('sos:created', eventWithEmail);
            }
            console.log(`ðŸ“¡ Emitted SOS event to security_room and user_${req.user?.id}`);
        }
        else {
            console.warn('âš ï¸ Socket.io not available - SOS event not broadcasted');
        }
        res.status(201).json(eventWithEmail);
    }
    catch (error) {
        console.error('âŒ Error creating SOS event:', error);
        res.status(400).json({ error: error.message || 'Failed to create SOS event' });
    }
};
exports.createSOS = createSOS;
async function getChatBundleForSOS(params) {
    const { sosId, requester } = params;
    const sosEvent = await (0, sos_1.getSOSEventById)(sosId);
    if (!sosEvent) {
        return { status: 404, body: { error: 'SOS event not found' } };
    }
    const { data: chats, error: chatError } = await supabaseAdmin_1.supabaseAdmin
        .from('sos_chats')
        .select('*')
        .eq('sos_id', sosId)
        .limit(1);
    if (chatError) {
        return { status: 500, body: { error: chatError.message } };
    }
    const chat = Array.isArray(chats) && chats.length > 0 ? chats[0] : null;
    if (!chat) {
        return { status: 404, body: { error: 'Chat not found' } };
    }
    const isStudent = requester.role === 'student';
    const isSecurity = requester.role === 'security';
    if (isStudent && sosEvent.user_id !== requester.id) {
        return { status: 403, body: { error: 'Access denied' } };
    }
    // Only the assigned security responder can access chat from the security side
    if (isSecurity && chat.security_id !== requester.id) {
        return { status: 403, body: { error: 'Access denied' } };
    }
    const { data: messages, error: msgError } = await supabaseAdmin_1.supabaseAdmin
        .from('sos_chat_messages')
        .select('*')
        .eq('chat_id', chat.id)
        .order('created_at', { ascending: true });
    if (msgError) {
        return { status: 500, body: { error: msgError.message } };
    }
    const senderIds = Array.from(new Set((messages || []).map((m) => m.sender_id).filter(Boolean)));
    const { data: senders } = senderIds.length
        ? await supabaseAdmin_1.supabaseAdmin.from('users').select('id,email,name').in('id', senderIds)
        : { data: [] };
    const senderEmailById = new Map();
    const senderNameById = new Map();
    (senders || []).forEach((u) => {
        if (u?.id && u?.email)
            senderEmailById.set(u.id, u.email);
        if (u?.id && u?.name)
            senderNameById.set(u.id, u.name);
    });
    const resolved = sosEvent.status === 'resolved';
    const securityDisplay = chat.security_id ? await resolveUserDisplayByUserId(chat.security_id) : {};
    return {
        status: 200,
        body: {
            sos: sosEvent,
            chat: {
                ...chat,
                security_email: securityDisplay.email,
                security_name: securityDisplay.name,
            },
            read_only: resolved,
            messages: (messages || []).map((m) => ({
                ...m,
                sender_email: senderEmailById.get(m.sender_id),
                sender_name: senderNameById.get(m.sender_id),
            })),
        },
    };
}
const getRecentSOSChat = async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({ error: 'Authentication required' });
            return;
        }
        if (req.user.role !== 'student') {
            res.status(403).json({ error: 'Only students can access recent SOS chat' });
            return;
        }
        const { data: events, error } = await supabaseAdmin_1.supabaseAdmin
            .from('sos_events')
            .select('*')
            .eq('user_id', req.user.id)
            .order('created_at', { ascending: false })
            .limit(1);
        if (error) {
            res.status(500).json({ error: error.message });
            return;
        }
        const recent = Array.isArray(events) && events.length > 0 ? events[0] : null;
        if (!recent?.id) {
            res.status(404).json({ error: 'No SOS event found' });
            return;
        }
        const bundle = await getChatBundleForSOS({ sosId: recent.id, requester: { id: req.user.id, role: req.user.role } });
        res.status(bundle.status).json(bundle.body);
    }
    catch (e) {
        res.status(500).json({ error: e?.message || 'Failed to fetch recent SOS chat' });
    }
};
exports.getRecentSOSChat = getRecentSOSChat;
const getSOSChatById = async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({ error: 'Authentication required' });
            return;
        }
        const { id } = req.params;
        const bundle = await getChatBundleForSOS({ sosId: id, requester: { id: req.user.id, role: req.user.role } });
        res.status(bundle.status).json(bundle.body);
    }
    catch (e) {
        res.status(500).json({ error: e?.message || 'Failed to fetch chat' });
    }
};
exports.getSOSChatById = getSOSChatById;
const sendSOSChatMessage = async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({ error: 'Authentication required' });
            return;
        }
        const { id } = req.params;
        const message = String(req.body?.message || '').trim();
        if (!message) {
            res.status(400).json({ error: 'Message is required' });
            return;
        }
        const sosEvent = await (0, sos_1.getSOSEventById)(id);
        if (!sosEvent) {
            res.status(404).json({ error: 'SOS event not found' });
            return;
        }
        if (sosEvent.status === 'resolved') {
            res.status(400).json({ error: 'Chat is read-only after resolved' });
            return;
        }
        const { data: chats, error: chatError } = await supabaseAdmin_1.supabaseAdmin
            .from('sos_chats')
            .select('*')
            .eq('sos_id', id)
            .limit(1);
        if (chatError) {
            res.status(500).json({ error: chatError.message });
            return;
        }
        const chat = Array.isArray(chats) && chats.length > 0 ? chats[0] : null;
        if (!chat) {
            res.status(404).json({ error: 'Chat not found' });
            return;
        }
        if (req.user.role === 'student') {
            if (sosEvent.user_id !== req.user.id) {
                res.status(403).json({ error: 'Access denied' });
                return;
            }
        }
        else if (req.user.role === 'security') {
            if (chat.security_id !== req.user.id) {
                res.status(403).json({ error: 'Only the assigned security responder can send messages' });
                return;
            }
        }
        else {
            res.status(403).json({ error: 'Access denied' });
            return;
        }
        const { data: inserted, error: insertError } = await supabaseAdmin_1.supabaseAdmin
            .from('sos_chat_messages')
            .insert({
            chat_id: chat.id,
            sender_id: req.user.id,
            message,
        })
            .select()
            .single();
        if (insertError) {
            res.status(500).json({ error: insertError.message });
            return;
        }
        const payload = {
            ...inserted,
            sender_email: req.user.email,
            sender_name: req.user.name,
            sos_id: id,
        };
        const io = req.io;
        if (io) {
            io.to(`sos_chat_${id}`).emit('chat:message', payload);
        }
        res.json(payload);
    }
    catch (e) {
        res.status(500).json({ error: e?.message || 'Failed to send message' });
    }
};
exports.sendSOSChatMessage = sendSOSChatMessage;
const getSOS = async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({ error: 'Authentication required' });
            return;
        }
        const { status, limit, offset } = req.query;
        // Students can only see their own events
        // Security can see all events
        const filters = {};
        if (limit) {
            const parsedLimit = parseInt(limit, 10);
            if (!isNaN(parsedLimit) && parsedLimit > 0) {
                filters.limit = parsedLimit;
            }
        }
        if (offset) {
            const parsedOffset = parseInt(offset, 10);
            if (!isNaN(parsedOffset) && parsedOffset >= 0) {
                filters.offset = parsedOffset;
            }
        }
        if (req.user.role === 'student') {
            filters.user_id = req.user.id;
        }
        if (status && typeof status === 'string') {
            filters.status = status;
        }
        console.log('ðŸ“‹ Fetching SOS events with filters:', filters);
        const events = await (0, sos_1.getSOSEvents)(filters);
        // Enrich events with user email for security UI
        if (events.length > 0) {
            if (req.user.role === 'student') {
                const enriched = events.map((e) => ({
                    ...e,
                    email: req.user?.email,
                    name: req.user?.name,
                }));
                res.json(enriched);
                return;
            }
            const userIds = Array.from(new Set(events.map((e) => e.user_id).filter(Boolean)));
            const { data: users } = await supabaseAdmin_1.supabaseAdmin
                .from('users')
                .select('id,email,name')
                .in('id', userIds);
            const emailById = new Map();
            const nameById = new Map();
            (users || []).forEach((u) => {
                if (u?.id && u?.email) {
                    emailById.set(u.id, u.email);
                }
                if (u?.id && u?.name) {
                    nameById.set(u.id, u.name);
                }
            });
            const missingIds = userIds.filter((uid) => uid && !emailById.has(uid));
            if (missingIds.length > 0) {
                const resolved = await Promise.all(missingIds.map(async (uid) => ({ uid, display: await resolveUserDisplayByUserId(uid) })));
                resolved.forEach((r) => {
                    if (r.uid && r.display?.email)
                        emailById.set(r.uid, r.display.email);
                    if (r.uid && r.display?.name)
                        nameById.set(r.uid, r.display.name);
                });
            }
            const beaconMetaBySosId = await getBeaconMetaForSOSIds(events.map((e) => e.id));
            const enriched = events.map((e) => applyBeaconDisplay({
                ...e,
                email: emailById.get(e.user_id),
                name: nameById.get(e.user_id),
            }, beaconMetaBySosId.get(e.id)));
            res.json(enriched);
            return;
        }
        console.log(`âœ… Retrieved ${events.length} SOS events`);
        res.json(events);
    }
    catch (error) {
        console.error('âŒ Error in getSOS:', error);
        console.error('âŒ Error stack:', error.stack);
        res.status(500).json({ error: error.message || 'Failed to fetch SOS events' });
    }
};
exports.getSOS = getSOS;
const getSOSById = async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({ error: 'Authentication required' });
            return;
        }
        const { id } = req.params;
        const event = await (0, sos_1.getSOSEventById)(id);
        if (!event) {
            res.status(404).json({ error: 'SOS event not found' });
            return;
        }
        // Students can only see their own events
        if (req.user.role === 'student' && event.user_id !== req.user.id) {
            res.status(403).json({ error: 'Access denied' });
            return;
        }
        const attachments = Array.isArray(event.attachments) ? event.attachments : [];
        const envBucket = (process.env.SUPABASE_STORAGE_BUCKET || process.env.SUPABASE_STORAGE_BUCKET_NAME || '').trim() || undefined;
        const bucketCandidates = Array.from(new Set([
            envBucket,
            'sos-attachment',
            'sos-attachments',
        ].filter(Boolean)));
        const attachment_urls = [];
        if (attachments.length > 0) {
            for (const path of attachments) {
                for (const bucketName of bucketCandidates) {
                    const { data, error } = await supabaseAdmin_1.supabaseAdmin.storage.from(bucketName).createSignedUrl(path, 60 * 60);
                    if (error) {
                        continue;
                    }
                    if (data?.signedUrl) {
                        attachment_urls.push(data.signedUrl);
                        break;
                    }
                }
            }
        }
        const display = await resolveUserDisplayByUserId(event.user_id);
        const beaconMetaBySosId = await getBeaconMetaForSOSIds([event.id]);
        res.json(applyBeaconDisplay({
            ...event,
            email: display.email,
            name: display.name,
            attachment_urls,
        }, beaconMetaBySosId.get(event.id)));
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
};
exports.getSOSById = getSOSById;
const updateStatus = async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({ error: 'Authentication required' });
            return;
        }
        // Only security can update status
        if (req.user.role !== 'security') {
            res.status(403).json({ error: 'Only security personnel can update status' });
            return;
        }
        const { id } = req.params;
        const { status } = req.body;
        if (!['acknowledged', 'resolved'].includes(status)) {
            res.status(400).json({ error: 'Invalid status' });
            return;
        }
        const event = await (0, sos_1.updateSOSStatus)(id, status, req.user.id);
        const attachments = Array.isArray(event.attachments) ? event.attachments : [];
        const envBucket = (process.env.SUPABASE_STORAGE_BUCKET || process.env.SUPABASE_STORAGE_BUCKET_NAME || '').trim() || undefined;
        const bucketCandidates = Array.from(new Set([
            envBucket,
            'sos-attachment',
            'sos-attachments',
        ].filter(Boolean)));
        const attachment_urls = [];
        if (attachments.length > 0) {
            for (const path of attachments) {
                for (const bucketName of bucketCandidates) {
                    const { data, error } = await supabaseAdmin_1.supabaseAdmin.storage.from(bucketName).createSignedUrl(path, 60 * 60);
                    if (error) {
                        continue;
                    }
                    if (data?.signedUrl) {
                        attachment_urls.push(data.signedUrl);
                        break;
                    }
                }
            }
        }
        const display = await resolveUserDisplayByUserId(event.user_id);
        const beaconMetaBySosId = await getBeaconMetaForSOSIds([event.id]);
        const eventWithEmail = applyBeaconDisplay({
            ...event,
            email: display.email,
            name: display.name,
            attachment_urls,
        }, beaconMetaBySosId.get(event.id));
        // Emit status update (handled by socket handler)
        const io = req.io;
        if (io) {
            io.to('security_room').emit('sos-updated', eventWithEmail);
            io.to(`sos_${id}`).emit('sos-updated', eventWithEmail);
            // Also emit legacy event for backward compatibility
            io.to('security_room').emit('sos_status_update', eventWithEmail);
            io.to(`sos_${id}`).emit('sos_status_update', eventWithEmail);
        }
        res.json(eventWithEmail);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
};
exports.updateStatus = updateStatus;
const clearHistory = async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({ error: 'Authentication required' });
            return;
        }
        // Only security can clear history
        if (req.user.role !== 'security') {
            res.status(403).json({ error: 'Only security personnel can clear history' });
            return;
        }
        const result = await (0, sos_1.clearAllSOSHistory)();
        res.json({ message: 'History cleared successfully', deleted: result.deleted });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
};
exports.clearHistory = clearHistory;
/**
 * GET /api/sos/:id/events
 * Returns all events for a specific SOS
 */
const getSOSEventHistoryController = async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({ error: 'Authentication required' });
            return;
        }
        const { id } = req.params;
        // First verify the SOS exists and user has access
        const sosEvent = await (0, sos_1.getSOSEventById)(id);
        if (!sosEvent) {
            res.status(404).json({ error: 'SOS event not found' });
            return;
        }
        // Students can only see their own events
        if (req.user.role === 'student' && sosEvent.user_id !== req.user.id) {
            res.status(403).json({ error: 'Access denied' });
            return;
        }
        // Get all events for this SOS
        const events = await (0, sos_1.getSOSEventHistory)(id);
        res.json(events);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
};
exports.getSOSEventHistoryController = getSOSEventHistoryController;
//# sourceMappingURL=sos.controller.js.map