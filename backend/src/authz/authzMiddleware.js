/**
 * Authorization V2 — Route middleware (opt-in during migration).
 * Does NOT replace authorizeRoles until module flag is enabled.
 */

import { can } from './policyEngine.js';
import { legacyRoleAllows, legacyRolesOrDepartmentsAllows } from './legacyAdapter.js';
import { logAuthzShadowComparison } from './shadowLogger.js';
import {
  isAuthzModuleEnabled,
  isAuthzEnforceEnabled,
  isAuthzShadowEnabled,
} from './moduleFlags.js';

/**
 * @param {object} user
 * @param {string} permission
 * @returns {boolean}
 */
function hasExplicitDeny(user, permission) {
  return Boolean(
    user?.directPermissionGrants?.some(
      (grant) => grant.permission === permission && grant.effect === 'deny'
    )
  );
}

/**
 * Resolve route access during V2 enforce + optional legacy role gate.
 *
 * @param {object} params
 * @param {object} params.user
 * @param {{ allowed: boolean, permission?: string }} params.decision
 * @param {boolean} params.shouldEnforce
 * @param {boolean} params.resolvedLegacyAllowed
 * @param {string[]} [params.legacyRoles]
 * @param {string[]} [params.legacyDepartments]
 * @returns {{ allowed: boolean, status?: number, error?: string }}
 */
function resolveModuleRouteAccess({
  user,
  decision,
  shouldEnforce,
  resolvedLegacyAllowed,
  legacyRoles = [],
  legacyDepartments = [],
}) {
  const permission = decision.permission || '';
  const hasLegacyGate = Boolean(legacyRoles.length || legacyDepartments.length);

  if (shouldEnforce && permission && hasExplicitDeny(user, permission)) {
    return {
      allowed: false,
      status: 403,
      error: `Permission denied: ${permission}`,
    };
  }

  if (decision.allowed) {
    return { allowed: true };
  }

  if (shouldEnforce) {
    if (hasLegacyGate && resolvedLegacyAllowed) {
      return { allowed: true };
    }
    return {
      allowed: false,
      status: 403,
      error: `Permission denied: ${permission}`,
    };
  }

  if (hasLegacyGate && !resolvedLegacyAllowed) {
    return {
      allowed: false,
      status: 403,
      error: `Permission denied: ${permission}`,
    };
  }

  return { allowed: true };
}

/**
 * Require a permission key via policy engine.
 * Set AUTHZ_V2_ENFORCE=true to block; otherwise shadow-only when AUTHZ_SHADOW_MODE=true.
 *
 * @param {string} permission
 * @returns {import('express').RequestHandler}
 */
export const requirePermissionKey = (permission) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Not authenticated',
      });
    }

    const decision = can(req.user, permission, req.authzResource || null);

    req.authz = decision;

    const enforce = process.env.AUTHZ_V2_ENFORCE === 'true';

    if (!decision.allowed) {
      if (enforce) {
        return res.status(403).json({
          success: false,
          error: `Permission denied: ${permission}`,
        });
      }
    }

    next();
  };
};

/**
 * Enhance legacy authorizeRoles wrapper with shadow logging.
 *
 * @param {string} permission - V2 permission to compare
 * @param {import('express').RequestHandler} legacyMiddleware
 * @returns {import('express').RequestHandler}
 */
export const withAuthzShadow = (permission, legacyMiddleware) => {
  return (req, res, next) => {
    legacyMiddleware(req, res, (err) => {
      if (err) return next(err);
      if (req.user && permission) {
        const legacyAllowed = res.statusCode < 400;
        logAuthzShadowComparison({
          user: req.user,
          permission,
          legacyRoles: [],
          route: req.originalUrl,
          method: req.method,
        });
      }
      next();
    });
  };
};

/**
 * Module-scoped permission check for incremental migration.
 * Legacy allow: any authenticated user (protect only).
 *
 * @param {string} moduleName - e.g. 'profile'
 * @param {string} permission
 * @param {{ legacyAllowed?: boolean, legacyRoles?: string[], legacyDepartments?: string[] }} [options]
 * @returns {import('express').RequestHandler}
 */
export const requireModulePermission = (moduleName, permission, options = {}) => {
  const { legacyAllowed, legacyRoles, legacyDepartments } = options;

  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Not authenticated',
      });
    }

    const decision = can(req.user, permission, req.authzResource || null);
    req.authz = decision;

    const resolvedLegacyAllowed =
      typeof legacyAllowed === 'boolean'
        ? legacyAllowed
        : legacyRoles?.length || legacyDepartments?.length
          ? legacyRolesOrDepartmentsAllows(
              req.user,
              legacyRoles || [],
              req.authzDepartmentName,
              legacyDepartments || []
            )
          : true;

    if (isAuthzShadowEnabled()) {
      logAuthzShadowComparison({
        user: req.user,
        permission,
        legacyAllowed: resolvedLegacyAllowed,
        legacyRoles,
        route: req.originalUrl,
        method: req.method,
      });
    }

    const shouldEnforce =
      isAuthzModuleEnabled(moduleName) && isAuthzEnforceEnabled();

    const access = resolveModuleRouteAccess({
      user: req.user,
      decision,
      shouldEnforce,
      resolvedLegacyAllowed,
      legacyRoles: legacyRoles || [],
      legacyDepartments: legacyDepartments || [],
    });

    if (!access.allowed) {
      return res.status(access.status || 403).json({
        success: false,
        error: access.error || `Permission denied: ${permission}`,
      });
    }

    next();
  };
};

/**
 * Require any one of several module permissions (OR).
 *
 * @param {string} moduleName
 * @param {string[]} permissions
 * @param {{ legacyAllowed?: boolean, legacyRoles?: string[], legacyDepartments?: string[] }} [options]
 * @returns {import('express').RequestHandler}
 */
export const requireModulePermissionAny = (moduleName, permissions, options = {}) => {
  const { legacyAllowed, legacyRoles, legacyDepartments } = options;
  const permissionList = Array.isArray(permissions) ? permissions : [permissions];

  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Not authenticated',
      });
    }

    let decision = { allowed: false, permission: permissionList[0] };
    for (const permission of permissionList) {
      const current = can(req.user, permission, req.authzResource || null);
      if (current.allowed) {
        decision = current;
        break;
      }
    }
    req.authz = decision;

    const resolvedLegacyAllowed =
      typeof legacyAllowed === 'boolean'
        ? legacyAllowed
        : legacyRoles?.length || legacyDepartments?.length
          ? legacyRolesOrDepartmentsAllows(
              req.user,
              legacyRoles || [],
              req.authzDepartmentName,
              legacyDepartments || []
            )
          : true;

    if (isAuthzShadowEnabled()) {
      for (const permission of permissionList) {
        logAuthzShadowComparison({
          user: req.user,
          permission,
          legacyAllowed: resolvedLegacyAllowed,
          legacyRoles,
          route: req.originalUrl,
          method: req.method,
        });
      }
    }

    const shouldEnforce =
      isAuthzModuleEnabled(moduleName) && isAuthzEnforceEnabled();

    const deniedPermission = permissionList.find(
      (key) => shouldEnforce && hasExplicitDeny(req.user, key)
    );
    if (deniedPermission && !decision.allowed && !resolvedLegacyAllowed) {
      return res.status(403).json({
        success: false,
        error: `Permission denied: ${permissionList.join(' or ')}`,
      });
    }

    const access = resolveModuleRouteAccess({
      user: req.user,
      decision,
      shouldEnforce,
      resolvedLegacyAllowed,
      legacyRoles: legacyRoles || [],
      legacyDepartments: legacyDepartments || [],
    });

    if (!access.allowed) {
      return res.status(access.status || 403).json({
        success: false,
        error: access.error || `Permission denied: ${permissionList.join(' or ')}`,
      });
    }

    next();
  };
};
