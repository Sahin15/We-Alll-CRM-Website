import userApi from "../api/userApi";
import { isPostingDepartmentName } from "../constants/departmentNames";

/**
 * @param {unknown} usersRes
 * @returns {Array<object>}
 */
export function normalizeUserApiList(usersRes) {
  if (Array.isArray(usersRes)) return usersRes;
  if (Array.isArray(usersRes?.data)) return usersRes.data;
  if (Array.isArray(usersRes?.users)) return usersRes.users;
  return [];
}

/**
 * Active users in the Posting department (for creative → posting handoff UIs).
 * @returns {Promise<Array<object>>}
 */
export async function fetchPostingDepartmentUsers() {
  const usersRes = await userApi.getAllUsers({
    status: "active",
    department: "Posting",
    limit: 500,
  });
  return normalizeUserApiList(usersRes).filter((user) =>
    isPostingDepartmentName(user.department?.name)
  );
}
