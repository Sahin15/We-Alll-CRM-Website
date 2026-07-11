/**
 * Authorization V2 — Policy engine.
 * Central decision point: can(user, permission, resource?)
 */

import { isValidPermissionKey } from './permissionCatalog.js';
import { getEffectiveGrants } from './legacyAdapter.js';
import { resourceMatchesScope, resolveScopeFilter } from './scopeResolver.js';

/**
 * @typedef {object} AuthzDecision
 * @property {boolean} allowed
 * @property {string} [permission]
 * @property {string} [scope]
 * @property {object} [scopeFilter]
 * @property {string} [reason]
 */

/**
 * @param {object} user
 * @param {string} permission
 * @param {object} [resource]
 * @returns {AuthzDecision}
 */
export function can(user, permission, resource = null) {
  if (!user) {
    return { allowed: false, permission, reason: 'not_authenticated' };
  }

  if (!isValidPermissionKey(permission) && permission !== 'platform.admin') {
    return { allowed: false, permission, reason: 'unknown_permission' };
  }

  const grants = getEffectiveGrants(user);
  const grant = grants.find((g) => g.permission === permission);

  if (!grant) {
    if (user.role === 'superadmin') {
      return {
        allowed: true,
        permission,
        scope: 'PLATFORM',
        scopeFilter: resolveScopeFilter(user, 'PLATFORM'),
      };
    }
    return { allowed: false, permission, reason: 'no_grant' };
  }

  if (resource && !resourceMatchesScope(user, grant.scope, resource)) {
    return { allowed: false, permission, scope: grant.scope, reason: 'scope_mismatch' };
  }

  return {
    allowed: true,
    permission,
    scope: grant.scope,
    scopeFilter: resolveScopeFilter(user, grant.scope),
  };
}

/**
 * @param {object} user
 * @param {string} permission
 * @returns {boolean}
 */
export function hasPermission(user, permission) {
  return can(user, permission).allowed;
}

/**
 * Map legacy route role arrays to a representative permission for shadow comparisons.
 * Used during migration when routes still use authorizeRoles.
 *
 * @param {string[]} allowedRoles
 * @returns {string | null}
 */
export function permissionForLegacyRoles(allowedRoles) {
  if (!allowedRoles?.length) return null;
  const key = [...allowedRoles].sort().join(',');
  const map = {
    'admin': 'team.user.view',
    'admin,hr': 'team.user.view',
    'admin,hr,manager': 'team.user.view',
    'admin,superadmin': 'auth.role.manage',
    'admin,superadmin,accounts': 'billing.invoice.manage',
    'admin,superadmin,hr': 'team.user.view',
    'admin,superadmin,hr,manager': 'team.user.view',
    'client': 'billing.invoice.view',
    'employee,hod,hr': 'attendance.clock',
    'hod': 'procurement.pr.approve_hod',
  };
  return map[key] || null;
}
