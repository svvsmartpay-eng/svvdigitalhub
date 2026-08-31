import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { requireMinRole } from '../../middleware/rbac.middleware';
import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/auth.middleware';
import prisma from '../../config/database';
import { generateWorkOrderNo } from '../../lib/idGenerator';
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
    if (req.query.branchId) where.branchId = req.query.branchId;
    if (req.query.status) where.status = req.query.status;
    if (req.query.assetId) where.assetId = req.query.assetId;
    if (req.query.vendorId) where.vendorId = req.query.vendorId;
    if (req.query.search) {
      where.OR = [
        { workOrderNo: { contains: req.query.search as string, mode: 'insensitive' } },
        { title: { contains: req.query.search as string, mode: 'insensitive' } },
      ];
    }
    const [data, total] = await Promise.all([
      prisma.workOrder.findMany({
        where, skip, take: limit,
        include: {
          branch: { select: { code: true } },
          asset: { select: { assetId: true, name: true } },
          issue: { select: { issueNo: true } },
          vendor: { select: { name: true } },
          assignments: { include: { technician: { select: { name: true, specializations: true } } } },
          approvals: { select: { status: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.workOrder.count({ where }),
    ]);
    res.json({ success: true, data, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (err) { next(err); }
});

router.get('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const wo = await prisma.workOrder.findFirst({
      where: { OR: [{ id: req.params.id }, { workOrderNo: req.params.id }] },
      include: {
        branch: true, asset: { include: { category: true } },
        issue: true, vendor: true,
        assignments: { include: { technician: true } },
        serviceVisits: { include: { technician: { select: { name: true } } } },
        approvals: { include: { approver: { select: { name: true } } } },
        costEntries: true,
      },
    });
    if (!wo) throw new AppError(404, 'Work order not found');
    res.json({ success: true, data: wo });
  } catch (err) { next(err); }
});

router.post('/', requireMinRole('BRANCH_MANAGER'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const workOrderNo = await generateWorkOrderNo();
    const wo = await prisma.workOrder.create({
      data: {
        workOrderNo, organizationId: req.user!.orgId, branchId: req.body.branchId,
        assetId: req.body.assetId, issueId: req.body.issueId,
        title: req.body.title, description: req.body.description,
        priority: req.body.priority || 'MEDIUM', status: 'OPEN',
        vendorId: req.body.vendorId, requiredSkill: req.body.requiredSkill,
        estimatedCost: req.body.estimatedCost,
        expectedDate: req.body.expectedDate ? new Date(req.body.expectedDate) : undefined,
        requiresApproval: req.body.estimatedCost > 2000,
        createdBy: req.user!.sub, notes: req.body.notes,
      },
    });

    // Update issue status
    if (req.body.issueId) {
      await prisma.issue.update({ where: { id: req.body.issueId }, data: { status: 'WORK_ORDER_CREATED' } });
    }

    // Create approval if needed
    if (req.body.estimatedCost > 2000) {
      const approverRole = req.body.estimatedCost > 10000 ? 'SUPER_ADMIN' : 'ADMIN';
      const approver = await prisma.user.findFirst({
        where: { organizationId: req.user!.orgId, userRoles: { some: { role: { type: approverRole } } } },
      });
      if (approver) {
        await prisma.approval.create({
          data: {
            referenceType: 'work_order', referenceId: wo.id, workOrderId: wo.id,
            requestedBy: req.user!.sub, approverId: approver.id,
            amount: req.body.estimatedCost, level: approverRole === 'SUPER_ADMIN' ? 2 : 1,
          },
        });
      }
    }

    // Assign technician if provided
    if (req.body.technicianId) {
      await prisma.workOrderAssignment.create({
        data: { workOrderId: wo.id, technicianId: req.body.technicianId, assignedBy: req.user!.sub },
      });
      await prisma.workOrder.update({ where: { id: wo.id }, data: { status: 'ASSIGNED', technicianId: req.body.technicianId } });
    }

    await createAuditLog({ organizationId: req.user!.orgId, userId: req.user!.sub, action: 'CREATE', resource: 'work_order', resourceId: wo.id, resourceNo: workOrderNo, newValues: req.body });
    res.status(201).json({ success: true, data: wo });
  } catch (err) { next(err); }
});

router.patch('/:id/status', requireMinRole('BRANCH_MANAGER'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const wo = await prisma.workOrder.update({
      where: { id: req.params.id },
      data: { status: req.body.status, ...(req.body.status === 'COMPLETED' ? { completedAt: new Date() } : {}) },
    });
    await createAuditLog({ organizationId: req.user!.orgId, userId: req.user!.sub, action: 'STATUS_CHANGE', resource: 'work_order', resourceId: req.params.id, newValues: { status: req.body.status } });
    res.json({ success: true, data: wo });
  } catch (err) { next(err); }
});

router.patch('/:id/approve', requireMinRole('ADMIN'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await prisma.approval.updateMany({
      where: { workOrderId: req.params.id, status: 'PENDING' },
      data: { status: req.body.approved ? 'APPROVED' : 'REJECTED', remarks: req.body.remarks, decidedAt: new Date() },
    });
    if (req.body.approved) {
      await prisma.workOrder.update({ where: { id: req.params.id }, data: { status: 'APPROVED' } });
    }
    await createAuditLog({ organizationId: req.user!.orgId, userId: req.user!.sub, action: req.body.approved ? 'APPROVE' : 'REJECT', resource: 'work_order', resourceId: req.params.id });
    res.json({ success: true, data: { approved: req.body.approved } });
  } catch (err) { next(err); }
});

export default router;
