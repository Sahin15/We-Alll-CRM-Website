/**
 * Authorization V2 — Legacy adapter.
 * Derives effective grants from User.role until DB-backed assignments exist.
 */

import { PERMISSION_CATALOG, VALID_PERMISSION_KEYS } from './permissionCatalog.js';
import { LEGACY_ROLE_TO_ACCESS_ROLES } from './legacyRoleMapping.js';
import { SCOPES } from './scopes.js';
import { mergeDirectGrants } from './grantMerge.js';

/**
 * Resolve access role definitions for a user (legacy path).
 *
 * @param {object} user
 * @returns {import('./legacyRoleMapping.js').AccessRoleDefinition[]}
 */
export function getAccessRolesForUser(user) {
  if (!user?.role) return [];

  const roleKey = user.role;
  const definitions = LEGACY_ROLE_TO_ACCESS_ROLES[roleKey];

  if (!definitions) {
    return LEGACY_ROLE_TO_ACCESS_ROLES.employee || [];
  }

  if (roleKey === 'hod' || (user.isHeadOfDepartment && roleKey === 'employee')) {
    return [
      ...(LEGACY_ROLE_TO_ACCESS_ROLES.employee || []),
      ...(LEGACY_ROLE_TO_ACCESS_ROLES.hod || []).filter((d) => d.accessRole === 'department_head'),
    ];
  }

  return definitions;
}

/**
 * Role-based grants only (excludes direct user assignments).
 *
 * @param {object} user
 * @returns {import('./scopes.js').PermissionGrant[]}
 */
export function getLegacyRoleGrants(user) {
  const accessRoles = getAccessRolesForUser(user);
  const grantMap = new Map();

  for (const roleDef of accessRoles) {
    for (const grant of roleDef.grants) {
      if (!VALID_PERMISSION_KEYS.has(grant.permission) && grant.permission !== 'platform.admin') {
        continue;
      }
      const existing = grantMap.get(grant.permission);
      if (!existing || scopeBreadth(grant.scope) > scopeBreadth(existing.scope)) {
        grantMap.set(grant.permission, { ...grant });
      }
    }
  }

  if (user?.role === 'superadmin') {
    for (const perm of PERMISSION_CATALOG) {
      grantMap.set(perm.key, { permission: perm.key, scope: SCOPES.PLATFORM });
    }
  }

  return Array.from(grantMap.values());
}

/**
 * Union grants from all access roles; merges direct user assignments when present.
 *
 * @param {object} user
 * @returns {import('./scopes.js').PermissionGrant[]}
 */
export function getEffectiveGrants(user) {
  const legacyGrants = getLegacyRoleGrants(user);
  const directGrants = user?.directPermissionGrants || [];

  if (!directGrants.length) {
    return legacyGrants;
  }

  return mergeDirectGrants(legacyGrants, directGrants);
}

/**
 * @param {string} scope
 * @returns {number}
 */
function scopeBreadth(scope) {
  const order = {
    [SCOPES.SELF]: 1,
    [SCOPES.TEAM]: 2,
    [SCOPES.PROJECT]: 3,
    [SCOPES.CLIENT_PORTFOLIO]: 3,
    [SCOPES.ASSIGNED_DEPARTMENTS]: 4,
    [SCOPES.OWN_DEPARTMENT]: 5,
    [SCOPES.BRANCH]: 6,
    [SCOPES.COMPANY]: 7,
    [SCOPES.PLATFORM]: 8,
  };
  return order[scope] || 0;
}

/**
 * Build effective permissions payload for API response.
 *
 * @param {object} user
 * @returns {{
 *   legacyRole: string,
 *   accessRoles: string[],
 *   permissions: string[],
 *   scopes: Record<string, string>,
 *   grants: import('./scopes.js').PermissionGrant[],
 *   source: 'legacy_adapter'
 * }}
 */
export function buildEffectivePermissions(user) {
  const accessRoleDefs = getAccessRolesForUser(user);
  const grants = getEffectiveGrants(user);
  const permissions = grants.map((g) => g.permission);
  const scopes = grants.reduce((acc, g) => {
    acc[g.permission] = g.scope;
    return acc;
  }, {});

  return {
    legacyRole: user.role,
    accessRoles: accessRoleDefs.map((d) => d.accessRole),
    permissions,
    scopes,
    grants,
    directAssignments: user?.directPermissionGrants?.filter((g) => g.effect !== 'deny') || [],
    directDenials:
      user?.directPermissionGrants
        ?.filter((g) => g.effect === 'deny')
        .map((g) => g.permission) || [],
    source: user?.directPermissionGrants?.length ? 'legacy_adapter+direct' : 'legacy_adapter',
  };
}

/**
 * Legacy role allowlist check (mirrors authorizeRoles).
 *
 * @param {object} user
 * @param {string[]} allowedRoles
 * @returns {boolean}
 */
export function legacyRoleAllows(user, allowedRoles) {
  if (!user?.role) return false;
  return allowedRoles.includes(user.role);
}

/**
 * Legacy department allowlist check (mirrors authorizeDepartments / authorizeRolesOrDepartments).
 *
 * @param {string|null|undefined} departmentName - lower-case department name on req.user
 * @param {string[]} allowedDepartments
 * @returns {boolean}
 */
export function legacyDepartmentAllows(departmentName, allowedDepartments = []) {
  if (!departmentName || !allowedDepartments.length) return false;
  const normalized = departmentName.toLowerCase();
  return allowedDepartments.some((dept) => dept.toLowerCase() === normalized);
}

/**
 * Combined legacy role or department gate (mirrors authorizeRolesOrDepartments).
 *
 * @param {object} user
 * @param {string[]} [allowedRoles]
 * @param {string|null|undefined} departmentName
 * @param {string[]} [allowedDepartments]
 * @returns {boolean}
 */
export function legacyRolesOrDepartmentsAllows(
  user,
  allowedRoles = [],
  departmentName,
  allowedDepartments = []
) {
  if (allowedRoles.length && legacyRoleAllows(user, allowedRoles)) {
    return true;
  }
  return legacyDepartmentAllows(departmentName, allowedDepartments);
}
