/**
 * Authorization V2 — Merge legacy and direct permission grants.
 */

import { SCOPES } from './scopes.js';

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
 * @param {import('./scopes.js').PermissionGrant[]} legacyGrants
 * @param {Array<{ permission: string, scope: string, effect?: string }>} directGrants
 * @returns {import('./scopes.js').PermissionGrant[]}
 */
export function mergeDirectGrants(legacyGrants, directGrants = []) {
  const grantMap = new Map();

  for (const grant of legacyGrants) {
    grantMap.set(grant.permission, { ...grant });
  }

  for (const direct of directGrants) {
    if (!direct?.permission) continue;

    if (direct.effect === 'deny') {
      grantMap.delete(direct.permission);
      continue;
    }

    const existing = grantMap.get(direct.permission);
    if (!existing || scopeBreadth(direct.scope) > scopeBreadth(existing.scope)) {
      grantMap.set(direct.permission, {
        permission: direct.permission,
        scope: direct.scope,
        source: 'direct_assignment',
      });
    }
  }

  return Array.from(grantMap.values());
}
