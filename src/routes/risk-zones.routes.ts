import { Router } from 'express';
import { authenticateToken } from '../middlewares/auth';
import { getRiskZones } from '../controllers/risk-zones.controller';

const router = Router();

router.use(authenticateToken);

router.get('/', getRiskZones);

export default router;
