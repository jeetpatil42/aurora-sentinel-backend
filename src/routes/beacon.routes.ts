import { Router } from 'express';
import { authenticateBeacon } from '../middlewares/beaconAuth';
import { authenticateToken, requireRole } from '../middlewares/auth';
import {
  createBeaconAutoAlert,
  createBeaconSOS,
  getBeaconStatuses,
  getManualCheckInstruction,
  recordHeartbeat,
  requestManualCheck,
} from '../controllers/beacon.controller';

const router = Router();

router.post('/sos', authenticateBeacon, createBeaconSOS);
router.post('/auto-alert', authenticateBeacon, createBeaconAutoAlert);
router.post('/heartbeat', authenticateBeacon, recordHeartbeat);
router.get('/manual-check', authenticateBeacon, getManualCheckInstruction);
router.get('/status', authenticateToken, requireRole(['security']), getBeaconStatuses);
router.post('/:beaconId/manual-check', authenticateToken, requireRole(['security']), requestManualCheck);

export default router;
