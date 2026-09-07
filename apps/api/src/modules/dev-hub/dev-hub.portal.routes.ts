import { Router } from 'express';
import { requirePortalToken } from './dev-hub.portal.middleware';
import * as ctrl from './dev-hub.portal.controller';

const router = Router();

router.use(requirePortalToken as any);

router.get('/dashboard', ctrl.getDashboardInfo);
router.get('/issues/:id', ctrl.getIssueDetails);
router.put('/issues/:id/status', ctrl.updateIssueStatus);
router.post('/issues/:id/timeline', ctrl.addComment);

export default router;
