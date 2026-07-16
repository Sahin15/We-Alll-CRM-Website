/**
 * Central visibility rules for clients and projects.
 *
 * Business rules:
 * - Working on a client = working on at least one of that client's projects (team membership).
 * - Users see ALL projects they are assigned to, and clients linked to those projects.
 * - If a client has projects A and B and the user works only on A, they see the client and project A only.
 * - Company-wide visibility: admin, superadmin, hr, manager by default.
 * - Direct permission grants can widen (COMPANY scope) or deny access for any permission.
 */

import { getEffectiveGrants } from '../authz/legacyAdapter.js';
import { SCOPES } from '../authz/scopes.js';
import {
  buildUserProjectMembershipFilter,
  collectPersonallyAssignedClientIds,
  isUserPersonallyAssignedToClient,
} from './clientAccessService.js';
import { isUserPersonallyAssignedToProject } from './projectAccessService.js';

/** Roles that see all company clients/projects unless explicitly denied. */
export const COMPANY_VIEWER_ROLES = ['admin', 'superadmin', 'hr', 'manager'];

const COMPANY_WIDE_SCOPES = new Set([SCOPES.COMPANY, SCOPES.PLATFORM]);

/**
 * @param {object} user
 * @param {string} permission
 * @returns {boolean}
 */
export function isPermissionExplicitlyDenied(user, permission) {
  return Boolean(
    user?.directPermissionGrants?.some(
      (grant) => grant.permission === permission && grant.effect === 'deny'
    )
  );
}

/**
 * @param {object} user
 * @param {string} permission
 * @returns {{ permission: string, scope: string } | null}
 */
export function getEffectivePermissionGrant(user, permission) {
  if (!user || !permission) return null;
  if (isPermissionExplicitlyDenied(user, permission)) return null;

  const grants = getEffectiveGrants(user);
  return grants.find((grant) => grant.permission === permission) || null;
}

/**
 * @param {object} user
 * @param {string} permission
 * @returns {boolean}
 */
export function hasCompanyWideScopeForPermission(user, permission) {
  const grant = getEffectivePermissionGrant(user, permission);
  return Boolean(grant && COMPANY_WIDE_SCOPES.has(grant.scope));
}

/**
 * Whether the user may list/view all company clients.
 *
 * @param {object} user
 * @returns {boolean}
 */
export function canViewAllCompanyClients(user) {
  if (!user) return false;

  if (isPermissionExplicitlyDenied(user, 'crm.client.view')) {
    return false;
  }

  if (hasCompanyWideScopeForPermission(user, 'crm.client.view')) {
    return true;
  }

  return COMPANY_VIEWER_ROLES.includes(user.role);
}

/**
 * Whether the user may list/view all company projects.
 *
 * @param {object} user
 * @returns {boolean}
 */
export function canViewAllCompanyProjects(user) {
  if (!user) return false;

  if (isPermissionExplicitlyDenied(user, 'projects.project.view')) {
    return false;
  }

  if (hasCompanyWideScopeForPermission(user, 'projects.project.view')) {
    return true;
  }

  return COMPANY_VIEWER_ROLES.includes(user.role);
}

/**
 * Whether the user may use assigned-only client endpoints.
 *
 * @param {object} user
 * @returns {boolean}
 */
export function canViewAssignedClients(user) {
  if (!user) return false;
  if (isPermissionExplicitlyDenied(user, 'crm.client.view_assigned')) {
    return false;
  }
  return Boolean(getEffectivePermissionGrant(user, 'crm.client.view_assigned'));
}

/**
 * Build MongoDB client list filter for the requester.
 *
 * @param {object} user
 * @param {object} [baseQuery]
 * @returns {Promise<object>}
 */
export async function buildClientListQuery(user, baseQuery = {}) {
  if (canViewAllCompanyClients(user)) {
    return { ...baseQuery };
  }

  const userId = String(user.id || user._id);
  const clientIds = await collectPersonallyAssignedClientIds(userId);

  return {
    ...baseQuery,
    _id: { $in: clientIds.length ? clientIds : [null] },
  };
}

/**
 * Build MongoDB project list filter for the requester.
 *
 * @param {object} user
 * @param {object} [baseQuery]
 * @returns {object}
 */
export function buildProjectListQuery(user, baseQuery = {}) {
  if (canViewAllCompanyProjects(user)) {
    return { ...baseQuery };
  }

  const userId = String(user.id || user._id);
  return {
    ...baseQuery,
    ...buildUserProjectMembershipFilter(userId),
  };
}

/**
 * Projects visible to the user, optionally scoped to one client.
 *
 * @param {object} user
 * @param {object} [baseQuery]
 * @returns {object}
 */
export function buildAssignedProjectQueryForUser(user, baseQuery = {}) {
  return buildProjectListQuery(user, baseQuery);
}

/**
 * Whether the requester may view a specific client record.
 *
 * @param {object} user
 * @param {string | import('mongoose').Types.ObjectId} clientId
 * @returns {Promise<boolean>}
 */
export async function canUserViewClient(user, clientId) {
  if (!user || !clientId) return false;
  if (canViewAllCompanyClients(user)) return true;

  return isUserPersonallyAssignedToClient(String(user.id || user._id), clientId);
}

/**
 * Whether the requester may view a specific project record.
 *
 * @param {object} user
 * @param {object} project
 * @returns {boolean}
 */
export function canUserViewProject(user, project) {
  if (!user || !project) return false;
  if (canViewAllCompanyProjects(user)) return true;

  if (user.role === 'client') {
    return false;
  }

  return isUserPersonallyAssignedToProject(String(user.id || user._id), project);
}

/**
 * Filter projects for a client to those visible to the user.
 *
 * @param {object} user
 * @param {object[]} projects
 * @returns {object[]}
 */
export function filterProjectsVisibleToUser(user, projects) {
  if (!Array.isArray(projects)) return [];
  if (canViewAllCompanyProjects(user)) return projects;
  return projects.filter((project) => canUserViewProject(user, project));
}
