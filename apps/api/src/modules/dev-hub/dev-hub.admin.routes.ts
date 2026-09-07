import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/rbac.middleware';
import * as ctrl from './dev-hub.admin.controller';

const router = Router();

router.use(authenticate);
router.use(requireRole('SUPER_ADMIN', 'ADMIN'));

router.get('/categories', ctrl.getCategories);
router.post('/categories', ctrl.createCategory);

router.get('/teams', ctrl.getTeams);
router.post('/teams', ctrl.createTeam);

router.get('/issues', ctrl.getIssues);
router.post('/issues', ctrl.createIssue);
router.get('/issues/:id', ctrl.getIssueDetails);
router.put('/issues/:id/status', ctrl.updateIssueStatus);
router.post('/issues/:id/timeline', ctrl.addComment);

export default router;
