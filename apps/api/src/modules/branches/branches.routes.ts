import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { requireMinRole } from '../../middleware/rbac.middleware';
import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/auth.middleware';
import * as svc from './branches.service';

const router = Router();
router.use(authenticate);

router.get('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try { res.json({ success: true, data: await svc.listBranches(req.user!.orgId) }); } catch (err) { next(err); }
});
router.get('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try { res.json({ success: true, data: await svc.getBranch(req.params.id) }); } catch (err) { next(err); }
});
router.post('/', requireMinRole('SUPER_ADMIN'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try { res.status(201).json({ success: true, data: await svc.createBranch(req.user!.orgId, req.body, req.user!.sub) }); } catch (err) { next(err); }
});
router.put('/:id', requireMinRole('SUPER_ADMIN'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try { res.json({ success: true, data: await svc.updateBranch(req.params.id, req.body, req.user!.orgId, req.user!.sub) }); } catch (err) { next(err); }
});

export default router;
