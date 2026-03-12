import { Request, Response, NextFunction } from 'express';
import { BeaconDevice } from '../services/beacons';
export interface BeaconRequest extends Request {
    beacon?: BeaconDevice;
}
export declare function authenticateBeacon(req: BeaconRequest, res: Response, next: NextFunction): Promise<void>;
//# sourceMappingURL=beaconAuth.d.ts.map