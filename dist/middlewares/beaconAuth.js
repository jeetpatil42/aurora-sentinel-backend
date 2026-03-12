"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticateBeacon = authenticateBeacon;
const beacons_1 = require("../services/beacons");
async function authenticateBeacon(req, res, next) {
    try {
        const beaconId = String(req.headers['x-device-id'] || req.headers['x-beacon-id'] || '').trim();
        const deviceKey = String(req.headers['x-device-key'] || req.headers['x-api-key'] || '').trim();
        if (!beaconId || !deviceKey) {
            res.status(401).json({ error: 'Beacon authentication required' });
            return;
        }
        const beacon = await (0, beacons_1.verifyBeaconDevice)(beaconId, deviceKey);
        if (!beacon) {
            res.status(403).json({ error: 'Invalid beacon credentials' });
            return;
        }
        req.beacon = beacon;
        await (0, beacons_1.touchBeacon)(beacon.id);
        next();
    }
    catch (error) {
        res.status(500).json({ error: 'Beacon authentication failed' });
    }
}
//# sourceMappingURL=beaconAuth.js.map