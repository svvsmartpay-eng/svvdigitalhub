import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth.middleware';
import { createAuditLog } from '../lib/auditLog';

export function auditMiddleware(action: string, resource: string) {
  return (req: AuthRequest, _res: Response, next: NextFunction): void => {
    req.on('end', () => {
      if (req.user) {
        createAuditLog({
          organizationId: req.user.orgId,
          userId: req.user.sub,
          userEmail: req.user.email,
          userRole: req.user.primaryRole,
          action,
          resource,
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
        }).catch(console.error);
      }
    });
    next();
  };
}
