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
 * @param {object|null|undefined} authzEffective
 * @param {string} permission
 * @returns {boolean}
 */
export function isCompanyWidePermissionScope(authzEffective, permission) {
  const scope = authzEffective?.scopes?.[permission];
  if (!scope) return false;
  return scope === 'COMPANY' || scope === 'PLATFORM';
}

/**
 * @param {object} params
 * @param {(permission: string) => boolean} params.canPermission
 * @param {object|null|undefined} params.authzEffective
 * @param {string} params.permission
 * @returns {boolean}
 */
export function hasCompanyWidePermissionGrant({ canPermission, authzEffective, permission }) {
  if (!permission || !canPermission(permission)) return false;
  if (authzEffective?.permissions?.includes('platform.admin')) return true;
  if (!authzEffective?.scopes) return false;
  return isCompanyWidePermissionScope(authzEffective, permission);
}

/**
 * @param {object} params
 * @param {string} params.permission
 * @param {string[]} params.alternatePermissions
 * @param {string[]} [params.companyWideAlternates]
 * @param {(permission: string) => boolean} params.canPermission
 * @param {object|null|undefined} params.authzEffective
 * @returns {boolean}
 */
function permissionKeysAllowed({
  permission,
  alternatePermissions,
  companyWideAlternates = [],
  canPermission,
  authzEffective,
}) {
  if (permission && canPermission(permission)) return true;

  const companyWideSet = new Set(companyWideAlternates);
  for (const key of alternatePermissions) {
    if (!key || !canPermission(key)) continue;
    if (companyWideSet.has(key)) {
      if (hasCompanyWidePermissionGrant({ canPermission, authzEffective, permission: key })) {
        return true;
      }
      continue;
    }
    return true;
  }

  return false;
}

/**
 * Whether a permission comes from Permission Assignment (direct override), not role inheritance.
 *
 * @param {object} params
 * @param {object|null|undefined} params.authzEffective
 * @param {string} [params.permission]
 * @param {string[]} [params.alternatePermissions]
 * @returns {boolean}
 */
export function hasDirectPermissionAssignment({
  authzEffective,
  permission,
  alternatePermissions = [],
}) {
  const permissionKeys = [permission, ...alternatePermissions].filter(Boolean);
  if (!permissionKeys.length) return false;

  const direct = authzEffective?.directAssignments || [];
  return direct.some(
    (grant) => grant?.effect !== 'deny' && permissionKeys.includes(grant.permission)
  );
}

/**
 * Restricts admin-only menus to specific roles unless superadmin assigned a direct grant.
 *
 * @param {object} params
 * @param {object|null|undefined} params.user
 * @param {string[]} [params.menuAllowedRoles]
 * @param {object|null|undefined} params.authzEffective
 * @param {string} params.permission
 * @param {string[]} [params.alternatePermissions]
 * @returns {boolean}
 */
export function passesMenuAllowedRoles({
  user,
  menuAllowedRoles = [],
  authzEffective,
  permission,
  alternatePermissions = [],
}) {
  if (!menuAllowedRoles.length) return true;
  if (menuAllowedRoles.includes(user?.role)) return true;

  return hasDirectPermissionAssignment({
    authzEffective,
    permission,
    alternatePermissions,
  });
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
 * @param {string[]} [params.companyWideAlternates]
 * @param {string[]} [params.fallbackRoles]
 * @param {string[]} [params.menuAllowedRoles]
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
  companyWideAlternates = [],
  fallbackRoles = [],
  menuAllowedRoles = [],
  requiresDepartmentHead = false,
}) {
  if (!user || !permission) return false;

  if (requiresDepartmentHead && !isDepartmentHead(user)) {
    // Strict: company-wide review permission must not open HoD-only pages
    return false;
  }

  const finish = (permitted) => {
    if (!permitted) return false;
    return passesMenuAllowedRoles({
      user,
      menuAllowedRoles,
      authzEffective,
      permission,
      alternatePermissions,
    });
  };

  if (authzEffective?.permissions) {
    if (
      permissionKeysAllowed({
        permission,
        alternatePermissions,
        companyWideAlternates,
        canPermission,
        authzEffective,
      })
    ) {
      return finish(true);
    }
    if (fallbackRoles.length && checkPermission(fallbackRoles)) {
      return finish(true);
    }
    return false;
  }

  if (authzLoading) {
    return finish(fallbackRoles.length > 0 && checkPermission(fallbackRoles));
  }

  // V2 flags off: legacy passthrough for authenticated users (pre-wave behavior)
  if (!isAuthzV2AnyModuleEnabled()) {
    if (fallbackRoles.length) return finish(checkPermission(fallbackRoles));
    return finish(true);
  }

  if (fallbackRoles.length && checkPermission(fallbackRoles)) {
    return finish(true);
  }
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
export function passesLegacyRoleMenuGate({ user, menuItem, authzEffective }) {
  if (!menuItem.onlyForRoles?.length) return true;

  if (
    hasDirectPermissionAssignment({
      authzEffective,
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
