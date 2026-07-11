/**
 * Authorization V2 — Shadow mode logger.
 * Logs when V2 policy decision differs from legacy role check.
 * Enable with AUTHZ_SHADOW_MODE=true
 */

import { can } from './policyEngine.js';
import { legacyRoleAllows } from './legacyAdapter.js';

/**
 * @param {object} params
 * @param {object} params.user
 * @param {string} [params.permission]
 * @param {string[]} [params.legacyRoles]
 * @param {string} [params.route]
 * @param {string} [params.method]
 */
export function logAuthzShadowComparison({
  user,
  permission,
  legacyRoles,
  route,
  method,
}) {
  if (process.env.AUTHZ_SHADOW_MODE !== 'true') {
    return;
  }

  const legacyAllowed = legacyRoles?.length
    ? legacyRoleAllows(user, legacyRoles)
    : null;

  const v2Decision = permission ? can(user, permission) : null;
  const v2Allowed = v2Decision?.allowed ?? null;

  if (legacyAllowed === null || v2Allowed === null) {
    return;
  }

  if (legacyAllowed !== v2Allowed) {
    console.warn('[AUTHZ_SHADOW] Decision mismatch', {
      userId: user._id?.toString() || user.id,
      legacyRole: user.role,
      permission,
      legacyRoles,
      legacyAllowed,
      v2Allowed,
      v2Scope: v2Decision?.scope,
      route,
      method,
      timestamp: new Date().toISOString(),
    });
  }
}

/**
 * Express middleware factory — shadow only, never blocks.
 * Attach alongside legacy authorizeRoles during migration.
 *
 * @param {string} permission
 * @returns {import('express').RequestHandler}
 */
export function shadowPermissionCheck(permission) {
  return (req, res, next) => {
    if (req.user && permission) {
      const v2 = can(req.user, permission);
      logAuthzShadowComparison({
        user: req.user,
        permission,
        legacyAllowed: null,
        route: req.originalUrl,
        method: req.method,
      });
      req.authzShadow = v2;
    }
    next();
  };
}

/**
 * Wrap legacy authorizeRoles to emit shadow logs when permission mapping exists.
 *
 * @param {string} permission
 * @param {string[]} legacyRoles
 * @param {boolean} legacyAllowed
 * @param {import('express').Request} req
 */
export function shadowLegacyRouteCheck(permission, legacyRoles, legacyAllowed, req) {
  logAuthzShadowComparison({
    user: req.user,
    permission,
    legacyRoles,
    route: req.originalUrl,
    method: req.method,
  });

  if (process.env.AUTHZ_SHADOW_MODE === 'true' && permission) {
    const v2 = can(req.user, permission);
    if (v2.allowed !== legacyAllowed) {
      console.warn('[AUTHZ_SHADOW] Route guard mismatch', {
        route: req.originalUrl,
        permission,
        legacyRoles,
        legacyAllowed,
        v2Allowed: v2.allowed,
      });
    }
  }
}
