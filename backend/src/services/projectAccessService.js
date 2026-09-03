/**
 * Single source of truth for personal project team membership.
 * Users see projects they work on — not every project in their department.
 */

import { buildUserProjectMembershipFilter } from './clientAccessService.js';

export { buildUserProjectMembershipFilter };

/**
 * @param {string | import('mongoose').Types.ObjectId} userId
 * @param {object} project
 * @returns {boolean}
 */
export function isUserPersonallyAssignedToProject(userId, project) {
  if (!userId || !project) return false;

  const uid = String(userId);
  const projectHeadId = String(project.projectHead?._id || project.projectHead || '');
  if (projectHeadId && projectHeadId === uid) {
    return true;
  }

  const isAssignedUser = (project.assignedUsers || []).some((user) => {
    const assignedId = String(user?._id || user || '');
    return assignedId === uid;
  });
  if (isAssignedUser) {
    return true;
  }

  return (project.teamMembers || []).some((member) => {
    if (member?.isActive === false) return false;
    const memberId = String(member?.user?._id || member?.user || '');
    return memberId === uid;
  });
}

/**
 * MongoDB filter for projects where the user is on the active team.
 *
 * @param {string | import('mongoose').Types.ObjectId} userId
 * @returns {object}
 */
export function getPersonalProjectMembershipFilter(userId) {
  return buildUserProjectMembershipFilter(userId);
}
