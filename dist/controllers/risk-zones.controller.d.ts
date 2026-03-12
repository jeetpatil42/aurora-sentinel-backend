import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth';
export interface RiskZone {
    id: string;
    name: string;
    type: 'high' | 'low';
    polygon: any;
    multiplier: number;
    description: string | null;
    created_at: string;
    updated_at: string;
}
/**
 * GET /api/risk-zones
 * Returns all risk zones with GeoJSON polygons
 */
export declare const getRiskZones: (req: AuthRequest, res: Response) => Promise<void>;
//# sourceMappingURL=risk-zones.controller.d.ts.map