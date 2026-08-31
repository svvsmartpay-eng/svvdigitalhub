import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { requireMinRole } from '../../middleware/rbac.middleware';
import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/auth.middleware';
import { upload } from '../../middleware/upload.middleware';
import * as svc from './issues.service';
import { IssueStatus } from '@prisma/client';

const router = Router();
router.use(authenticate);

router.get('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userRole = req.user?.roles?.[0] || 'STAFF';
    const result = await svc.listIssues(req.user!.orgId, {
      page: Number(req.query.page) || 1,
      limit: Number(req.query.limit) || 100,
      search: req.query.search as string,
      branchId: req.query.branchId as string,
      status: req.query.status as string,
      priority: req.query.priority as string,
      assetId: req.query.assetId as string,
      issueType: req.query.issueType as string,
      assignedToId: req.query.assignedToId as string,
      raisedById: req.query.raisedById as string,
      sla: req.query.sla as string,
      dateFrom: req.query.dateFrom as string,
      dateTo: req.query.dateTo as string,
    }, req.user?.sub, userRole);
    res.json({ success: true, ...result });
  } catch (err) { next(err); }
});

router.get('/stats', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userRole = req.user?.roles?.[0] || 'STAFF';
    const data = await svc.getIssueStats(req.user!.orgId, req.query.branchId as string, req.user?.sub, userRole);
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

router.get('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userRole = req.user?.roles?.[0] || 'STAFF';
    res.json({ success: true, data: await svc.getIssue(req.params.id, req.user?.sub, userRole) });
  } catch (err) { next(err); }
});

router.post('/', upload.array('photos', 5), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const files = req.files as Express.Multer.File[];
    const photos = files?.map(f => `/uploads/${f.filename}`) || [];
    const data = await svc.raiseIssue(req.user!.orgId, { ...req.body, photos }, req.user!.sub, req.user!.email);
    res.status(201).json({ success: true, data });
  } catch (err) { next(err); }
});

router.patch('/:id/status', requireMinRole('STAFF'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = await svc.updateIssueStatus(
      req.params.id,
      req.body.status as IssueStatus,
      req.user!.sub,
      req.user!.orgId,
      req.body.note,
      req.body.costs
    );
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

router.post('/:id/comments', upload.array('attachments', 5), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const files = req.files as Express.Multer.File[];
    const attachments = files?.map(f => `/uploads/${f.filename}`) || [];
    const data = await svc.addIssueComment(req.params.id, req.user!.sub, req.body.content, attachments);
    res.status(201).json({ success: true, data });
  } catch (err) { next(err); }
});

router.patch('/:id/assign', requireMinRole('BRANCH_MANAGER'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = await svc.assignIssue(req.params.id, req.body.assignedToId, req.user!.sub, req.user!.orgId);
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

router.post('/bulk-assign', requireMinRole('BRANCH_MANAGER'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { issueIds, assignedToId } = req.body;
    const data = await svc.bulkAssignIssues(issueIds || [], assignedToId, req.user!.sub, req.user!.orgId);
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

router.post('/bulk-status', requireMinRole('STAFF'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { issueIds, status, note } = req.body;
    const data = await svc.bulkUpdateIssueStatus(issueIds || [], status, req.user!.sub, req.user!.orgId, note);
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

router.post('/:id/service-token', requireMinRole('STAFF'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { generateServiceToken } = await import('../portal/portal.service');
    const data = await generateServiceToken(req.params.id);
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

export default router;

