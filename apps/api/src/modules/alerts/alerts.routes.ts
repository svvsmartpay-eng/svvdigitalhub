import { Router } from 'express';
import * as ctrl from './alerts.controller';
import { authenticate } from '../../middleware/auth.middleware';

const router = Router();
router.use(authenticate);
router.get('/daily', ctrl.getAlerts);

export default router;
