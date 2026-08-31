import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { requireMinRole } from '../../middleware/rbac.middleware';
import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/auth.middleware';
import prisma from '../../config/database';
import { generateTechId } from '../../lib/idGenerator';
import { createAuditLog } from '../../lib/auditLog';
import { AppError } from '../../middleware/error.middleware';

const router = Router();
router.use(authenticate);

router.get('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Math.min(Number(req.query.limit) || 20, 100);
    const skip = (page - 1) * limit;
    const where: any = { organizationId: req.user!.orgId };
    if (req.query.vendorId) where.vendorId = req.query.vendorId;
    if (req.query.specialization) where.specializations = { has: req.query.specialization };
    if (req.query.isActive !== undefined) where.isActive = req.query.isActive === 'true';
    if (req.query.search) {
      where.OR = [
        { name: { contains: req.query.search as string, mode: 'insensitive' } },
        { techId: { contains: req.query.search as string, mode: 'insensitive' } },
        { phone: { contains: req.query.search as string } },
      ];
    }
    const [data, total] = await Promise.all([
      prisma.technician.findMany({
        where, skip, take: limit,
        include: { vendor: { select: { name: true, code: true } }, _count: { select: { serviceVisits: true } } },
        orderBy: { name: 'asc' },
      }),
      prisma.technician.count({ where }),
    ]);
    res.json({ success: true, data, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (err) { next(err); }
});

router.get('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const t = await prisma.technician.findFirst({
      where: { OR: [{ id: req.params.id }, { techId: req.params.id }] },
      include: {
        vendor: true,
        serviceVisits: { orderBy: { createdAt: 'desc' }, take: 20, include: { asset: { select: { assetId: true, name: true } } } },
        assignments: { include: { workOrder: { select: { workOrderNo: true, status: true } } } },
      },
    });
    if (!t) throw new AppError(404, 'Technician not found');
    res.json({ success: true, data: t });
  } catch (err) { next(err); }
});

router.post('/', requireMinRole('ADMIN'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const techId = await generateTechId();
    const t = await prisma.technician.create({
      data: { ...req.body, techId, organizationId: req.user!.orgId },
    });
    await createAuditLog({ organizationId: req.user!.orgId, userId: req.user!.sub, action: 'CREATE', resource: 'technician', resourceId: t.id, newValues: req.body });
    res.status(201).json({ success: true, data: t });
  } catch (err) { next(err); }
});

router.put('/:id', requireMinRole('ADMIN'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const t = await prisma.technician.update({ where: { id: req.params.id }, data: req.body });
    await createAuditLog({ organizationId: req.user!.orgId, userId: req.user!.sub, action: 'UPDATE', resource: 'technician', resourceId: req.params.id, newValues: req.body });
    res.json({ success: true, data: t });
  } catch (err) { next(err); }
});

export default router;
