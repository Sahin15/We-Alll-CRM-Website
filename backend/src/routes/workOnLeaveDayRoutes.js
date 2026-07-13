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

// Employee routes (legacy: any authenticated user)
router.post(
  "/",
  protect,
  requireModulePermission("wfh", "leave.request.create", { legacyAllowed: true }),
  createWorkOnLeaveDayRequest
);
router.get(
  "/my-requests",
  protect,
  requireModulePermission("wfh", "leave.request.view_self", { legacyAllowed: true }),
  getMyWorkOnLeaveDayRequests
);
router.get(
  "/check-today",
  protect,
  requireModulePermission("wfh", "leave.request.view_self", { legacyAllowed: true }),
  checkTodayWorkOnLeaveRequest
);

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
