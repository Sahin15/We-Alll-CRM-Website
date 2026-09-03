/** @typedef {'active' | 'inactive' | 'terminated' | 'offboarded'} EmployeeStatus */

export const PAST_MEMBER_STATUSES = ["terminated", "offboarded"];

/**
 * @param {EmployeeStatus | string | null | undefined} status
 * @returns {boolean}
 */
export function isPastMember(status) {
  return PAST_MEMBER_STATUSES.includes(status);
}

/**
 * Active employees eligible for assignments, attendance, and operational lists.
 * @param {Record<string, unknown>} [baseQuery]
 * @returns {Record<string, unknown>}
 */
export function mergeActiveEmployeeFilter(baseQuery = {}) {
  return {
    ...baseQuery,
    status: "active",
    isActive: { $ne: false },
  };
}

/**
 * Current roster: active and inactive, excluding terminated/offboarded.
 * @param {Record<string, unknown>} [baseQuery]
 * @returns {Record<string, unknown>}
 */
export function mergeExcludePastMembersFilter(baseQuery = {}) {
  return {
    ...baseQuery,
    status: { $nin: PAST_MEMBER_STATUSES },
  };
}

/**
 * Remove terminated/offboarded users from populated project roster fields.
 * @param {Record<string, unknown>} project
 * @returns {Record<string, unknown>}
 */
export function stripPastMembersFromProject(project) {
  if (!project) return project;

  const head = /** @type {{ status?: string } | null | undefined} */ (
    project.projectHead
  );
  if (head && isPastMember(head.status)) {
    project.projectHead = null;
  }

  if (Array.isArray(project.assignedUsers)) {
    project.assignedUsers = project.assignedUsers.filter((user) => {
      const member = /** @type {{ status?: string } | null | undefined} */ (user);
      return member && !isPastMember(member.status);
    });
  }

  if (Array.isArray(project.teamMembers)) {
    project.teamMembers = project.teamMembers.filter((member) => {
      const entry = /** @type {{ user?: { status?: string } } | null | undefined} */ (
        member
      );
      return entry?.user && !isPastMember(entry.user.status);
    });
  }

  return project;
}
