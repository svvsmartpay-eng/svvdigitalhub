import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/auth.middleware';
import prisma from '../../config/database';
import { AppError } from '../../middleware/error.middleware';

const router = Router();
router.use(authenticate);

// List PM schedules
router.get('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const where: any = { plan: { organizationId: req.user!.orgId } };
    if (req.query.status) where.status = req.query.status;
    if (req.query.assetId) where.assetId = req.query.assetId;
    if (req.query.branchId) where.plan = { ...where.plan, branchId: req.query.branchId };
    const schedules = await prisma.pMSchedule.findMany({
      where, include: { plan: { include: { category: true } } },
      orderBy: { dueDate: 'asc' }, take: 100,
    });
    res.json({ success: true, data: schedules });
  } catch (err) { next(err); }
});

// List PM plans
router.get('/plans', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const plans = await prisma.pMPlan.findMany({
      where: { organizationId: req.user!.orgId, isActive: true },
      include: { category: true, checklist: true, assetPlans: { include: { asset: { select: { assetId: true, name: true } } } } },
      orderBy: { name: 'asc' },
    });
    res.json({ success: true, data: plans });
  } catch (err) { next(err); }
});

// Create PM plan
router.post('/plans', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const plan = await prisma.pMPlan.create({
      data: {
        organizationId: req.user!.orgId, branchId: req.body.branchId,
        categoryId: req.body.categoryId, checklistId: req.body.checklistId,
        name: req.body.name, frequency: req.body.frequency, customDays: req.body.customDays,
        startDate: new Date(req.body.startDate), nextDueDate: new Date(req.body.startDate),
        assignedTo: req.body.assignedTo,
      },
    });
    res.status(201).json({ success: true, data: plan });
  } catch (err) { next(err); }
});

// Execute PM (complete a schedule)
router.post('/:id/complete', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const schedule = await prisma.pMSchedule.findUnique({ where: { id: req.params.id }, include: { plan: true } });
    if (!schedule) throw new AppError(404, 'PM schedule not found');

    // Compute next due date
    const freqMap: Record<string, number> = { DAILY: 1, WEEKLY: 7, MONTHLY: 30, QUARTERLY: 90, HALF_YEARLY: 180, ANNUALLY: 365 };
    const days = schedule.plan.customDays || freqMap[schedule.plan.frequency] || 30;
    const nextDue = new Date(schedule.dueDate);
    nextDue.setDate(nextDue.getDate() + days);

    await prisma.pMSchedule.update({
      where: { id: req.params.id },
      data: { status: 'COMPLETED', completedBy: req.user!.sub, completedAt: new Date(), result: req.body.result, notes: req.body.notes, nextDueDate: nextDue, responses: req.body.responses, evidencePhotos: req.body.photos || [] },
    });

    // Create next schedule
    await prisma.pMSchedule.create({ data: { planId: schedule.planId, assetId: schedule.assetId, dueDate: nextDue, status: 'UPCOMING', assignedTo: schedule.assignedTo } });

    res.json({ success: true, data: { message: 'PM completed, next scheduled for ' + nextDue.toLocaleDateString() } });
  } catch (err) { next(err); }
});

// Checklist templates
router.get('/checklists', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = await prisma.checklistTemplate.findMany({
      where: { organizationId: req.user!.orgId, isActive: true },
      include: { questions: { orderBy: { order: 'asc' } } },
    });
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

router.post('/checklists', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const tmpl = await prisma.checklistTemplate.create({
      data: {
        organizationId: req.user!.orgId, categoryId: req.body.categoryId,
        name: req.body.name, description: req.body.description,
        frequency: req.body.frequency, estimatedMins: req.body.estimatedMins,
        questions: req.body.questions ? { create: req.body.questions.map((q: any, i: number) => ({ ...q, order: i + 1 })) } : undefined,
      },
    });
    res.status(201).json({ success: true, data: tmpl });
  } catch (err) { next(err); }
});

export default router;
