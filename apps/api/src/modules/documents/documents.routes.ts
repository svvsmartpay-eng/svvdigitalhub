import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/auth.middleware';
import { upload } from '../../middleware/upload.middleware';
import prisma from '../../config/database';
import { AppError } from '../../middleware/error.middleware';

const router = Router();
router.use(authenticate);

router.get('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const where: any = { organizationId: req.user!.orgId };
    if (req.query.referenceType) where.referenceType = req.query.referenceType;
    if (req.query.referenceId) where.referenceId = req.query.referenceId;
    if (req.query.assetId) where.assetId = req.query.assetId;
    const docs = await prisma.document.findMany({ where, orderBy: { uploadedAt: 'desc' }, take: 50 });
    res.json({ success: true, data: docs });
  } catch (err) { next(err); }
});

router.post('/', upload.single('file'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.file) throw new AppError(400, 'File required');
    const doc = await prisma.document.create({
      data: {
        organizationId: req.user!.orgId,
        referenceType: req.body.referenceType, referenceId: req.body.referenceId,
        assetId: req.body.assetId, vendorId: req.body.vendorId, visitId: req.body.visitId,
        type: req.body.type || 'OTHER', name: req.body.name || req.file.originalname,
        fileName: req.file.filename, fileUrl: `/uploads/${req.file.filename}`,
        fileSize: req.file.size, mimeType: req.file.mimetype,
        uploadedBy: req.user!.sub,
        expiresAt: req.body.expiresAt ? new Date(req.body.expiresAt) : undefined,
        notes: req.body.notes,
      },
    });
    res.status(201).json({ success: true, data: doc });
  } catch (err) { next(err); }
});

router.delete('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await prisma.document.delete({ where: { id: req.params.id } });
    res.json({ success: true, data: { message: 'Deleted' } });
  } catch (err) { next(err); }
});

export default router;
