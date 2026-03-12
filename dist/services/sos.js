"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createSOSEvent = createSOSEvent;
exports.getSOSEventById = getSOSEventById;
exports.getSOSEvents = getSOSEvents;
exports.updateSOSStatus = updateSOSStatus;
exports.createRiskSnapshot = createRiskSnapshot;
exports.clearAllSOSHistory = clearAllSOSHistory;
exports.logSOSEvent = logSOSEvent;
exports.getSOSEventHistory = getSOSEventHistory;
const supabaseAdmin_1 = require("../db/supabaseAdmin");
async function createSOSEvent(data) {
    try {
        console.log('📝 Creating SOS event with data:', {
            user_id: data.user_id,
            risk_score: data.risk_score,
            trigger_type: data.trigger_type,
            has_location: !!data.location,
            has_attachments: !!data.attachments,
        });
        // Deduplication: Check for recent SOS from same user with same trigger type (within 30 seconds)
        const thirtySecondsAgo = new Date(Date.now() - 30000).toISOString();
        const { data: recentSOS } = await supabaseAdmin_1.supabaseAdmin
            .from('sos_events')
            .select('id, created_at')
            .eq('user_id', data.user_id)
            .eq('trigger_type', data.trigger_type)
            .gte('created_at', thirtySecondsAgo)
            .order('created_at', { ascending: false })
            .limit(1);
        if (recentSOS && recentSOS.length > 0) {
            console.log('⚠️ Duplicate SOS detected within 30s, returning existing event:', recentSOS[0].id);
            const existingEvent = await getSOSEventById(recentSOS[0].id);
            if (existingEvent) {
                const incomingAttachments = Array.isArray(data.attachments) ? data.attachments.filter(Boolean) : [];
                const existingAttachments = Array.isArray(existingEvent.attachments) ? existingEvent.attachments.filter(Boolean) : [];
                // If a duplicate is detected but the new request contains attachments, merge them into the existing event
                if (incomingAttachments.length > 0) {
                    const merged = Array.from(new Set([...existingAttachments, ...incomingAttachments]));
                    if (merged.length !== existingAttachments.length) {
                        const { data: updated, error: updateError } = await supabaseAdmin_1.supabaseAdmin
                            .from('sos_events')
                            .update({ attachments: merged })
                            .eq('id', existingEvent.id)
                            .select()
                            .single();
                        if (updateError) {
                            console.error('⚠️ Failed to merge attachments into deduped SOS event:', updateError);
                            return existingEvent;
                        }
                        return updated || existingEvent;
                    }
                }
                return existingEvent;
            }
        }
        const { data: event, error } = await supabaseAdmin_1.supabaseAdmin
            .from('sos_events')
            .insert({
            user_id: data.user_id,
            risk_score: data.risk_score,
            factors: data.factors,
            location: data.location || null,
            trigger_type: data.trigger_type,
            status: 'new',
            attachments: data.attachments || [],
        })
            .select()
            .single();
        if (error) {
            console.error('❌ Failed to create SOS event:', error);
            console.error('❌ Error details:', JSON.stringify(error, null, 2));
            throw new Error(`Failed to create SOS event: ${error.message || error.code || 'Unknown error'}`);
        }
        if (!event || !event.id) {
            console.error('❌ SOS event insert returned null or missing ID');
            throw new Error('Failed to create SOS event: No event returned from database');
        }
        console.log('✅ SOS event created successfully:', event.id);
        // Log sos_triggered event (non-blocking)
        try {
            await logSOSEvent({
                sos_id: event.id,
                type: 'sos_triggered',
                risk_value: data.risk_score,
                meta: {
                    trigger_type: data.trigger_type,
                    factors: data.factors,
                    location: data.location,
                },
            });
        }
        catch (logError) {
            console.error('⚠️ Failed to log sos_triggered event (non-critical):', logError.message);
            // Don't throw - event logging should not break SOS creation
        }
        return event;
    }
    catch (error) {
        console.error('❌ Exception in createSOSEvent:', error);
        throw error;
    }
}
async function getSOSEventById(eventId) {
    try {
        const { data, error } = await supabaseAdmin_1.supabaseAdmin
            .from('sos_events')
            .select('*')
            .eq('id', eventId)
            .single();
        if (error) {
            // PGRST116 = not found, which is fine
            if (error.code !== 'PGRST116') {
                console.error('❌ Failed to fetch SOS event by ID:', error);
                console.error('❌ Event ID:', eventId);
            }
            return null;
        }
        if (!data) {
            return null;
        }
        return data;
    }
    catch (error) {
        console.error('❌ Exception in getSOSEventById:', error);
        return null;
    }
}
async function getSOSEvents(filters) {
    try {
        let query = supabaseAdmin_1.supabaseAdmin
            .from('sos_events')
            .select('*');
        if (filters?.status) {
            query = query.eq('status', filters.status);
        }
        if (filters?.user_id) {
            query = query.eq('user_id', filters.user_id);
        }
        // Apply ordering
        query = query.order('created_at', { ascending: false });
        // Apply pagination: use range if offset is provided, otherwise use limit
        if (filters?.offset !== undefined) {
            const limit = filters.limit || 50;
            query = query.range(filters.offset, filters.offset + limit - 1);
        }
        else if (filters?.limit) {
            query = query.limit(filters.limit);
        }
        const { data, error } = await query;
        if (error) {
            console.error('❌ Failed to fetch SOS events:', error);
            console.error('❌ Error details:', JSON.stringify(error, null, 2));
            console.error('❌ Filters used:', filters);
            throw new Error(`Failed to fetch SOS events: ${error.message || error.code || 'Unknown error'}`);
        }
        if (!data) {
            console.warn('⚠️ getSOSEvents returned null data');
            return [];
        }
        return data;
    }
    catch (error) {
        console.error('❌ Exception in getSOSEvents:', error);
        throw error;
    }
}
async function updateSOSStatus(eventId, status, securityId) {
    // Update event status
    const { data: event, error } = await supabaseAdmin_1.supabaseAdmin
        .from('sos_events')
        .update({ status })
        .eq('id', eventId)
        .select()
        .single();
    if (error) {
        throw new Error(`Failed to update SOS event: ${error.message}`);
    }
    // Record security action
    await supabaseAdmin_1.supabaseAdmin
        .from('security_actions')
        .insert({
        sos_id: eventId,
        security_id: securityId,
        action: status === 'acknowledged' ? 'acknowledged' : 'resolved',
    });
    // Ensure chat exists and assign responder (first acknowledging security only)
    try {
        const { data: chats, error: chatFetchError } = await supabaseAdmin_1.supabaseAdmin
            .from('sos_chats')
            .select('id, security_id')
            .eq('sos_id', eventId)
            .limit(1);
        if (chatFetchError) {
            console.warn('Failed to fetch sos_chats row (non-blocking):', chatFetchError.message);
        }
        const chatRow = Array.isArray(chats) && chats.length > 0 ? chats[0] : null;
        if (!chatRow) {
            await supabaseAdmin_1.supabaseAdmin.from('sos_chats').insert({
                sos_id: eventId,
                student_id: event.user_id,
                security_id: status === 'acknowledged' ? securityId : null,
            });
        }
        else if (status === 'acknowledged' && !chatRow.security_id) {
            await supabaseAdmin_1.supabaseAdmin
                .from('sos_chats')
                .update({ security_id: securityId })
                .eq('id', chatRow.id);
        }
    }
    catch (e) {
        console.warn('Failed to upsert/assign sos_chat (non-blocking):', e?.message || e);
    }
    let securityEmail;
    let securityName;
    try {
        const { data: secUser } = await supabaseAdmin_1.supabaseAdmin
            .from('users')
            .select('email,name')
            .eq('id', securityId)
            .single();
        securityEmail = secUser?.email;
        securityName = secUser?.name;
    }
    catch {
        securityEmail = undefined;
        securityName = undefined;
    }
    // Log status change event
    if (status === 'acknowledged' || status === 'resolved') {
        await logSOSEvent({
            sos_id: eventId,
            type: status,
            risk_value: event.risk_score,
            meta: {
                security_id: securityId,
                security_email: securityEmail,
                security_name: securityName,
            },
        });
    }
    return event;
}
async function createRiskSnapshot(data) {
    await supabaseAdmin_1.supabaseAdmin
        .from('risk_snapshots')
        .insert({
        event_id: data.event_id,
        user_id: data.user_id,
        audio: data.audio,
        motion: data.motion,
        time: data.time,
        location: data.location,
        total: data.total,
    });
}
async function clearAllSOSHistory() {
    // First, get count of events before deletion
    const { count: eventCount } = await supabaseAdmin_1.supabaseAdmin
        .from('sos_events')
        .select('*', { count: 'exact', head: true });
    // Delete in order (respecting foreign key constraints)
    // Using a filter that matches all rows: created_at >= epoch (matches all timestamps)
    // 1. Delete event history (references sos_events)
    const { error: historyError } = await supabaseAdmin_1.supabaseAdmin
        .from('sos_event_history')
        .delete()
        .gte('timestamp', '1970-01-01');
    if (historyError) {
        throw new Error(`Failed to delete event history: ${historyError.message}`);
    }
    // 2. Delete security actions (references sos_events)
    const { error: actionsError } = await supabaseAdmin_1.supabaseAdmin
        .from('security_actions')
        .delete()
        .gte('timestamp', '1970-01-01');
    if (actionsError) {
        throw new Error(`Failed to delete security actions: ${actionsError.message}`);
    }
    // 3. Delete risk snapshots (references sos_events)
    const { error: snapshotsError } = await supabaseAdmin_1.supabaseAdmin
        .from('risk_snapshots')
        .delete()
        .gte('created_at', '1970-01-01');
    if (snapshotsError) {
        throw new Error(`Failed to delete risk snapshots: ${snapshotsError.message}`);
    }
    // 4. Delete SOS events
    const { error: eventsError } = await supabaseAdmin_1.supabaseAdmin
        .from('sos_events')
        .delete()
        .gte('created_at', '1970-01-01');
    if (eventsError) {
        throw new Error(`Failed to clear SOS history: ${eventsError.message}`);
    }
    return { deleted: eventCount || 0 };
}
/**
 * Log an event to sos_event_history
 */
async function logSOSEvent(data) {
    try {
        const { error } = await supabaseAdmin_1.supabaseAdmin
            .from('sos_event_history')
            .insert({
            sos_id: data.sos_id,
            type: data.type,
            risk_value: data.risk_value ?? null,
            meta: data.meta || {},
        });
        if (error) {
            console.error('Failed to log SOS event:', error.message, error);
            // Don't throw - event logging should not break main flow
        }
        else {
            console.log(`✅ Logged SOS event: ${data.type} for SOS ${data.sos_id}`);
        }
    }
    catch (error) {
        // Log error but don't throw - event logging should not break main flow
        console.error('Failed to log SOS event (exception):', error.message, error);
    }
}
/**
 * Get all events for a SOS
 */
async function getSOSEventHistory(sosId) {
    const { data, error } = await supabaseAdmin_1.supabaseAdmin
        .from('sos_event_history')
        .select('*')
        .eq('sos_id', sosId)
        .order('timestamp', { ascending: true });
    if (error) {
        console.error('Failed to fetch SOS event history:', error);
        throw new Error(`Failed to fetch SOS event history: ${error.message}`);
    }
    // Always return an array, even if empty
    const events = data || [];
    console.log(`📋 Retrieved ${events.length} events for SOS ${sosId}`);
    return events;
}
//# sourceMappingURL=sos.js.map