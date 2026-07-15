/**
 * Load direct permission assignments onto req.user for policy checks.
 */

import UserPermissionGrant from '../models/userPermissionGrantModel.js';
import { isDirectGrantActive } from './userGrantService.js';

/**
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export async function attachDirectPermissionGrants(req, res, next) {
  try {
    if (!req.user?._id) {
      return next();
    }

    const rows = await UserPermissionGrant.find({ user: req.user._id })
      .select('permission scope effect expiresAt')
      .lean();

    req.user.directPermissionGrants = rows
      .filter((row) => isDirectGrantActive(row))
      .map((row) => ({
        permission: row.permission,
        scope: row.scope,
        effect: row.effect,
      }));

    next();
  } catch (error) {
    console.error('[authz] Failed to load direct permission grants:', error);
    next();
  }
}
