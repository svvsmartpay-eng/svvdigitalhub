import { Request, Response, NextFunction } from 'express';
import { loginSchema, refreshSchema, changePasswordSchema } from './auth.schema';
import * as authService from './auth.service';
import { AuthRequest } from '../../middleware/auth.middleware';

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const body = loginSchema.parse(req.body);
    const result = await authService.login(body.email, body.password);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
}

export async function refresh(req: Request, res: Response, next: NextFunction) {
  try {
    const { refreshToken } = refreshSchema.parse(req.body);
    const tokens = await authService.refresh(refreshToken);
    res.json({ success: true, data: tokens });
  } catch (err) { next(err); }
}

export async function logout(req: Request, res: Response, next: NextFunction) {
  try {
    const { refreshToken } = req.body;
    if (refreshToken) await authService.logout(refreshToken);
    res.json({ success: true, data: { message: 'Logged out' } });
  } catch (err) { next(err); }
}

export async function getMe(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const user = await authService.getMe(req.user!.sub);
    res.json({ success: true, data: user });
  } catch (err) { next(err); }
}

export async function changePassword(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const body = changePasswordSchema.parse(req.body);
    await authService.changePassword(req.user!.sub, body.oldPassword, body.newPassword);
    res.json({ success: true, data: { message: 'Password changed successfully' } });
  } catch (err) { next(err); }
}
