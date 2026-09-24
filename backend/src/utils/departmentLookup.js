import Department from "../models/departmentModel.js";
import { resolveCanonicalDepartmentName } from "../constants/departmentNames.js";

/**
 * Resolve a department filter (name or ObjectId string) to a Department _id.
 * Matches exact/canonical names and legacy DB strings (e.g. "Posting Department").
 *
 * @param {string} departmentParam
 * @returns {Promise<import('mongoose').Types.ObjectId | string | null>}
 */
export async function resolveDepartmentIdForFilter(departmentParam) {
  if (!departmentParam || typeof departmentParam !== "string") {
    return null;
  }

  if (departmentParam.match(/^[0-9a-fA-F]{24}$/)) {
    return departmentParam;
  }

  const canonicalName =
    resolveCanonicalDepartmentName(departmentParam) || departmentParam.trim();

  const escaped = canonicalName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  let dept = await Department.findOne({
    name: { $regex: new RegExp(`^${escaped}$`, "i") },
  })
    .select("_id")
    .lean();

  if (dept?._id) {
    return dept._id;
  }

  const allDepartments = await Department.find({}).select("_id name").lean();
  const matched = allDepartments.find(
    (row) => resolveCanonicalDepartmentName(row.name) === canonicalName
  );

  return matched?._id || null;
}
