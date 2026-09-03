export const PAST_MEMBER_STATUSES = ["terminated", "offboarded"];

/**
 * @param {{ status?: string } | string | null | undefined} userOrStatus
 * @returns {boolean}
 */
export function isPastMember(userOrStatus) {
  const status =
    typeof userOrStatus === "string" ? userOrStatus : userOrStatus?.status;
  return PAST_MEMBER_STATUSES.includes(status);
}

/**
 * @param {{ status?: string, isActive?: boolean } | null | undefined} user
 * @returns {boolean}
 */
export function isActiveEmployee(user) {
  return user?.status === "active" && user?.isActive !== false;
}

/**
 * @param {Array<{ status?: string }>} [users]
 * @returns {Array<{ status?: string }>}
 */
export function filterEmployableEmployees(users) {
  return (users || []).filter((user) => !isPastMember(user));
}

/**
 * @param {Array<{ status?: string, isActive?: boolean }>} [users]
 * @returns {Array<{ status?: string, isActive?: boolean }>}
 */
export function filterActiveEmployees(users) {
  return (users || []).filter(isActiveEmployee);
}
