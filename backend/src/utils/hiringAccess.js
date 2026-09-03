import Department from "../models/departmentModel.js";
import User from "../models/userModel.js";
import { hasPermission } from "../authz/policyEngine.js";
import {
  getEffectivePermissionGrant,
  hasCompanyWideScopeForPermission,
} from "../services/resourceVisibilityService.js";

export const HR_ROLES = ["hr", "admin", "superadmin", "manager"];

export const isHrUser = (user) => HR_ROLES.includes(user?.role);

/**
 * HR pipeline access via legacy role or direct grant.
 *
 * @param {object} user
 * @returns {boolean}
 */
export const canManageHiringPipeline = (user) =>
  isHrUser(user) || hasPermission(user, "hiring.pipeline.manage");

export const assertHrAccess = (req, res) => {
  if (!canManageHiringPipeline(req.user)) {
    res.status(403).json({ message: "Insufficient permissions" });
    return false;
  }
  return true;
};

/**
 * Company-wide hiring request visibility (HR roles or COMPANY-scoped grants).
 *
 * @param {object} user
 * @returns {boolean}
 */
export const hasCompanyWideHiringRequestAccess = (user) => {
  if (!user) return false;
  if (isHrUser(user) || hasPermission(user, "hiring.pipeline.manage")) {
    return true;
  }
  return hasCompanyWideScopeForPermission(user, "hiring.request.view");
};

/**
 * Whether the user may create hiring requests (HoD legacy or direct grant).
 *
 * @param {object} user
 * @returns {boolean}
 */
export const canCreateHiringRequest = (user) =>
  hasPermission(user, "hiring.request.create") ||
  user?.role === "hod";

export const getHoDDepartment = async (userId) => {
  const id = userId?._id || userId;
  let dept = await Department.findOne({ head: id, status: "active" });
  if (dept) return dept;

  const user = await User.findById(id).select("role headOfDepartment department");
  if (user?.headOfDepartment) {
    dept = await Department.findOne({
      _id: user.headOfDepartment,
      status: "active",
    });
  }
  return dept;
};

export const assertHoDAccess = async (req, res) => {
  const dept = await getHoDDepartment(req.user._id || req.user.id);
  if (!dept) {
    res.status(403).json({
      message:
        req.user.role === "hod"
          ? "No active department assigned as head."
          : "Access denied. You are not a Head of Department.",
    });
    return null;
  }
  return dept;
};

/**
 * Resolve department for creating a hiring request (HoD legacy or direct grant).
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @returns {Promise<object|null>}
 */
export const resolveHiringDepartmentForCreate = async (req, res) => {
  if (hasCompanyWideScopeForPermission(req.user, "hiring.request.create")) {
    const deptId = req.body?.department;
    if (!deptId) {
      res.status(400).json({ message: "Department is required" });
      return null;
    }
    const dept = await Department.findById(deptId);
    if (!dept) {
      res.status(400).json({ message: "Invalid department" });
      return null;
    }
    return dept;
  }

  if (hasPermission(req.user, "hiring.request.create")) {
    const hodDept = await getHoDDepartment(req.user._id || req.user.id);
    if (hodDept) return hodDept;
    if (req.user.department) {
      const userDept = await Department.findById(req.user.department);
      if (userDept) return userDept;
    }
  }

  return assertHoDAccess(req, res);
};

export const canAccessHiringRequest = async (req, hiringRequest) => {
  if (hasCompanyWideHiringRequestAccess(req.user)) return true;

  if (hasPermission(req.user, "hiring.request.view")) {
    const grant = getEffectivePermissionGrant(req.user, "hiring.request.view");
    if (grant && hasCompanyWideScopeForPermission(req.user, "hiring.request.view")) {
      return true;
    }
    const dept = await getHoDDepartment(req.user._id || req.user.id);
    if (!dept) return false;
    const reqDeptId = hiringRequest.department?._id || hiringRequest.department;
    return String(reqDeptId) === String(dept._id);
  }

  const dept = await getHoDDepartment(req.user._id || req.user.id);
  if (!dept) return false;
  const reqDeptId = hiringRequest.department?._id || hiringRequest.department;
  return String(reqDeptId) === String(dept._id);
};

export const generateRequestNumber = async (HiringRequest) => {
  const year = new Date().getFullYear();
  const prefix = `HRQ-${year}-`;
  const last = await HiringRequest.findOne({
    requestNumber: new RegExp(`^${prefix}`),
  })
    .sort({ requestNumber: -1 })
    .select("requestNumber")
    .lean();

  let seq = 1;
  if (last?.requestNumber) {
    const part = last.requestNumber.split("-").pop();
    const n = parseInt(part, 10);
    if (!Number.isNaN(n)) seq = n + 1;
  }
  return `${prefix}${String(seq).padStart(4, "0")}`;
};
