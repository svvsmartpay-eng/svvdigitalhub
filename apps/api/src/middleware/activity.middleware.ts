import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { logger } from '../config/logger';

export const trackActivity = async (req: Request, res: Response, next: NextFunction) => {
  if ((req as any).user?.sub) {
    prisma.user.update({
      where: { id: (req as any).user.sub },
      data: { lastActiveAt: new Date() }
    }).catch((err: unknown) => {
      logger.error('Failed to update user lastActiveAt', err);
    });
  }
  next();
};
