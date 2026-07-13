/**
 * Shared Authorization V2 access checks for sidebar and routes.
 *
 * @param {object} params
 * @param {object|null} params.user
 * @param {(permission: string) => boolean} params.canPermission
 * @param {(roles: string[]) => boolean} params.checkPermission
 * @param {object|null} params.authzEffective
 * @param {boolean} params.authzLoading
 * @param {string} params.permission
 * @param {string[]} [params.fallbackRoles]
 * @returns {boolean}
 */
export function hasPermissionAccess({
  user,
  canPermission,
  checkPermission,
  authzEffective,
  authzLoading,
  permission,
  fallbackRoles = [],
}) {
  if (!user || !permission) return false;

  if (authzEffective?.permissions) {
    if (canPermission(permission)) return true;
    if (fallbackRoles.length && checkPermission(fallbackRoles)) return true;
    return false;
  }

  if (authzLoading) {
    return fallbackRoles.length > 0 && checkPermission(fallbackRoles);
  }

  if (fallbackRoles.length && checkPermission(fallbackRoles)) return true;
  return false;
}
