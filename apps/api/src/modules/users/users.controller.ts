import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/auth.middleware';
import * as svc from './users.service';

export async function list(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const result = await svc.listUsers(req.user!.orgId, {
      page: Number(req.query.page) || 1,
      limit: Number(req.query.limit) || 20,
      search: req.query.search as string,
      status: req.query.status as string,
    });
    res.json({ success: true, ...result });
  } catch (err) { next(err); }
}

export async function getById(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const data = await svc.getUser(req.params.id);
    res.json({ success: true, data });
  } catch (err) { next(err); }
}

export async function create(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const data = await svc.createUser(req.user!.orgId, req.body, req.user!.sub);
    res.status(201).json({ success: true, data });
  } catch (err) { next(err); }
}

export async function update(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const data = await svc.updateUser(req.params.id, req.body, req.user!.orgId, req.user!.sub);
    res.json({ success: true, data });
  } catch (err) { next(err); }
}

export async function resetPassword(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const data = await svc.resetPassword(req.params.id, req.user!.orgId, req.user!.sub);
    res.json({ success: true, data });
  } catch (err) { next(err); }
}

export async function getRoles(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const data = await svc.listRoles(req.user!.orgId);
    res.json({ success: true, data });
  } catch (err) { next(err); }
}

export async function updateProfile(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const data = await svc.updateProfile(req.user!.sub, req.body);
    res.json({ success: true, data });
  } catch (err) { next(err); }
}

export async function getLiveStatus(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const data = await svc.getLiveStatus(req.user!.orgId);
    res.json({ success: true, data });
  } catch (err) { next(err); }
}
