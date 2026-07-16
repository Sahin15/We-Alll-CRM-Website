/**
 * Single source of truth for personal client assignment visibility.
 *
 * Business rule: working on a client means working on that client's projects.
 * If a client has projects A and B and the user is on project A only, they see
 * the client (via project A) but not project B.
 *
 * A user sees a client when they are:
 * 1. The client's account manager, OR
 * 2. An active member of any project team for that client (project head, assigned user, active team member).
 *
 * Work items alone do NOT grant client access — assignment must be at project-team level.
 * Project creators (createdBy) are NOT treated as assigned unless they are on the team.
 */

import mongoose from 'mongoose';
import Client from '../models/clientModel.js';
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
 * Collect client IDs personally assigned to a user via account manager or project team.
 *
 * @param {string | mongoose.Types.ObjectId} userId
 * @returns {Promise<string[]>}
 */
export async function collectPersonallyAssignedClientIds(userId) {
  const membershipFilter = buildUserProjectMembershipFilter(userId);
  const objectId = toObjectId(userId);

  const [managedClients, userProjects] = await Promise.all([
    Client.find({ accountManager: { $in: [objectId, objectId.toString()] } })
      .select('_id')
      .lean(),
    Project.find(membershipFilter).select('client').populate('client', '_id').lean(),
  ]);

  const managedClientIds = managedClients.map((client) => client._id.toString());
  const projectClientIds = userProjects
    .filter((project) => project.client?._id)
    .map((project) => project.client._id.toString());

  return mergeUniqueClientIds(managedClientIds, projectClientIds);
}

/**
 * Whether a user is personally assigned to a client.
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
  const objectId = toObjectId(userId);
  const clientIdString = String(clientId);
  const reasons = [];

  const managed = await Client.findOne({
    _id: clientIdString,
    accountManager: { $in: [objectId, objectId.toString()] },
  })
    .select('_id')
    .lean();
  if (managed) {
    reasons.push('account_manager');
  }

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
