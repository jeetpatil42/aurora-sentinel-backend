"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getBeaconById = getBeaconById;
exports.verifyBeaconDevice = verifyBeaconDevice;
exports.touchBeacon = touchBeacon;
const bcrypt_1 = __importDefault(require("bcrypt"));
const supabaseAdmin_1 = require("../db/supabaseAdmin");
async function getBeaconById(beaconId) {
    const normalizedId = String(beaconId || '').trim();
    if (!normalizedId) {
        return null;
    }
    const { data, error } = await supabaseAdmin_1.supabaseAdmin
        .from('beacons')
        .select('*')
        .eq('id', normalizedId)
        .single();
    if (error || !data) {
        return null;
    }
    return data;
}
async function verifyBeaconDevice(beaconId, deviceKey) {
    const beacon = await getBeaconById(beaconId);
    if (!beacon || beacon.status !== 'active') {
        return null;
    }
    const isValid = await bcrypt_1.default.compare(deviceKey, beacon.device_key_hash);
    if (!isValid) {
        return null;
    }
    return beacon;
}
async function touchBeacon(beaconId) {
    const normalizedId = String(beaconId || '').trim();
    if (!normalizedId) {
        return;
    }
    await supabaseAdmin_1.supabaseAdmin
        .from('beacons')
        .update({ last_seen_at: new Date().toISOString() })
        .eq('id', normalizedId);
}
//# sourceMappingURL=beacons.js.map