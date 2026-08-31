import { Router, Response, NextFunction } from 'express';
import { authenticate, AuthRequest } from '../../middleware/auth.middleware';
import { upload } from '../../middleware/upload.middleware';
import * as svc from './tasks.service';

const router = Router();
router.use(authenticate);

router.get('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userRole = req.user?.roles?.[0] || 'STAFF';
    const result = await svc.listTasks(
      req.user!.orgId,
      {
        page: Number(req.query.page) || 1,
        limit: Number(req.query.limit) || 50,
        search: req.query.search as string,
        branchId: req.query.branchId as string,
        priority: req.query.priority as string,
        status: req.query.status as string,
        assignedToId: req.query.assignedToId as string,
        assignedById: req.query.assignedById as string,
        filterType: req.query.filterType as any,
      },
      req.user?.sub,
      userRole
    );
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
});

router.get('/stats', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userRole = req.user?.roles?.[0] || 'STAFF';
    const data = await svc.getTaskStats(
      req.user!.orgId,
      req.user?.sub,
      userRole,
      req.query.branchId as string
    );
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = await svc.getTask(req.params.id);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

router.post('/', upload.array('attachments', 5), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const files = req.files as Express.Multer.File[] | undefined;
    const attachments = files ? files.map(f => `/uploads/${f.filename}`) : (req.body.attachments || []);

    const data = await svc.createTask(
      req.user!.orgId,
      {
        ...req.body,
        attachments,
      },
      req.user!.sub
    );
    res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

router.patch('/:id/status', upload.array('attachments', 5), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const files = req.files as Express.Multer.File[] | undefined;
    const newAttachments = files ? files.map(f => `/uploads/${f.filename}`) : [];
    const allAttachments = [...newAttachments, ...(req.body.attachments || [])];
    const userRole = req.user?.roles?.[0] || 'STAFF';

    const data = await svc.updateTaskStatus(
      req.params.id,
      {
        status: req.body.status,
        remarks: req.body.remarks || req.body.note,
        attachments: allAttachments,
      },
      req.user!.sub,
      userRole
    );
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

router.post('/:id/updates', upload.array('attachments', 5), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const files = req.files as Express.Multer.File[] | undefined;
    const attachments = files ? files.map(f => `/uploads/${f.filename}`) : (req.body.attachments || []);

    const data = await svc.addTaskProgressUpdate(
      req.params.id,
      {
        content: req.body.content || req.body.remarks,
        attachments,
      },
      req.user!.sub
    );
    res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

export default router;
