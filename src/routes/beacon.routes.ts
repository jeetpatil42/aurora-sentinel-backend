import { Router } from 'express';
import { authenticateBeacon } from '../middlewares/beaconAuth';
import { authenticateToken, requireRole } from '../middlewares/auth';
import { createBeaconSOS, getBeaconStatuses, recordHeartbeat } from '../controllers/beacon.controller';

const router = Router();

router.post('/sos', authenticateBeacon, createBeaconSOS);
router.post('/heartbeat', authenticateBeacon, recordHeartbeat);
router.get('/status', authenticateToken, requireRole(['security']), getBeaconStatuses);

export default router;
