import { Request, Response, NextFunction } from 'express';
import { touchBeacon, verifyBeaconDevice, BeaconDevice } from '../services/beacons';

export interface BeaconRequest extends Request {
  beacon?: BeaconDevice;
}

export async function authenticateBeacon(
  req: BeaconRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const beaconId = String(req.headers['x-device-id'] || req.headers['x-beacon-id'] || '').trim();
    const deviceKey = String(req.headers['x-device-key'] || req.headers['x-api-key'] || '').trim();

    if (!beaconId || !deviceKey) {
      res.status(401).json({ error: 'Beacon authentication required' });
      return;
    }

    const beacon = await verifyBeaconDevice(beaconId, deviceKey);
    if (!beacon) {
      res.status(403).json({ error: 'Invalid beacon credentials' });
      return;
    }

    req.beacon = beacon;
    await touchBeacon(beacon.id);
    next();
  } catch (error) {
    res.status(500).json({ error: 'Beacon authentication failed' });
  }
}
