/**
 * Authorization V2 — Scope resolver (foundation).
 * Produces MongoDB filter fragments for list queries.
 */

import { SCOPES } from './scopes.js';

/**
 * @param {import('mongoose').Types.ObjectId | string | null | undefined} id
 * @returns {string | null}
 */
function toIdString(id) {
  if (!id) return null;
  return id.toString();
}

/**
 * Resolve scope to a query filter fragment.
 * Foundation phase: basic resolvers only; CUSTOM/TEAM expanded in later phases.
 *
 * @param {object} user - Mongoose user document or plain object
 * @param {string} scope
 * @returns {object | null} MongoDB filter fragment, or null if scope cannot be resolved
 */
export function resolveScopeFilter(user, scope) {
  const userId = toIdString(user._id || user.id);

  switch (scope) {
    case SCOPES.SELF:
      return { employee: userId };
    case SCOPES.OWN_DEPARTMENT: {
      const deptId = toIdString(user.department || user.headOfDepartment);
      if (!deptId) return { _id: null };
      return { department: deptId };
    }
    case SCOPES.COMPANY:
      return {};
    case SCOPES.PLATFORM:
      return {};
    case SCOPES.PROJECT:
      return { $or: [{ assignedTo: userId }, { 'teamMembers.user': userId }] };
    case SCOPES.CLIENT_PORTFOLIO:
      return { client: userId };
    case SCOPES.TEAM:
      return { employee: userId };
    case SCOPES.ASSIGNED_DEPARTMENTS: {
      const deptId = toIdString(user.department);
      if (!deptId) return { _id: null };
      return { department: deptId };
    }
    default:
      return null;
  }
}

/**
 * @param {object} user
 * @param {string} scope
 * @param {object} [resource]
 * @returns {boolean}
 */
export function resourceMatchesScope(user, scope, resource) {
  if (!resource) return true;

  const userId = toIdString(user._id || user.id);

  switch (scope) {
    case SCOPES.SELF:
      return (
        toIdString(resource.employee) === userId ||
        toIdString(resource.user) === userId ||
        toIdString(resource.requestedBy) === userId ||
        toIdString(resource._id) === userId
      );
    case SCOPES.OWN_DEPARTMENT: {
      const userDept = toIdString(user.department || user.headOfDepartment);
      const resourceDept = toIdString(resource.department);
      return Boolean(userDept && resourceDept && userDept === resourceDept);
    }
    case SCOPES.COMPANY:
    case SCOPES.PLATFORM:
      return true;
    default:
      return true;
  }
}
