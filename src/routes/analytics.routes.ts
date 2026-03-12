import { Router } from 'express';
import { authenticateToken } from '../middlewares/auth';
import { getWeeklyAlerts } from '../controllers/analytics.controller';

const router = Router();

router.use(authenticateToken);

router.get('/alerts/week', getWeeklyAlerts);

export default router;
