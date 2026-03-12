import { Router } from 'express';
import { authenticateToken, requireRole } from '../middlewares/auth';
import { approveSecurityUser, deleteSecurityUser, listSecurityUsers } from '../controllers/admin.controller';

const router = Router();

router.use(authenticateToken);
router.use(requireRole(['admin']));

router.get('/security-users', listSecurityUsers);
router.patch('/security-users/:id/approve', approveSecurityUser);
router.delete('/security-users/:id', deleteSecurityUser);

export default router;
