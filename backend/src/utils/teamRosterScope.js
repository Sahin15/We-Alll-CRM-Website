import { buildEffectivePermissions } from '../authz/legacyAdapter.js';
import { SCOPES } from '../authz/scopes.js';
import { resolveOwnedDepartment } from '../middleware/hodMiddleware.js';

/**
 * Whether this user may only see their own department's team roster.
 *
 * @param {object|null|undefined} user
 * @returns {boolean}
 */
export function isOwnDepartmentTeamViewer(user) {
  if (!user) return false;

  const effective = buildEffectivePermissions(user);
  if (effective.permissions?.includes('platform.admin')) return false;

  const scope = effective.scopes?.['team.user.view'];
  if (scope === SCOPES.COMPANY || scope === SCOPES.PLATFORM) return false;

  if (user.role === 'hod') return true;
  return scope === SCOPES.OWN_DEPARTMENT || scope === SCOPES.ASSIGNED_DEPARTMENTS;
}

/**
 * @param {object} user
 * @returns {Promise<import('mongoose').Types.ObjectId | string | null>}
 */
export async function getOwnedDepartmentIdForRoster(user) {
  const owned = await resolveOwnedDepartment(user);
  if (owned?._id) return owned._id;

  const fallback = user?.department?._id || user?.department || null;
  return fallback;
}
