/**
 * Single source of truth for personal client visibility.
 *
 * Business rule (simple):
 * - Do NOT assign users on clients for access.
 * - A user sees a client only when they are on at least one of that client's projects
 *   (project head, assignedUsers, or active teamMembers).
 * - Company-wide roles (admin/hr/manager) still see all clients via resourceVisibilityService.
 *
 * Work items alone do NOT grant client access.
 * accountManager / assignedDepartments are metadata only — not access control.
 */

import mongoose from 'mongoose';
import Project from '../models/projectModel.js';

/**
 * @param {string | mongoose.Types.ObjectId} userId
 * @returns {mongoose.Types.ObjectId}
 */
function toObjectId(userId) {
  if (userId instanceof mongoose.Types.ObjectId) {
    return userId;
  }
  return new mongoose.Types.ObjectId(String(userId));
}

/**
 * MongoDB filter for projects where the user is an active team member.
 *
 * @param {string | mongoose.Types.ObjectId} userId
 * @returns {object}
 */
export function buildUserProjectMembershipFilter(userId) {
  const objectId = toObjectId(userId);
  const userIdString = objectId.toString();
  const userRef = { $in: [objectId, userIdString] };

  return {
    $or: [
      { assignedUsers: userRef },
      { projectHead: userRef },
      {
        teamMembers: {
          $elemMatch: {
            user: userRef,
            isActive: { $ne: false },
          },
        },
      },
    ],
  };
}

/**
 * @param {string[]} groups
 * @returns {string[]}
 */
export function mergeUniqueClientIds(...groups) {
  return [...new Set(groups.flat().filter(Boolean))];
}

/**
 * Collect client IDs the user can see via project membership only.
 *
 * @param {string | mongoose.Types.ObjectId} userId
 * @returns {Promise<string[]>}
 */
export async function collectPersonallyAssignedClientIds(userId) {
  const membershipFilter = buildUserProjectMembershipFilter(userId);

  const userProjects = await Project.find(membershipFilter)
    .select('client')
    .populate('client', '_id')
    .lean();

  const projectClientIds = userProjects
    .filter((project) => project.client?._id)
    .map((project) => project.client._id.toString());

  return mergeUniqueClientIds(projectClientIds);
}

/**
 * Whether a user is personally assigned to a client (via project team).
 *
 * @param {string | mongoose.Types.ObjectId} userId
 * @param {string | mongoose.Types.ObjectId} clientId
 * @returns {Promise<boolean>}
 */
export async function isUserPersonallyAssignedToClient(userId, clientId) {
  const clientIdString = String(clientId);
  const assignedIds = await collectPersonallyAssignedClientIds(userId);
  return assignedIds.includes(clientIdString);
}

/**
 * Resolve which user's assigned clients may be listed by the requester.
 *
 * @param {object} requester
 * @param {string | undefined} requestedEmployeeId
 * @returns {{ allowed: boolean, targetUserId?: string, status?: number, message?: string }}
 */
export function resolveAssignedClientsTargetUserId(requester, requestedEmployeeId) {
  if (!requester?.id && !requester?._id) {
    return { allowed: false, status: 401, message: 'Not authenticated' };
  }

  const requesterId = String(requester.id || requester._id);

  if (!requestedEmployeeId || requestedEmployeeId === requesterId) {
    return { allowed: true, targetUserId: requesterId };
  }

  const canViewOthers = ['admin', 'superadmin', 'hr', 'manager'].includes(requester.role);
  if (!canViewOthers) {
    return { allowed: false, status: 403, message: 'Access denied' };
  }

  return { allowed: true, targetUserId: String(requestedEmployeeId) };
}

/**
 * Explain why a user is linked to a client (for debugging/support).
 *
 * @param {string | mongoose.Types.ObjectId} userId
 * @param {string | mongoose.Types.ObjectId} clientId
 * @returns {Promise<{ linked: boolean, reasons: string[] }>}
 */
export async function describeClientAssignmentLink(userId, clientId) {
  const clientIdString = String(clientId);
  const reasons = [];

  const projects = await Project.find({
    client: clientIdString,
    ...buildUserProjectMembershipFilter(userId),
  })
    .select('name')
    .lean();

  projects.forEach((project) => {
    reasons.push(`project_team:${project.name}`);
  });

  return { linked: reasons.length > 0, reasons };
}
