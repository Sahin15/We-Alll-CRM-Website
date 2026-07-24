/**
 * Shared Authorization V2 access checks for sidebar and routes.
 */

import { isAuthzV2AnyModuleEnabled } from './authzFlags.js';

/**
 * Whether the user is a department head (HoD role or flagged head of department).
 *
 * @param {object|null|undefined} user
 * @returns {boolean}
 */
export function isDepartmentHead(user) {
  if (!user) return false;
  if (user.role === 'hod') return true;
  return Boolean(user.isHeadOfDepartment && user.headOfDepartment);
}

/**
 * @param {object} params
 * @param {object|null} params.user
 * @param {(permission: string) => boolean} params.canPermission
 * @param {(roles: string[]) => boolean} params.checkPermission
 * @param {object|null} params.authzEffective
 * @param {boolean} params.authzLoading
 * @param {string} params.permission
 * @param {string[]} [params.alternatePermissions]
 * @param {string[]} [params.fallbackRoles]
 * @param {boolean} [params.requiresDepartmentHead]
 * @returns {boolean}
 */
export function hasPermissionAccess({
  user,
  canPermission,
  checkPermission,
  authzEffective,
  authzLoading,
  permission,
  alternatePermissions = [],
  fallbackRoles = [],
  requiresDepartmentHead = false,
}) {
  if (!user || !permission) return false;

  if (requiresDepartmentHead && !isDepartmentHead(user)) {
    const permissionKeys = [permission, ...alternatePermissions].filter(Boolean);
    const hasDirectGrant =
      authzEffective?.permissions &&
      permissionKeys.some((key) => canPermission(key));
    if (!hasDirectGrant) return false;
  }

  const permissionKeys = [permission, ...alternatePermissions].filter(Boolean);

  if (authzEffective?.permissions) {
    if (permissionKeys.some((key) => canPermission(key))) return true;
    if (fallbackRoles.length && checkPermission(fallbackRoles)) return true;
    return false;
  }

  if (authzLoading) {
    return fallbackRoles.length > 0 && checkPermission(fallbackRoles);
  }

  // V2 flags off: legacy passthrough for authenticated users (pre-wave behavior)
  if (!isAuthzV2AnyModuleEnabled()) {
    if (fallbackRoles.length) return checkPermission(fallbackRoles);
    return true;
  }

  if (fallbackRoles.length && checkPermission(fallbackRoles)) return true;
  return false;
}

/**
 * Whether effective permissions include an explicit grant for a menu permission key.
 *
 * @param {object} params
 * @param {(permission: string) => boolean} params.canPermission
 * @param {string} [params.permission]
 * @param {string[]} [params.alternatePermissions]
 * @returns {boolean}
 */
export function hasExplicitPermissionGrant({
  canPermission,
  permission,
  alternatePermissions = [],
}) {
  if (!permission) return false;
  const permissionKeys = [permission, ...alternatePermissions].filter(Boolean);
  return permissionKeys.some((key) => canPermission(key));
}

/**
 * Legacy sidebar role gate — skipped when Auth V2 already granted the menu permission.
 *
 * @param {object} params
 * @param {object|null|undefined} params.user
 * @param {object} params.menuItem
 * @param {(permission: string) => boolean} params.canPermission
 * @returns {boolean}
 */
export function passesLegacyRoleMenuGate({ user, menuItem, canPermission }) {
  if (!menuItem.onlyForRoles?.length) return true;

  if (
    hasExplicitPermissionGrant({
      canPermission,
      permission: menuItem.permission,
      alternatePermissions: menuItem.alternatePermissions,
    })
  ) {
    return true;
  }

  if (menuItem.onlyForRoles.includes(user?.role)) {
    return true;
  }

  if (
    user?.role === 'hod' &&
    menuItem.hodDepartments?.length > 0 &&
    menuItem.hodDepartments.some(
      (dept) => dept.toLowerCase() === user?.department?.name?.toLowerCase()
    )
  ) {
    return true;
  }

  return false;
}
