import express from "express";
import {
  createWorkOnLeaveDayRequest,
  getAllWorkOnLeaveDayRequests,
  getMyWorkOnLeaveDayRequests,
  approveWorkOnLeaveDayRequest,
  rejectWorkOnLeaveDayRequest,
  checkTodayWorkOnLeaveRequest,
} from "../controllers/workOnLeaveDayController.js";
import { protect } from '../middleware/authMiddleware.js';


import { requireModulePermission } from "../authz/authzMiddleware.js";

const router = express.Router();

const WOL_HR_ROLES = ["admin", "superadmin", "hr"];
const WOL_SELF_ROLES = [
  "employee",
  "hod",
  "sales",
  "manager",
  "hr",
  "admin",
  "superadmin",
];

const wolCreate = requireModulePermission("wfh", "leave.request.create", {
  legacyRoles: WOL_SELF_ROLES,
});
const wolViewSelf = requireModulePermission("wfh", "leave.request.view_self", {
  legacyRoles: WOL_SELF_ROLES,
});

router.post("/", protect, wolCreate, createWorkOnLeaveDayRequest);
router.get("/my-requests", protect, wolViewSelf, getMyWorkOnLeaveDayRequests);
router.get("/check-today", protect, wolViewSelf, checkTodayWorkOnLeaveRequest);

// HR/Admin routes
router.get(
  "/",
  protect,
  requireModulePermission("wfh", "leave.request.approve", { legacyRoles: WOL_HR_ROLES }),
  getAllWorkOnLeaveDayRequests
);
router.put(
  "/:id/approve",
  protect,
  requireModulePermission("wfh", "leave.request.approve", { legacyRoles: WOL_HR_ROLES }),
  approveWorkOnLeaveDayRequest
);
router.put(
  "/:id/reject",
  protect,
  requireModulePermission("wfh", "leave.request.approve", { legacyRoles: WOL_HR_ROLES }),
  rejectWorkOnLeaveDayRequest
);

export default router;
