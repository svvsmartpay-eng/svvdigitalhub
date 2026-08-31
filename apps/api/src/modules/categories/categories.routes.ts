import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { requireMinRole } from '../../middleware/rbac.middleware';
import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/auth.middleware';
import prisma from '../../config/database';
import { createAuditLog } from '../../lib/auditLog';
import { AppError } from '../../middleware/error.middleware';

const router = Router();
router.use(authenticate);

// List categories
router.get('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const cats = await prisma.assetCategory.findMany({
      where: { organizationId: req.user!.orgId },
      include: { children: true },
      orderBy: { name: 'asc' },
    });
    res.json({ success: true, data: cats });
  } catch (err) { next(err); }
});

// Get single
router.get('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const cat = await prisma.assetCategory.findUnique({ where: { id: req.params.id }, include: { children: true, parent: true } });
    if (!cat) throw new AppError(404, 'Category not found');
    res.json({ success: true, data: cat });
  } catch (err) { next(err); }
});

// Create
router.post('/', requireMinRole('ADMIN'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { code, name, description, trackingMode, defaultCriticality, defaultPMFrequency, parentId, icon, color } = req.body;
    const cat = await prisma.assetCategory.create({
      data: { organizationId: req.user!.orgId, code, name, description, trackingMode, defaultCriticality, defaultPMFrequency, parentId, icon, color },
    });
    await createAuditLog({ organizationId: req.user!.orgId, userId: req.user!.sub, action: 'CREATE', resource: 'category', resourceId: cat.id, newValues: req.body });
    res.status(201).json({ success: true, data: cat });
  } catch (err) { next(err); }
});

// Update
router.put('/:id', requireMinRole('ADMIN'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const cat = await prisma.assetCategory.update({ where: { id: req.params.id }, data: req.body });
    await createAuditLog({ organizationId: req.user!.orgId, userId: req.user!.sub, action: 'UPDATE', resource: 'category', resourceId: req.params.id, newValues: req.body });
    res.json({ success: true, data: cat });
  } catch (err) { next(err); }
});

export default router;
