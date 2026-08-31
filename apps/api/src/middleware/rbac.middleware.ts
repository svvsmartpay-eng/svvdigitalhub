import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth.middleware';
import { AppError } from './error.middleware';
import { RoleType } from '@prisma/client';

// Role hierarchy: higher index = more access
const ROLE_HIERARCHY: RoleType[] = [
  'AUDITOR',
  'VENDOR_USER',
  'TECHNICIAN',
  'STAFF',
  'BRANCH_MANAGER',
  'ADMIN',
  'SUPER_ADMIN',
];

export function requireRole(...allowedRoles: RoleType[]) {
  return (req: AuthRequest, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new AppError(401, 'Authentication required'));
    }
    const userRoles = req.user.roles as RoleType[];
    const hasRole = allowedRoles.some(role => userRoles.includes(role));
    if (!hasRole) {
      return next(new AppError(403, 'Insufficient permissions'));
    }
    next();
  };
}

export function requireMinRole(minRole: RoleType) {
  return (req: AuthRequest, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new AppError(401, 'Authentication required'));
    }
    const userRoles = req.user.roles as RoleType[];
    const minIndex = ROLE_HIERARCHY.indexOf(minRole);
    const hasAccess = userRoles.some(role => {
      const idx = ROLE_HIERARCHY.indexOf(role);
      return idx >= minIndex;
    });
    if (!hasAccess) {
      return next(new AppError(403, 'Insufficient permissions'));
    }
    next();
  };
}

// Branch access check — users can only access their assigned branches
export function requireBranchAccess(getBranchId: (req: AuthRequest) => string | undefined) {
  return (req: AuthRequest, _res: Response, next: NextFunction): void => {
    if (!req.user) return next(new AppError(401, 'Authentication required'));

    // Super admin and admin can access all branches
    const adminRoles: RoleType[] = ['SUPER_ADMIN', 'ADMIN'];
    if (req.user.roles.some(r => adminRoles.includes(r as RoleType))) {
      return next();
    }

    const branchId = getBranchId(req);
    if (!branchId) return next();

    if (!req.user.branches.includes(branchId)) {
      return next(new AppError(403, 'No access to this branch'));
    }
    next();
  };
}
