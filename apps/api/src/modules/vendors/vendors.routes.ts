import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { requireMinRole } from '../../middleware/rbac.middleware';
import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/auth.middleware';
import prisma from '../../config/database';
import { generateVendorCode } from '../../lib/idGenerator';
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
    if (req.query.search) {
      where.OR = [
        { name: { contains: req.query.search as string, mode: 'insensitive' } },
        { code: { contains: req.query.search as string, mode: 'insensitive' } },
      ];
    }
    if (req.query.isActive) where.isActive = req.query.isActive === 'true';
    const [data, total] = await Promise.all([
      prisma.vendor.findMany({
        where, skip, take: limit,
        include: {
          contacts: { where: { isPrimary: true } },
          technicians: { where: { isActive: true }, select: { id: true, name: true, specializations: true } },
          performanceStats: true,
          _count: { select: { serviceVisits: true } },
        },
        orderBy: { name: 'asc' },
      }),
      prisma.vendor.count({ where }),
    ]);
    res.json({ success: true, data, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (err) { next(err); }
});

router.get('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const v = await prisma.vendor.findUnique({
      where: { id: req.params.id },
      include: {
        contacts: true, technicians: true, performanceStats: true, documents: true,
        serviceVisits: { orderBy: { createdAt: 'desc' }, take: 20, include: { asset: { select: { assetId: true, name: true } } } },
      },
    });
    if (!v) throw new AppError(404, 'Vendor not found');
    res.json({ success: true, data: v });
  } catch (err) { next(err); }
});

router.post('/', requireMinRole('ADMIN'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const code = await generateVendorCode();
    const v = await prisma.vendor.create({
      data: { ...req.body, code, organizationId: req.user!.orgId, contacts: undefined, technicians: undefined },
    });
    if (req.body.contacts?.length) {
      await prisma.vendorContact.createMany({ data: req.body.contacts.map((c: any) => ({ ...c, vendorId: v.id })) });
    }
    await createAuditLog({ organizationId: req.user!.orgId, userId: req.user!.sub, action: 'CREATE', resource: 'vendor', resourceId: v.id, newValues: req.body });
    res.status(201).json({ success: true, data: v });
  } catch (err) { next(err); }
});

router.put('/:id', requireMinRole('ADMIN'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const v = await prisma.vendor.update({ where: { id: req.params.id }, data: { ...req.body, contacts: undefined, technicians: undefined } });
    await createAuditLog({ organizationId: req.user!.orgId, userId: req.user!.sub, action: 'UPDATE', resource: 'vendor', resourceId: req.params.id, newValues: req.body });
    res.json({ success: true, data: v });
  } catch (err) { next(err); }
});

router.get('/:id/performance', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const [stats, recentVisits, slaBreaches] = await Promise.all([
      prisma.vendorPerformance.findUnique({ where: { vendorId: req.params.id } }),
      prisma.serviceVisit.findMany({
        where: { vendorId: req.params.id },
        orderBy: { createdAt: 'desc' }, take: 10,
        include: { asset: { select: { assetId: true, name: true } } },
      }),
      prisma.serviceVisit.count({ where: { vendorId: req.params.id, status: 'COMPLETED' } }),
    ]);
    res.json({ success: true, data: { stats, recentVisits, totalCompleted: slaBreaches } });
  } catch (err) { next(err); }
});

export default router;
