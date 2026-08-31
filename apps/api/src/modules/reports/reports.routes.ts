import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { requireMinRole } from '../../middleware/rbac.middleware';
import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/auth.middleware';
import prisma from '../../config/database';

const router = Router();
router.use(authenticate, requireMinRole('BRANCH_MANAGER'));

// Asset Register
router.get('/assets', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const where: any = { organizationId: req.user!.orgId, isActive: true };
    if (req.query.branchId) where.branchId = req.query.branchId;
    if (req.query.categoryId) where.categoryId = req.query.categoryId;
    const assets = await prisma.asset.findMany({
      where,
      include: { branch: { select: { code: true, name: true } }, category: { select: { name: true } } },
      orderBy: { assetId: 'asc' },
    });
    res.json({ success: true, data: assets, reportType: 'ASSET_REGISTER', generatedAt: new Date() });
  } catch (err) { next(err); }
});

// Issue Aging Report
router.get('/issue-aging', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const where: any = { organizationId: req.user!.orgId, status: { not: 'CLOSED' } };
    if (req.query.branchId) where.branchId = req.query.branchId;
    const issues = await prisma.issue.findMany({
      where,
      include: {
        asset: { select: { assetId: true, name: true } },
        branch: { select: { code: true } },
        raisedBy: { select: { name: true } },
        assignedTo: { select: { name: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
    const now = Date.now();
    const data = issues.map(i => ({
      ...i,
      ageDays: Math.floor((now - i.createdAt.getTime()) / 86400000),
      slaBreached: i.slaResolutionDue ? now > i.slaResolutionDue.getTime() : false,
    }));
    res.json({ success: true, data, reportType: 'ISSUE_AGING', generatedAt: new Date() });
  } catch (err) { next(err); }
});

// SLA Compliance
router.get('/sla-compliance', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const where: any = { organizationId: req.user!.orgId };
    if (req.query.branchId) where.branchId = req.query.branchId;
    if (req.query.dateFrom) where.createdAt = { gte: new Date(req.query.dateFrom as string) };
    const [total, breached, byPriority] = await Promise.all([
      prisma.issue.count({ where }),
      prisma.issue.count({ where: { ...where, slaResolutionBreached: true } }),
      prisma.issue.groupBy({ by: ['priority'], where, _count: true }),
    ]);
    const compliance = total > 0 ? ((total - breached) / total * 100).toFixed(1) : '100';
    res.json({ success: true, data: { total, breached, compliance: `${compliance}%`, byPriority }, reportType: 'SLA_COMPLIANCE', generatedAt: new Date() });
  } catch (err) { next(err); }
});

// Vendor Performance
router.get('/vendor-performance', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const vendors = await prisma.vendor.findMany({
      where: { organizationId: req.user!.orgId, isActive: true },
      include: {
        performanceStats: true,
        _count: { select: { serviceVisits: true } },
      },
    });
    res.json({ success: true, data: vendors, reportType: 'VENDOR_PERFORMANCE', generatedAt: new Date() });
  } catch (err) { next(err); }
});

// PM Compliance
router.get('/pm-compliance', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const [total, completed, overdue] = await Promise.all([
      prisma.pMSchedule.count(),
      prisma.pMSchedule.count({ where: { status: 'COMPLETED' } }),
      prisma.pMSchedule.count({ where: { dueDate: { lt: new Date() }, status: { in: ['UPCOMING', 'DUE'] } } }),
    ]);
    const compliance = total > 0 ? (completed / total * 100).toFixed(1) : '0';
    res.json({ success: true, data: { total, completed, overdue, compliance: `${compliance}%` }, reportType: 'PM_COMPLIANCE', generatedAt: new Date() });
  } catch (err) { next(err); }
});

// Cost Report
router.get('/costs', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const where: any = { organizationId: req.user!.orgId };
    if (req.query.branchId) where.branchId = req.query.branchId;
    if (req.query.dateFrom || req.query.dateTo) {
      where.recordedAt = {};
      if (req.query.dateFrom) where.recordedAt.gte = new Date(req.query.dateFrom as string);
      if (req.query.dateTo) where.recordedAt.lte = new Date(req.query.dateTo as string);
    }
    const [entries, byCategory, byBranch, total] = await Promise.all([
      prisma.costEntry.findMany({ where, orderBy: { recordedAt: 'desc' }, take: 200 }),
      prisma.costEntry.groupBy({ by: ['categoryType'], where, _sum: { amount: true } }),
      prisma.costEntry.groupBy({ by: ['branchId'], where, _sum: { amount: true } }),
      prisma.costEntry.aggregate({ where, _sum: { amount: true } }),
    ]);
    res.json({ success: true, data: { entries, byCategory, byBranch, total: total._sum.amount }, reportType: 'COST_REPORT', generatedAt: new Date() });
  } catch (err) { next(err); }
});

// Warranty/AMC expiry
router.get('/expiring-contracts', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const days = Number(req.query.days) || 90;
    const cutoff = new Date(Date.now() + days * 86400000);
    const [warranties, amcs] = await Promise.all([
      prisma.warranty.findMany({ where: { endDate: { lte: cutoff, gte: new Date() } }, include: { asset: { select: { assetId: true, name: true } } } }),
      prisma.aMC.findMany({ where: { endDate: { lte: cutoff, gte: new Date() } }, include: { asset: { select: { assetId: true, name: true } } } }),
    ]);
    res.json({ success: true, data: { warranties, amcs }, reportType: 'EXPIRING_CONTRACTS', generatedAt: new Date() });
  } catch (err) { next(err); }
});

export default router;
