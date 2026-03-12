import { Router } from 'express';
import { authenticateBeacon } from '../middlewares/beaconAuth';
import { createBeaconSOS } from '../controllers/beacon.controller';

const router = Router();

router.post('/sos', authenticateBeacon, createBeaconSOS);

export default router;
