import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/auth.middleware';
import { upload } from '../../middleware/upload.middleware';
import prisma from '../../config/database';
import { generateVisitNo } from '../../lib/idGenerator';
import { createAuditLog } from '../../lib/auditLog';
import { AppError } from '../../middleware/error.middleware';

const router = Router();
router.use(authenticate);

// List service visits
router.get('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Math.min(Number(req.query.limit) || 20, 100);
    const skip = (page - 1) * limit;
    const where: any = { organizationId: req.user!.orgId };
    if (req.query.branchId) where.branchId = req.query.branchId;
    if (req.query.status) where.status = req.query.status;
    if (req.query.technicianId) where.technicianId = req.query.technicianId;
    if (req.query.assetId) where.assetId = req.query.assetId;
    const [data, total] = await Promise.all([
      prisma.serviceVisit.findMany({
        where, skip, take: limit,
        include: {
          branch: { select: { code: true } },
          asset: { select: { assetId: true, name: true } },
          technician: { select: { name: true, specializations: true } },
          vendor: { select: { name: true } },
          workOrder: { select: { workOrderNo: true } },
          checkIn: { select: { checkInAt: true } },
          checkOut: { select: { checkOutAt: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.serviceVisit.count({ where }),
    ]);
    res.json({ success: true, data, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (err) { next(err); }
});

// Get single visit
router.get('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const v = await prisma.serviceVisit.findFirst({
      where: { OR: [{ id: req.params.id }, { visitNo: req.params.id }] },
      include: {
        branch: true, asset: { include: { category: true } },
        workOrder: true, vendor: true, technician: true,
        checkIn: true, checkOut: true, diagnosis: true,
        workActions: true, partsUsed: true, testResults: true, verification: true,
        costEntries: true, documents: true,
      },
    });
    if (!v) throw new AppError(404, 'Service visit not found');
    res.json({ success: true, data: v });
  } catch (err) { next(err); }
});

// Create visit
router.post('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const visitNo = await generateVisitNo();
    const visit = await prisma.serviceVisit.create({
      data: {
        visitNo, organizationId: req.user!.orgId, branchId: req.body.branchId,
        assetId: req.body.assetId, workOrderId: req.body.workOrderId, issueId: req.body.issueId,
        vendorId: req.body.vendorId, technicianId: req.body.technicianId,
        serviceCategory: req.body.serviceCategory, purpose: req.body.purpose,
        status: 'SCHEDULED',
        scheduledDate: req.body.scheduledDate ? new Date(req.body.scheduledDate) : undefined,
        createdBy: req.user!.sub, notes: req.body.notes,
      },
    });
    await createAuditLog({ organizationId: req.user!.orgId, userId: req.user!.sub, action: 'CREATE', resource: 'service_visit', resourceId: visit.id, resourceNo: visitNo });
    res.status(201).json({ success: true, data: visit });
  } catch (err) { next(err); }
});

// CHECK-IN
router.post('/:id/checkin', upload.single('photo'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const visit = await prisma.serviceVisit.findUnique({ where: { id: req.params.id } });
    if (!visit) throw new AppError(404, 'Visit not found');
    if (visit.checkInAt) throw new AppError(400, 'Already checked in');

    const checkIn = await prisma.serviceCheckIn.create({
      data: {
        visitId: req.params.id, technicianId: req.body.technicianId,
        techName: req.body.techName, company: req.body.company,
        mobile: req.body.mobile, specialization: req.body.specialization,
        purpose: req.body.purpose, authorizedBy: req.body.authorizedBy,
        visitorId: req.body.visitorId, vehicleNumber: req.body.vehicleNumber,
        entryPoint: req.body.entryPoint, notes: req.body.notes,
        photoUrl: req.file ? `/uploads/${req.file.filename}` : undefined,
      },
    });

    await prisma.serviceVisit.update({
      where: { id: req.params.id },
      data: { status: 'CHECKED_IN', checkInAt: new Date() },
    });

    await createAuditLog({ organizationId: req.user!.orgId, userId: req.user!.sub, action: 'CHECKIN', resource: 'service_visit', resourceId: req.params.id, newValues: { techName: req.body.techName } });
    res.json({ success: true, data: checkIn });
  } catch (err) { next(err); }
});

// Start work
router.post('/:id/start-work', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const visit = await prisma.serviceVisit.update({
      where: { id: req.params.id },
      data: { status: 'IN_PROGRESS', workStartAt: new Date() },
    });
    res.json({ success: true, data: visit });
  } catch (err) { next(err); }
});

// DIAGNOSIS
router.post('/:id/diagnosis', upload.array('photos', 5), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const files = req.files as Express.Multer.File[];
    const photos = files?.map(f => `/uploads/${f.filename}`) || [];
    const diag = await prisma.diagnosis.upsert({
      where: { visitId: req.params.id },
      create: {
        visitId: req.params.id, observedProblem: req.body.observedProblem,
        diagnosis: req.body.diagnosis, rootCause: req.body.rootCause,
        rootCauseCategory: req.body.rootCauseCategory, severity: req.body.severity,
        estimatedCost: req.body.estimatedCost, estimatedTime: req.body.estimatedTime,
        partsRequired: req.body.partsRequired, recommendedAction: req.body.recommendedAction,
        photos, notes: req.body.notes, diagnosedBy: req.user!.sub,
      },
      update: {
        observedProblem: req.body.observedProblem, diagnosis: req.body.diagnosis,
        rootCause: req.body.rootCause, rootCauseCategory: req.body.rootCauseCategory,
        severity: req.body.severity, estimatedCost: req.body.estimatedCost,
        partsRequired: req.body.partsRequired, recommendedAction: req.body.recommendedAction,
        photos: { push: photos }, notes: req.body.notes,
      },
    });
    res.json({ success: true, data: diag });
  } catch (err) { next(err); }
});

// WORK ACTION
router.post('/:id/work-actions', upload.array('photos', 10), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const files = req.files as Express.Multer.File[];
    const beforePhotos = [];
    const afterPhotos = [];
    // Simple: all uploaded as after photos
    const allPhotos = files?.map(f => `/uploads/${f.filename}`) || [];
    const action = await prisma.workAction.create({
      data: {
        visitId: req.params.id, actionType: req.body.actionType,
        description: req.body.description, timeSpentMins: Number(req.body.timeSpentMins) || undefined,
        beforePhotos: req.body.beforePhotos ? JSON.parse(req.body.beforePhotos) : [],
        afterPhotos: allPhotos, performedBy: req.user!.sub, notes: req.body.notes,
      },
    });
    await prisma.serviceVisit.update({ where: { id: req.params.id }, data: { workEndAt: new Date() } });
    res.json({ success: true, data: action });
  } catch (err) { next(err); }
});

// PARTS USED
router.post('/:id/parts', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const part = await prisma.partUsed.create({
      data: {
        visitId: req.params.id, partId: req.body.partId, partName: req.body.partName,
        quantity: Number(req.body.quantity) || 1, unitCost: req.body.unitCost,
        totalCost: req.body.totalCost, oldPartSerial: req.body.oldPartSerial,
        newPartSerial: req.body.newPartSerial, warrantyMonths: req.body.warrantyMonths,
        notes: req.body.notes, recordedBy: req.user!.sub,
      },
    });
    // Reduce stock if linked to spare part
    if (req.body.partId) {
      await prisma.sparePart.update({
        where: { id: req.body.partId },
        data: { stock: { decrement: Number(req.body.quantity) || 1 } },
      });
    }
    res.json({ success: true, data: part });
  } catch (err) { next(err); }
});

// TEST RESULTS
router.post('/:id/test-results', upload.array('evidence', 5), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const files = req.files as Express.Multer.File[];
    const evidencePhotos = files?.map(f => `/uploads/${f.filename}`) || [];
    const result = await prisma.visitTestResult.create({
      data: {
        visitId: req.params.id, result: req.body.result,
        notes: req.body.notes, evidencePhotos, testedBy: req.user!.sub,
        checklistResponses: req.body.checklistResponses ? JSON.parse(req.body.checklistResponses) : undefined,
      },
    });
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
});

// VERIFICATION
router.post('/:id/verification', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const verif = await prisma.verification.upsert({
      where: { visitId: req.params.id },
      create: {
        visitId: req.params.id, verifiedBy: req.user!.sub,
        issueResolved: req.body.issueResolved, workCompleted: req.body.workCompleted,
        assetOperational: req.body.assetOperational, testPassed: req.body.testPassed,
        documentsOk: req.body.documentsOk, partsOk: req.body.partsOk,
        costOk: req.body.costOk, photosOk: req.body.photosOk,
        remarks: req.body.remarks, requireFollowUp: req.body.requireFollowUp,
        followUpDate: req.body.followUpDate ? new Date(req.body.followUpDate) : undefined,
      },
      update: {
        issueResolved: req.body.issueResolved, workCompleted: req.body.workCompleted,
        assetOperational: req.body.assetOperational, testPassed: req.body.testPassed,
        remarks: req.body.remarks,
      },
    });

    if (req.body.issueResolved && req.body.workCompleted) {
      await prisma.serviceVisit.update({ where: { id: req.params.id }, data: { status: 'VERIFIED' } });
    }

    await createAuditLog({ organizationId: req.user!.orgId, userId: req.user!.sub, action: 'VERIFY', resource: 'service_visit', resourceId: req.params.id, newValues: { verified: true } });
    res.json({ success: true, data: verif });
  } catch (err) { next(err); }
});

// CHECK-OUT
router.post('/:id/checkout', upload.array('evidence', 5), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const visit = await prisma.serviceVisit.findUnique({ where: { id: req.params.id }, include: { checkIn: true } });
    if (!visit) throw new AppError(404, 'Visit not found');
    if (!visit.checkIn) throw new AppError(400, 'Cannot check out without checking in first');

    const files = req.files as Express.Multer.File[];
    const evidencePhotos = files?.map(f => `/uploads/${f.filename}`) || [];

    const checkOut = await prisma.serviceCheckOut.create({
      data: {
        visitId: req.params.id, workCompleted: req.body.workCompleted === 'true',
        assetStatus: req.body.assetStatus, pendingWork: req.body.pendingWork,
        followUpRequired: req.body.followUpRequired === 'true',
        nextVisitDate: req.body.nextVisitDate ? new Date(req.body.nextVisitDate) : undefined,
        techRemarks: req.body.techRemarks, managerRemarks: req.body.managerRemarks,
        approvedBy: req.user!.sub, evidencePhotos,
        documents: req.body.documents ? JSON.parse(req.body.documents) : [],
      },
    });

    const checkInTime = visit.checkInAt || visit.createdAt;
    const durationMins = Math.round((Date.now() - checkInTime.getTime()) / 60000);

    await prisma.serviceVisit.update({
      where: { id: req.params.id },
      data: { status: 'COMPLETED', checkOutAt: new Date(), totalDurationMins: durationMins },
    });

    // Update asset status if checkout says it's operational
    if (req.body.assetStatus === 'OPERATIONAL') {
      await prisma.asset.update({ where: { id: visit.assetId }, data: { status: 'OPERATIONAL', lastMaintenanceAt: new Date() } });
    }

    await createAuditLog({ organizationId: req.user!.orgId, userId: req.user!.sub, action: 'CHECKOUT', resource: 'service_visit', resourceId: req.params.id, newValues: { workCompleted: req.body.workCompleted } });
    res.json({ success: true, data: checkOut });
  } catch (err) { next(err); }
});

// Close visit
router.post('/:id/close', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const visit = await prisma.serviceVisit.update({
      where: { id: req.params.id },
      data: { status: 'CLOSED', closedAt: new Date() },
    });
    await createAuditLog({ organizationId: req.user!.orgId, userId: req.user!.sub, action: 'CLOSE', resource: 'service_visit', resourceId: req.params.id });
    res.json({ success: true, data: visit });
  } catch (err) { next(err); }
});

export default router;
