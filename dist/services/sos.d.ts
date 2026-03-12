export interface SOSEvent {
    id: string;
    user_id: string;
    risk_score: number;
    factors: {
        audio: number;
        motion: number;
        time: number;
        location: number;
    };
    location?: {
        lat?: number;
        lng?: number;
        address?: string;
    };
    trigger_type: 'manual' | 'ai' | 'beacon';
    status: 'new' | 'acknowledged' | 'resolved';
    attachments?: string[];
    created_at: string;
    updated_at: string;
}
export declare function createSOSEvent(data: {
    user_id: string;
    risk_score: number;
    factors: {
        audio: number;
        motion: number;
        time: number;
        location: number;
    };
    location?: any;
    trigger_type: 'manual' | 'ai' | 'beacon';
    attachments?: string[];
}): Promise<SOSEvent>;
export declare function getSOSEventById(eventId: string): Promise<SOSEvent | null>;
export declare function getSOSEvents(filters?: {
    status?: string;
    user_id?: string;
    limit?: number;
    offset?: number;
}): Promise<SOSEvent[]>;
export declare function updateSOSStatus(eventId: string, status: 'new' | 'acknowledged' | 'resolved', securityId: string): Promise<SOSEvent>;
export declare function createRiskSnapshot(data: {
    event_id?: string;
    user_id: string;
    audio: any;
    motion: any;
    time: any;
    location: any;
    total: number;
}): Promise<void>;
export declare function clearAllSOSHistory(): Promise<{
    deleted: number;
}>;
/**
 * Log an event to sos_event_history
 */
export declare function logSOSEvent(data: {
    sos_id: string;
    type: 'sos_triggered' | 'ai_risk' | 'zone_entered' | 'acknowledged' | 'resolved';
    risk_value?: number;
    meta?: any;
}): Promise<void>;
/**
 * Get all events for a SOS
 */
export declare function getSOSEventHistory(sosId: string): Promise<Array<{
    id: string;
    sos_id: string;
    type: string;
    risk_value: number | null;
    meta: any;
    timestamp: string;
}>>;
//# sourceMappingURL=sos.d.ts.map