import { Request, Response, NextFunction } from 'express';
import prisma from '../../config/database';

export interface PortalRequest extends Request {
  team?: any;
}

export const requirePortalToken = async (req: PortalRequest, res: Response, next: NextFunction) => {
  const token = req.headers['x-dev-token'] as string;
  if (!token) return res.status(401).json({ success: false, error: 'Missing token' });

  const team = await prisma.devTeam.findUnique({ where: { publicToken: token } });
  if (!team || !team.active) {
    return res.status(401).json({ success: false, error: 'Invalid or inactive token' });
  }

  req.team = team;
  next();
};
