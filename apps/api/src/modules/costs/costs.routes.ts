import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/auth.middleware';
import prisma from '../../config/database';
import { upload } from '../../middleware/upload.middleware';

const router = Router();
router.use(authenticate);

router.get('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const skip = (page - 1) * limit;
    const where: any = { organizationId: req.user!.orgId };
    if (req.query.branchId) where.branchId = req.query.branchId;
    if (req.query.assetId) where.assetId = req.query.assetId;
    if (req.query.categoryType) where.categoryType = req.query.categoryType;
    if (req.query.dateFrom || req.query.dateTo) {
      where.recordedAt = {};
      if (req.query.dateFrom) where.recordedAt.gte = new Date(req.query.dateFrom as string);
      if (req.query.dateTo) where.recordedAt.lte = new Date(req.query.dateTo as string);
    }
    const [data, total, summary] = await Promise.all([
      prisma.costEntry.findMany({ where, skip, take: limit, orderBy: { recordedAt: 'desc' } }),
      prisma.costEntry.count({ where }),
      prisma.costEntry.aggregate({ where, _sum: { amount: true }, _count: true }),
    ]);
    res.json({ success: true, data, meta: { page, limit, total, totalPages: Math.ceil(total / limit), totalAmount: summary._sum.amount } });
  } catch (err) { next(err); }
});

router.post('/', upload.single('invoice'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const entry = await prisma.costEntry.create({
      data: {
        ...req.body, organizationId: req.user!.orgId, recordedBy: req.user!.sub,
        invoiceUrl: req.file ? `/uploads/${req.file.filename}` : undefined,
        invoiceDate: req.body.invoiceDate ? new Date(req.body.invoiceDate) : undefined,
        amount: Number(req.body.amount),
      },
    });
    res.status(201).json({ success: true, data: entry });
  } catch (err) { next(err); }
});

router.get('/summary', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const where: any = { organizationId: req.user!.orgId };
    if (req.query.branchId) where.branchId = req.query.branchId;
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const yearStart = new Date(now.getFullYear(), 3, 1); // April = Indian fiscal year

    const [thisMonth, ytd, byCategory, byBranch] = await Promise.all([
      prisma.costEntry.aggregate({ where: { ...where, recordedAt: { gte: monthStart } }, _sum: { amount: true } }),
      prisma.costEntry.aggregate({ where: { ...where, recordedAt: { gte: yearStart } }, _sum: { amount: true } }),
      prisma.costEntry.groupBy({ by: ['categoryType'], where, _sum: { amount: true } }),
      prisma.costEntry.groupBy({ by: ['branchId'], where, _sum: { amount: true } }),
    ]);

    res.json({ success: true, data: { thisMonth: thisMonth._sum.amount, ytd: ytd._sum.amount, byCategory, byBranch } });
  } catch (err) { next(err); }
});

export default router;
