import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth';
import { supabaseAdmin } from '../db/supabaseAdmin';

export interface RiskZone {
  id: string;
  name: string;
  type: 'high' | 'low';
  polygon: any; // GeoJSON
  multiplier: number;
  description: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * GET /api/risk-zones
 * Returns all risk zones with GeoJSON polygons
 */
export const getRiskZones = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { data: zones, error } = await supabaseAdmin
      .from('risk_zones')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to fetch risk zones:', error);
      res.status(500).json({ error: 'Failed to fetch risk zones' });
      return;
    }

    res.json(zones || []);
  } catch (error: any) {
    console.error('Error fetching risk zones:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
