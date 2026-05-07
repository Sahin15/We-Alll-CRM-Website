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

const router = express.Router();

// Employee routes
router.post("/apply", protect, applyWFH);
router.get("/my-requests", protect, getMyWFHRequests);
router.delete("/:id", protect, cancelWFHRequest);
router.get("/check/:date", protect, checkWFHStatus);

// HR/Admin/Manager/HoD routes
router.get(
  "/all",
  protect,
  authorizeRoles("admin", "superadmin", "hr", "manager", "hod"),
  getAllWFHRequests
);
router.get(
  "/pending",
  protect,
  authorizeRoles("admin", "superadmin", "hr", "manager", "hod"),
  getPendingWFHRequests
);
router.put(
  "/:id/approve",
  protect,
  authorizeRoles("admin", "superadmin", "hr", "manager", "hod"),
  approveWFHRequest
);
router.put(
  "/:id/reject",
  protect,
  authorizeRoles("admin", "superadmin", "hr", "manager", "hod"),
  rejectWFHRequest
);
router.get(
  "/statistics",
  protect,
  authorizeRoles("admin", "superadmin", "hr", "manager", "hod"),
  getWFHStatistics
);

export default router;
