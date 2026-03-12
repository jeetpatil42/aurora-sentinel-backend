"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRiskZones = void 0;
const supabaseAdmin_1 = require("../db/supabaseAdmin");
/**
 * GET /api/risk-zones
 * Returns all risk zones with GeoJSON polygons
 */
const getRiskZones = async (req, res) => {
    try {
        const { data: zones, error } = await supabaseAdmin_1.supabaseAdmin
            .from('risk_zones')
            .select('*')
            .order('created_at', { ascending: false });
        if (error) {
            console.error('Failed to fetch risk zones:', error);
            res.status(500).json({ error: 'Failed to fetch risk zones' });
            return;
        }
        res.json(zones || []);
    }
    catch (error) {
        console.error('Error fetching risk zones:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.getRiskZones = getRiskZones;
//# sourceMappingURL=risk-zones.controller.js.map