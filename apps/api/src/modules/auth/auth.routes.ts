import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import * as ctrl from './auth.controller';

const router = Router();

router.post('/login', ctrl.login);
router.post('/refresh', ctrl.refresh);
router.post('/logout', ctrl.logout);
router.get('/me', authenticate, ctrl.getMe);
router.post('/change-password', authenticate, ctrl.changePassword);

export default router;
