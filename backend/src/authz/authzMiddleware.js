/**
 * Authorization V2 — Route middleware (opt-in during migration).
 * Does NOT replace authorizeRoles until module flag is enabled.
 */

import { can } from './policyEngine.js';
import { shadowLegacyRouteCheck } from './shadowLogger.js';

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
        shadowLegacyRouteCheck(permission, [], legacyAllowed, req);
      }
      next();
    });
  };
};
