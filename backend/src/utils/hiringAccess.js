import Department from "../models/departmentModel.js";

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
  return Department.findOne({ head: userId, status: "active" });
};

export const assertHoDAccess = async (req, res) => {
  const dept = await getHoDDepartment(req.user._id);
  if (!dept && req.user.role !== "hod") {
    res.status(403).json({ message: "Access denied. You are not a Head of Department." });
    return null;
  }
  if (!dept && req.user.role === "hod") {
    res.status(403).json({ message: "No active department assigned as head." });
    return null;
  }
  return dept;
};

export const canAccessHiringRequest = async (req, hiringRequest) => {
  if (isHrUser(req.user)) return true;
  const dept = await getHoDDepartment(req.user._id);
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
