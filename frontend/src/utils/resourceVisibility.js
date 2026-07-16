/**
 * Frontend visibility helpers aligned with backend resourceVisibilityService.
 *
 * Client visibility: any project assignment for that client (or account manager).
 * Project visibility: only projects where the user is on the team.
 * Company-wide: admin, superadmin, hr, manager — or explicit COMPANY/PLATFORM grant.
 */

export const COMPANY_VIEWER_ROLES = ['admin', 'superadmin', 'hr', 'manager'];
const COMPANY_WIDE_SCOPES = new Set(['COMPANY', 'PLATFORM']);

function isPermissionDenied(authzEffective, permission) {
  if (!authzEffective?.directDenials) return false;
  return authzEffective.directDenials.includes(permission);
}

/**
 * @param {object|null|undefined} authzEffective
 * @param {string} permission
 * @returns {string|undefined}
 */
function getPermissionScope(authzEffective, permission) {
  return authzEffective?.scopes?.[permission];
}

/**
 * @param {object} params
 * @param {object|null|undefined} params.user
 * @param {object|null|undefined} params.authzEffective
 * @param {(permission: string) => boolean} [params.canPermission]
 * @param {string} permission
 * @returns {boolean}
 */
function hasCompanyWidePermission({ user, authzEffective, canPermission }, permission) {
  if (!user) return false;
  if (isPermissionDenied(authzEffective, permission)) return false;

  const scope = getPermissionScope(authzEffective, permission);
  if (scope && COMPANY_WIDE_SCOPES.has(scope) && canPermission?.(permission)) {
    return true;
  }

  return false;
}

/**
 * @param {object} params
 * @param {object|null|undefined} params.user
 * @param {object|null|undefined} params.authzEffective
 * @param {(permission: string) => boolean} [params.canPermission]
 * @returns {boolean}
 */
export function canViewAllCompanyClients({ user, authzEffective, canPermission }) {
  if (!user) return false;
  if (isPermissionDenied(authzEffective, 'crm.client.view')) return false;

  if (hasCompanyWidePermission({ user, authzEffective, canPermission }, 'crm.client.view')) {
    return true;
  }

  return COMPANY_VIEWER_ROLES.includes(user.role);
}

/**
 * @param {object} params
 * @param {object|null|undefined} params.user
 * @param {object|null|undefined} params.authzEffective
 * @param {(permission: string) => boolean} [params.canPermission]
 * @returns {boolean}
 */
export function canViewAllCompanyProjects({ user, authzEffective, canPermission }) {
  if (!user) return false;
  if (isPermissionDenied(authzEffective, 'projects.project.view')) return false;

  if (hasCompanyWidePermission({ user, authzEffective, canPermission }, 'projects.project.view')) {
    return true;
  }

  return COMPANY_VIEWER_ROLES.includes(user.role);
}

/**
 * Prefer assigned-client API when the user does not have company-wide client access.
 *
 * @param {object} params
 * @returns {boolean}
 */
export function shouldUseAssignedClientsList(params) {
  return !canViewAllCompanyClients(params);
}

/**
 * Prefer assigned-project API when the user does not have company-wide project access.
 *
 * @param {object} params
 * @returns {boolean}
 */
export function shouldUseAssignedProjectsList(params) {
  return !canViewAllCompanyProjects(params);
}
