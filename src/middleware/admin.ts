import { Response, NextFunction, RequestHandler } from 'express';
import authMiddleware from './auth';
import { getAdminPermissions, hasAdminPermission, isAdminAccount, isSuperAdmin } from '../utils/adminPermissions';
import type { AuthRequest } from '../types';

function requireAdmin(req: AuthRequest, res: Response, next: NextFunction): void {
  if (!req.user || !isAdminAccount(req.user)) {
    res.status(403).json({ error: 'Admin access required.' });
    return;
  }
  (req as AuthRequest & { adminPermissions: readonly string[] }).adminPermissions = getAdminPermissions(req.user);
  next();
}

function requirePermission(permission: string): RequestHandler {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!hasAdminPermission(req.user, permission)) {
      res.status(403).json({ error: 'You do not have permission to use this admin function.' });
      return;
    }
    next();
  };
}

function requireSuperAdmin(req: AuthRequest, res: Response, next: NextFunction): void {
  if (!isSuperAdmin(req.user)) {
    res.status(403).json({ error: 'Super admin access required.' });
    return;
  }
  next();
}

const adminMiddleware = [authMiddleware, requireAdmin as RequestHandler] as RequestHandler[] & {
  requirePermission: typeof requirePermission;
  requireSuperAdmin: typeof requireSuperAdmin;
};
adminMiddleware.requirePermission = requirePermission;
adminMiddleware.requireSuperAdmin = requireSuperAdmin;

export default adminMiddleware;
