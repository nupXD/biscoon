import type { SanitizedUser } from '../types';

const ASSIGNABLE_ADMIN_PERMISSIONS = Object.freeze([
  {
    key: 'users',
    label: 'Regular Users',
    description: 'View regular accounts, inspect their content, and remove regular users.',
  },
  {
    key: 'listings',
    label: 'Listings',
    description: 'View, edit, and delete marketplace listings.',
  },
  {
    key: 'news',
    label: 'News',
    description: 'Create, edit, publish, feature, and delete newsroom stories.',
  },
  {
    key: 'discussions',
    label: 'Discussions',
    description: 'Create, view, edit, and delete community discussions.',
  },
  {
    key: 'comments',
    label: 'Comments',
    description: 'Review and remove listing or discussion comments.',
  },
  {
    key: 'reports',
    label: 'Reports',
    description: 'Review reports and update moderation status.',
  },
  {
    key: 'announcements',
    label: 'Announcements',
    description: 'Create, pause, activate, and delete site announcements.',
  },
]);

const SUPER_ADMIN_PERMISSION = Object.freeze({
  key: 'staff',
  label: 'Admin Users',
  description: 'Create admin users and assign privileges.',
});

const ALL_ADMIN_PERMISSIONS = Object.freeze([
  ...ASSIGNABLE_ADMIN_PERMISSIONS.map(permission => permission.key),
  SUPER_ADMIN_PERMISSION.key,
]);

const ADMIN_ACCOUNT_ROLES = Object.freeze(['super-admin', 'admin', 'staff', 'sub-admin']);

function normalizePermissions(permissions: string[] = []): string[] {
  const allowed = new Set(ASSIGNABLE_ADMIN_PERMISSIONS.map(permission => permission.key));
  return [...new Set((Array.isArray(permissions) ? permissions : [])
    .map(permission => String(permission || '').trim())
    .filter(permission => allowed.has(permission)))];
}

function isSuperAdmin(user: Partial<SanitizedUser> | null | undefined): boolean {
  return user?.role === 'super-admin' || user?.role === 'admin';
}

function isAdminAccount(user: Partial<SanitizedUser> | null | undefined): boolean {
  return ADMIN_ACCOUNT_ROLES.includes(user?.role as string);
}

function getAdminPermissions(user: Partial<SanitizedUser> | null | undefined): readonly string[] {
  if (isSuperAdmin(user)) return ALL_ADMIN_PERMISSIONS;
  return normalizePermissions(user?.permissions || []);
}

function hasAdminPermission(user: Partial<SanitizedUser> | null | undefined, permission: string): boolean {
  return getAdminPermissions(user).includes(permission);
}

function adminRoleLabel(role: string): string {
  if (role === 'super-admin' || role === 'admin') return 'Super Admin';
  if (role === 'staff') return 'Admin User';
  if (role === 'sub-admin') return 'Admin User';
  return 'Regular User';
}

export {
  ADMIN_ACCOUNT_ROLES,
  ALL_ADMIN_PERMISSIONS,
  ASSIGNABLE_ADMIN_PERMISSIONS,
  SUPER_ADMIN_PERMISSION,
  adminRoleLabel,
  getAdminPermissions,
  hasAdminPermission,
  isAdminAccount,
  isSuperAdmin,
  normalizePermissions,
};
