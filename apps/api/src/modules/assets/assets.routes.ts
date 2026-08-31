import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { requireMinRole } from '../../middleware/rbac.middleware';
import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/auth.middleware';
import { upload } from '../../middleware/upload.middleware';
import * as svc from './assets.service';

const router = Router();
router.use(authenticate);

router.get('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const result = await svc.listAssets({
      orgId: req.user!.orgId,
      page: Number(req.query.page) || 1,
      limit: Number(req.query.limit) || 20,
      search: req.query.search as string,
      branchId: req.query.branchId as string,
      categoryId: req.query.categoryId as string,
      status: req.query.status as string,
      condition: req.query.condition as string,
      criticality: req.query.criticality as string,
      ownershipType: req.query.ownershipType as string,
    });
    res.json({ success: true, ...result });
  } catch (err) { next(err); }
});

router.get('/stats', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = await svc.getAssetStats(req.user!.orgId, req.query.branchId as string);
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

router.get('/analytics', requireMinRole('ADMIN'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = await svc.getAssetAnalytics(req.user!.orgId, {
      branchId: req.query.branchId as string,
      categoryId: req.query.categoryId as string,
      status: req.query.status as string,
      condition: req.query.condition as string,
      warrantyStatus: req.query.warrantyStatus as string,
      amcStatus: req.query.amcStatus as string,
      dateFrom: req.query.dateFrom as string,
      dateTo: req.query.dateTo as string,
    });
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

router.get('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try { res.json({ success: true, data: await svc.getAsset(req.params.id) }); } catch (err) { next(err); }
});

router.get('/:id/history', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try { res.json({ success: true, data: await svc.getAssetHistory(req.params.id) }); } catch (err) { next(err); }
});

router.get('/:id/qr', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const asset = await svc.getAsset(req.params.id);
    res.json({ success: true, data: { assetId: asset.assetId, qrCode: asset.qrCode, name: asset.name, status: asset.status, branch: (asset as any).branch } });
  } catch (err) { next(err); }
});

router.post('/', requireMinRole('ADMIN'), upload.single('photo'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = { ...req.body, photoUrl: req.file ? `/uploads/${req.file.filename}` : undefined };
    const asset = await svc.createAsset(req.user!.orgId, data, req.user!.sub);
    res.status(201).json({ success: true, data: asset });
  } catch (err) { next(err); }
});

router.put('/:id', requireMinRole('ADMIN'), upload.single('photo'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = { ...req.body, ...(req.file ? { photoUrl: `/uploads/${req.file.filename}` } : {}) };
    res.json({ success: true, data: await svc.updateAsset(req.params.id, data, req.user!.orgId, req.user!.sub) });
  } catch (err) { next(err); }
});

router.post('/:id/calculate-health', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = await svc.calculateAssetHealth(req.params.id);
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

router.post('/:id/generate-qr', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const asset = await svc.getAsset(req.params.id);
    const qrUrl = await svc.generateQRCode(asset.id, asset.assetId);
    res.json({ success: true, data: { qrCode: qrUrl } });
  } catch (err) { next(err); }
});

export default router;
