import { Router, Response, NextFunction } from 'express';
import { authenticate, AuthRequest } from '../../middleware/auth.middleware';
import { requireMinRole } from '../../middleware/rbac.middleware';
import * as svc from './plugins.service';

const router = Router();
router.use(authenticate);

router.get('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = await svc.getPluginSettings(req.user!.orgId);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

router.patch('/:key/toggle', requireMinRole('ADMIN'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { isEnabled } = req.body;
    const data = await svc.togglePlugin(req.user!.orgId, req.params.key, Boolean(isEnabled), req.user!.sub);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

export default router;
