import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/auth.middleware';
import prisma from '../../config/database';
import { requireMinRole } from '../../middleware/rbac.middleware';

const router = Router();
router.use(authenticate);

// Get notifications for current user
router.get('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = 30;
    const skip = (page - 1) * limit;
    const where: any = { userId: req.user!.sub };
    if (req.query.isRead !== undefined) where.isRead = req.query.isRead === 'true';

    const [data, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' } }),
      prisma.notification.count({ where }),
      prisma.notification.count({ where: { userId: req.user!.sub, isRead: false } }),
    ]);
    res.json({ success: true, data, meta: { page, limit, total, totalPages: Math.ceil(total / limit), unreadCount } });
  } catch (err) { next(err); }
});

// Mark as read
router.patch('/:id/read', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await prisma.notification.update({ where: { id: req.params.id, userId: req.user!.sub }, data: { isRead: true, readAt: new Date() } });
    res.json({ success: true, data: { message: 'Marked as read' } });
  } catch (err) { next(err); }
});

// Mark all read
router.post('/mark-all-read', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await prisma.notification.updateMany({ where: { userId: req.user!.sub, isRead: false }, data: { isRead: true, readAt: new Date() } });
    res.json({ success: true, data: { message: 'All marked as read' } });
  } catch (err) { next(err); }
});

export default router;
