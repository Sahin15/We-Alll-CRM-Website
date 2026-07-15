/**
 * Authorization V2 — Direct user permission assignments (Phase 2).
 */

import User from '../models/userModel.js';
import UserPermissionGrant from '../models/userPermissionGrantModel.js';
import { getLegacyRoleGrants } from './legacyAdapter.js';
import { mergeDirectGrants } from './grantMerge.js';
import { isValidPermissionKey } from './permissionCatalog.js';
import { SCOPES } from './scopes.js';

/**
 * @param {object} user - User document or plain object with role fields
 * @param {Array<{ permission: string, scope: string, effect?: string }>} [directGrants]
 * @returns {import('./scopes.js').PermissionGrant[]}
 */
export function getEffectiveGrantsWithDirect(user, directGrants = []) {
  const legacyGrants = getLegacyRoleGrants(user);
  const direct = directGrants.length ? directGrants : user?.directPermissionGrants || [];
  return mergeDirectGrants(legacyGrants, direct);
}

/**
 * @param {{ expiresAt?: Date | string | null }} row
 * @param {Date} [now]
 * @returns {boolean}
 */
export function isDirectGrantActive(row, now = new Date()) {
  if (!row?.expiresAt) return true;
  return new Date(row.expiresAt) > now;
}

/**
 * @param {import('mongoose').Types.ObjectId | string} userId
 * @param {{ includeExpired?: boolean }} [options]
 * @returns {Promise<Array<object>>}
 */
export async function loadDirectGrantsForUser(userId, options = {}) {
  const { includeExpired = true } = options;
  const rows = await UserPermissionGrant.find({ user: userId })
    .populate('assignedBy', 'name email role')
    .sort({ permission: 1 })
    .lean();

  const mapped = rows.map((row) => ({
    _id: row._id,
    permission: row.permission,
    scope: row.scope,
    effect: row.effect,
    note: row.note || '',
    assignedBy: row.assignedBy,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    expiresAt: row.expiresAt || null,
    isExpired: !isDirectGrantActive(row),
  }));

  if (includeExpired) {
    return mapped;
  }

  return mapped.filter((row) => !row.isExpired);
}

/**
 * @param {object} user
 * @param {Array<{ permission: string, scope: string, effect?: string }>} directGrants
 */
export function buildEffectivePermissionsWithDirect(user, directGrants = []) {
  const direct = directGrants.length ? directGrants : [];
  const grants = getEffectiveGrantsWithDirect(user, direct);
  const permissions = grants.map((g) => g.permission);
  const scopes = grants.reduce((acc, g) => {
    acc[g.permission] = g.scope;
    return acc;
  }, {});

  const legacyGrants = getLegacyRoleGrants(user);
  const legacyKeys = new Set(legacyGrants.map((g) => g.permission));

  return {
    legacyRole: user.role,
    permissions,
    scopes,
    grants,
    directAssignments: direct.filter((g) => g.effect !== 'deny'),
    directDenials: direct.filter((g) => g.effect === 'deny'),
    inheritedPermissions: legacyGrants.map((g) => g.permission),
    customPermissions: direct
      .filter((g) => g.effect !== 'deny' && !legacyKeys.has(g.permission))
      .map((g) => g.permission),
    source: direct.length ? 'legacy_adapter+direct' : 'legacy_adapter',
  };
}

/**
 * @param {import('mongoose').Types.ObjectId | string} userId
 * @returns {Promise<object|null>}
 */
export async function findAssignableUser(userId) {
  const user = await User.findById(userId)
    .select('name email role department status isHeadOfDepartment')
    .populate('department', 'name')
    .lean();

  if (!user || user.role === 'superadmin') {
    return null;
  }

  return user;
}

/**
 * @param {import('mongoose').Types.ObjectId | string} userId
 * @returns {Promise<object>}
 */
export async function getUserAssignmentPayload(userId) {
  const user = await findAssignableUser(userId);
  if (!user) {
    const err = new Error('User not found or cannot modify superadmin permissions');
    err.statusCode = 404;
    throw err;
  }

  const directRows = await loadDirectGrantsForUser(userId, { includeExpired: true });
  const activeDirectRows = directRows.filter((row) => !row.isExpired);
  const directGrants = activeDirectRows.map((row) => ({
    permission: row.permission,
    scope: row.scope,
    effect: row.effect,
  }));

  const effective = buildEffectivePermissionsWithDirect(user, directGrants);

  return {
    user: {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      department: user.department,
      status: user.status,
      isHeadOfDepartment: Boolean(user.isHeadOfDepartment),
    },
    directAssignments: directRows,
    expiredAssignments: directRows.filter((row) => row.isExpired),
    inherited: {
      permissions: getLegacyRoleGrants(user).map((g) => g.permission),
      scopes: getLegacyRoleGrants(user).reduce((acc, g) => {
        acc[g.permission] = g.scope;
        return acc;
      }, {}),
    },
    effective: {
      permissions: effective.permissions,
      scopes: effective.scopes,
      customPermissions: effective.customPermissions,
    },
  };
}

/**
 * @param {import('mongoose').Types.ObjectId | string} userId
 * @param {Array<{ permission: string, scope?: string, effect?: string, note?: string }>} assignments
 * @param {import('mongoose').Types.ObjectId | string} assignedById
 * @returns {Promise<object>}
 */
export async function replaceUserAssignments(userId, assignments, assignedById) {
  const user = await findAssignableUser(userId);
  if (!user) {
    const err = new Error('User not found or cannot modify superadmin permissions');
    err.statusCode = 404;
    throw err;
  }

  if (!Array.isArray(assignments)) {
    const err = new Error('assignments must be an array');
    err.statusCode = 400;
    throw err;
  }

  const normalized = [];
  const seen = new Set();

  for (const item of assignments) {
    const permission = item?.permission;
    if (!permission || !isValidPermissionKey(permission)) {
      const err = new Error(`Invalid permission key: ${permission || '(empty)'}`);
      err.statusCode = 400;
      throw err;
    }
    if (seen.has(permission)) continue;
    seen.add(permission);

    const scope = item.scope || SCOPES.COMPANY;
    if (!Object.values(SCOPES).includes(scope)) {
      const err = new Error(`Invalid scope for ${permission}`);
      err.statusCode = 400;
      throw err;
    }

    const effect = item.effect === 'deny' ? 'deny' : 'grant';
    let expiresAt = null;
    if (item.expiresAt) {
      const parsed = new Date(item.expiresAt);
      if (Number.isNaN(parsed.getTime())) {
        const err = new Error(`Invalid expiresAt for ${permission}`);
        err.statusCode = 400;
        throw err;
      }
      if (parsed <= new Date()) {
        const err = new Error(`expiresAt must be in the future for ${permission}`);
        err.statusCode = 400;
        throw err;
      }
      expiresAt = parsed;
    }

    normalized.push({
      permission,
      scope,
      effect,
      note: typeof item.note === 'string' ? item.note.trim().slice(0, 500) : '',
      expiresAt,
    });
  }

  await UserPermissionGrant.deleteMany({ user: userId });

  if (normalized.length) {
    await UserPermissionGrant.insertMany(
      normalized.map((row) => ({
        user: userId,
        permission: row.permission,
        scope: row.scope,
        effect: row.effect,
        note: row.note,
        expiresAt: row.expiresAt,
        assignedBy: assignedById,
      }))
    );
  }

  return getUserAssignmentPayload(userId);
}
