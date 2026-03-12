import { Router } from 'express';
import { register, verify, login, me, createLocalUser } from '../controllers/auth.controller';
import { authenticateToken } from '../middlewares/auth';

const router = Router();

router.post('/register', register);
router.post('/verify', verify);
router.post('/login', login);
router.post('/create-local-user', createLocalUser);
router.get('/me', authenticateToken, me);

export default router;
