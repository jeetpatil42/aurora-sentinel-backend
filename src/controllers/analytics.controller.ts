import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth';
import { supabaseAdmin } from '../db/supabaseAdmin';

/**
 * GET /api/analytics/alerts/week
 * Returns weekly SOS and AI alert statistics
 */
export const getWeeklyAlerts = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user || req.user.role !== 'security') {
      res.status(403).json({ error: 'Only security personnel can access analytics' });
      return;
    }

    // Get date range for last 7 days
    const now = new Date();
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Fetch all SOS events from last 7 days
    const { data: events, error } = await supabaseAdmin
      .from('sos_events')
      .select('created_at, trigger_type')
      .gte('created_at', sevenDaysAgo.toISOString())
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Failed to fetch analytics:', error);
      res.status(500).json({ error: 'Failed to fetch analytics' });
      return;
    }

    // Initialize arrays for each day
    const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const sos = new Array(7).fill(0);
    const ai = new Array(7).fill(0);

    // Group events by day
    events?.forEach((event) => {
      const eventDate = new Date(event.created_at);
      const dayIndex = eventDate.getDay(); // 0 = Sunday, 1 = Monday, etc.
      // Convert to Monday = 0 format
      const adjustedIndex = dayIndex === 0 ? 6 : dayIndex - 1;

      if (adjustedIndex >= 0 && adjustedIndex < 7) {
        if (event.trigger_type === 'manual') {
          sos[adjustedIndex]++;
        } else if (event.trigger_type === 'ai') {
          ai[adjustedIndex]++;
        }
      }
    });

    // Calculate KPIs
    const totalSOS = sos.reduce((sum, val) => sum + val, 0);
    const totalAI = ai.reduce((sum, val) => sum + val, 0);
    const peakDayIndex = sos.indexOf(Math.max(...sos));
    const peakDay = labels[peakDayIndex];
    const highestAIRisk = Math.max(...ai);

    res.json({
      labels,
      sos,
      ai,
      kpis: {
        totalSOS,
        totalAI,
        peakDay,
        highestAIRisk,
      },
    });
  } catch (error: any) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
