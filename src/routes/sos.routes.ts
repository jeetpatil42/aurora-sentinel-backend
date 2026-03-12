import { Router } from 'express';
import { authenticateToken } from '../middlewares/auth';
import { createSOS, getSOS, getSOSById, updateStatus, clearHistory, getSOSEventHistoryController, getRecentSOSChat, getSOSChatById, sendSOSChatMessage } from '../controllers/sos.controller';

const router = Router();

router.use(authenticateToken);

router.post('/', createSOS);
router.get('/recent/chat', getRecentSOSChat);
router.get('/', getSOS);
router.get('/:id/events', getSOSEventHistoryController); // Must be before /:id route
router.get('/:id/chat', getSOSChatById);
router.post('/:id/chat/messages', sendSOSChatMessage);
router.get('/:id', getSOSById);
router.patch('/:id/status', updateStatus);
router.delete('/history', clearHistory);

export default router;
