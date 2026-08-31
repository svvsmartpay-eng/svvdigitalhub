import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, AccessTokenPayload } from '../lib/jwt';
import { AppError } from './error.middleware';
import prisma from '../config/database';

export interface AuthRequest extends Request {
  user?: AccessTokenPayload;
}

export function authenticate(req: AuthRequest, _res: Response, next: NextFunction): void {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      throw new AppError(401, 'Authentication required');
    }
    const token = authHeader.slice(7);
    const payload = verifyAccessToken(token);
    req.user = payload;

    // Fire and forget activity update
    prisma.user.update({
      where: { id: payload.sub },
      data: { lastActiveAt: new Date() }
    }).catch(err => {
      console.error('Failed to update user lastActiveAt', err);
    });

    next();
  } catch (err: any) {
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      next(new AppError(401, 'Invalid or expired token'));
    } else {
      next(err);
    }
  }
}

export function optionalAuth(req: AuthRequest, _res: Response, next: NextFunction): void {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.slice(7);
      req.user = verifyAccessToken(token);
    }
  } catch {
    // ignore — optional auth
  }
  next();
}
