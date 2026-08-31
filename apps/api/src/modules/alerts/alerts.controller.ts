import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/auth.middleware';
import * as svc from './alerts.service';

export async function getAlerts(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const data = await svc.getDailyAlerts(req.user!.orgId, req.user!.sub, (req.query.branchId as string) || undefined);
    res.json({ success: true, data });
  } catch (err) { next(err); }
}
