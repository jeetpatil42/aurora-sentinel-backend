import { Router } from 'express';
import { authenticateToken } from '../middlewares/auth';
import { getPresentationModeStatus, togglePresentationMode } from '../controllers/presentation.controller';

const router = Router();

router.use(authenticateToken);

router.get('/', getPresentationModeStatus);
router.post('/toggle', togglePresentationMode);

export default router;
