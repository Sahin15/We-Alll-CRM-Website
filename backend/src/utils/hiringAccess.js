import Department from "../models/departmentModel.js";
import User from "../models/userModel.js";

export const HR_ROLES = ["hr", "admin", "superadmin", "manager"];

export const assertHrAccess = (req, res) => {
  if (!HR_ROLES.includes(req.user.role)) {
    res.status(403).json({ message: "Insufficient permissions" });
    return false;
  }
  return true;
};

export const isHrUser = (user) => HR_ROLES.includes(user?.role);

export const getHoDDepartment = async (userId) => {
  const id = userId?._id || userId;
  let dept = await Department.findOne({ head: id, status: "active" });
  if (dept) return dept;

  const user = await User.findById(id).select("role headOfDepartment");
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

export const canAccessHiringRequest = async (req, hiringRequest) => {
  if (isHrUser(req.user)) return true;
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
