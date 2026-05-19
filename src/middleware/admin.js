const authMiddleware = require('./auth');
const { getAdminPermissions, hasAdminPermission, isAdminAccount, isSuperAdmin } = require('../utils/adminPermissions');

function requireAdmin(req, res, next) {
  if (!req.user || !isAdminAccount(req.user)) {
    return res.status(403).json({ error: 'Admin access required.' });
  }
  req.adminPermissions = getAdminPermissions(req.user);
  next();
}

function requirePermission(permission) {
  return (req, res, next) => {
    if (!hasAdminPermission(req.user, permission)) {
      return res.status(403).json({ error: 'You do not have permission to use this admin function.' });
    }
    next();
  };
}

function requireSuperAdmin(req, res, next) {
  if (!isSuperAdmin(req.user)) {
    return res.status(403).json({ error: 'Super admin access required.' });
  }
  next();
}

const adminMiddleware = [authMiddleware, requireAdmin];
adminMiddleware.requirePermission = requirePermission;
adminMiddleware.requireSuperAdmin = requireSuperAdmin;

module.exports = adminMiddleware;
