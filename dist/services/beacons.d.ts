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
export declare function getBeaconById(beaconId: string): Promise<BeaconDevice | null>;
export declare function verifyBeaconDevice(beaconId: string, deviceKey: string): Promise<BeaconDevice | null>;
export declare function touchBeacon(beaconId: string): Promise<void>;
//# sourceMappingURL=beacons.d.ts.map