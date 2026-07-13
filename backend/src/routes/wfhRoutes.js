import express from "express";
import {
  applyWFH,
  getMyWFHRequests,
  getAllWFHRequests,
  getPendingWFHRequests,
  approveWFHRequest,
  rejectWFHRequest,
  cancelWFHRequest,
  checkWFHStatus,
  getWFHStatistics,
} from "../controllers/wfhController.js";
import { protect } from "../middleware/authMiddleware.js";
import { authorizeRoles } from "../middleware/roleMiddleware.js";
import { requireModulePermission } from "../authz/authzMiddleware.js";

const router = express.Router();

const WFH_VIEW_ROLES = ["admin", "superadmin", "hr", "manager", "hod"];
const WFH_APPROVE_ROLES = ["admin", "superadmin", "hr", "manager", "hod"];

// Employee routes (legacy: any authenticated user — uses leave self-service permissions)
router.post(
  "/apply",
  protect,
  requireModulePermission("wfh", "leave.request.create", { legacyAllowed: true }),
  applyWFH
);
router.get(
  "/my-requests",
  protect,
  requireModulePermission("wfh", "leave.request.view_self", { legacyAllowed: true }),
  getMyWFHRequests
);
router.delete(
  "/:id",
  protect,
  requireModulePermission("wfh", "leave.request.create", { legacyAllowed: true }),
  cancelWFHRequest
);
router.get(
  "/check/:date",
  protect,
  requireModulePermission("wfh", "leave.request.view_self", { legacyAllowed: true }),
  checkWFHStatus
);

// HR/Admin/Manager/HoD routes
router.get(
  "/all",
  protect,
  authorizeRoles(...WFH_VIEW_ROLES),
  requireModulePermission("wfh", "leave.request.view", { legacyRoles: WFH_VIEW_ROLES }),
  getAllWFHRequests
);
router.get(
  "/pending",
  protect,
  authorizeRoles(...WFH_VIEW_ROLES),
  requireModulePermission("wfh", "leave.request.view", { legacyRoles: WFH_VIEW_ROLES }),
  getPendingWFHRequests
);
router.put(
  "/:id/approve",
  protect,
  authorizeRoles(...WFH_APPROVE_ROLES),
  requireModulePermission("wfh", "leave.request.approve", { legacyRoles: WFH_APPROVE_ROLES }),
  approveWFHRequest
);
router.put(
  "/:id/reject",
  protect,
  authorizeRoles(...WFH_APPROVE_ROLES),
  requireModulePermission("wfh", "leave.request.approve", { legacyRoles: WFH_APPROVE_ROLES }),
  rejectWFHRequest
);
router.get(
  "/statistics",
  protect,
  authorizeRoles(...WFH_VIEW_ROLES),
  requireModulePermission("wfh", "leave.request.view", { legacyRoles: WFH_VIEW_ROLES }),
  getWFHStatistics
);

export default router;
