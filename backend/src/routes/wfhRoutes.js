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
import { protect } from '../middleware/authMiddleware.js';


import { requireModulePermission } from "../authz/authzMiddleware.js";

const router = express.Router();

const WFH_VIEW_ROLES = ["admin", "superadmin", "hr", "manager", "hod"];
const WFH_APPROVE_ROLES = ["admin", "superadmin", "hr", "manager", "hod"];
const WFH_SELF_ROLES = [
  "employee",
  "hod",
  "sales",
  "manager",
  "hr",
  "admin",
  "superadmin",
];

const wfhCreate = requireModulePermission("wfh", "leave.request.create", {
  legacyRoles: WFH_SELF_ROLES,
});
const wfhViewSelf = requireModulePermission("wfh", "leave.request.view_self", {
  legacyRoles: WFH_SELF_ROLES,
});

router.post("/apply", protect, wfhCreate, applyWFH);
router.get("/my-requests", protect, wfhViewSelf, getMyWFHRequests);
router.delete("/:id", protect, wfhCreate, cancelWFHRequest);
router.get("/check/:date", protect, wfhViewSelf, checkWFHStatus);

// HR/Admin/Manager/HoD routes
router.get(
  "/all",
  protect,
  requireModulePermission("wfh", "leave.request.view", { legacyRoles: WFH_VIEW_ROLES }),
  getAllWFHRequests
);
router.get(
  "/pending",
  protect,
  requireModulePermission("wfh", "leave.request.view", { legacyRoles: WFH_VIEW_ROLES }),
  getPendingWFHRequests
);
router.put(
  "/:id/approve",
  protect,
  requireModulePermission("wfh", "leave.request.approve", { legacyRoles: WFH_APPROVE_ROLES }),
  approveWFHRequest
);
router.put(
  "/:id/reject",
  protect,
  requireModulePermission("wfh", "leave.request.approve", { legacyRoles: WFH_APPROVE_ROLES }),
  rejectWFHRequest
);
router.get(
  "/statistics",
  protect,
  requireModulePermission("wfh", "leave.request.view", { legacyRoles: WFH_VIEW_ROLES }),
  getWFHStatistics
);

export default router;
