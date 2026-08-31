import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { requireMinRole } from '../../middleware/rbac.middleware';
import * as ctrl from './users.controller';

const router = Router();
router.use(authenticate);

router.get('/', requireMinRole('STAFF'), ctrl.list);
router.get('/roles', ctrl.getRoles);
router.get('/live/status', requireMinRole('ADMIN'), ctrl.getLiveStatus);
router.put('/me/profile', ctrl.updateProfile);
router.get('/:id', ctrl.getById);
router.post('/', requireMinRole('ADMIN'), ctrl.create);
router.put('/:id', requireMinRole('ADMIN'), ctrl.update);
router.post('/:id/reset-password', requireMinRole('ADMIN'), ctrl.resetPassword);

export default router;
