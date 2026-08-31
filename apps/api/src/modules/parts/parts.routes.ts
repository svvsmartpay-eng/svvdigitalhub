import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/auth.middleware';
import prisma from '../../config/database';
import { createAuditLog } from '../../lib/auditLog';

const router = Router();
router.use(authenticate);

// List parts
router.get('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Math.min(Number(req.query.limit) || 20, 100);
    const skip = (page - 1) * limit;
    const where: any = { organizationId: req.user!.orgId };
    if (req.query.search) where.name = { contains: req.query.search as string, mode: 'insensitive' };
    if (req.query.belowReorder) where.AND = [{ stock: { lte: prisma.sparePart.fields.reorderLevel } }];
    const [data, total] = await Promise.all([
      prisma.sparePart.findMany({ where, skip, take: limit, orderBy: { name: 'asc' } }),
      prisma.sparePart.count({ where }),
    ]);
    res.json({ success: true, data, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (err) { next(err); }
});

// Get part
router.get('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const part = await prisma.sparePart.findUnique({
      where: { id: req.params.id },
      include: { transactions: { orderBy: { doneAt: 'desc' }, take: 20 } },
    });
    res.json({ success: true, data: part });
  } catch (err) { next(err); }
});

// Create part
router.post('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { generatePartCode } = await import('../../lib/idGenerator');
    const partCode = await generatePartCode();
    const part = await prisma.sparePart.create({
      data: { ...req.body, partCode, organizationId: req.user!.orgId },
    });
    res.status(201).json({ success: true, data: part });
  } catch (err) { next(err); }
});

// Receive stock (IN)
router.post('/:id/receive', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const qty = Number(req.body.quantity);
    await prisma.$transaction([
      prisma.sparePart.update({ where: { id: req.params.id }, data: { stock: { increment: qty } } }),
      prisma.inventoryTransaction.create({
        data: { partId: req.params.id, type: 'IN', quantity: qty, unitCost: req.body.unitCost, totalCost: req.body.totalCost, reference: req.body.reference, notes: req.body.notes, doneBy: req.user!.sub },
      }),
    ]);
    res.json({ success: true, data: { message: 'Stock received' } });
  } catch (err) { next(err); }
});

// Update part
router.put('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const part = await prisma.sparePart.update({ where: { id: req.params.id }, data: req.body });
    res.json({ success: true, data: part });
  } catch (err) { next(err); }
});

export default router;
