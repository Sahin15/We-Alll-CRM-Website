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

// HR/Admin routes
router.get(
  "/all",
  protect,
  authorizeRoles("admin", "superadmin", "hr"),
  getAllWFHRequests
);
router.get(
  "/pending",
  protect,
  authorizeRoles("admin", "superadmin", "hr"),
  getPendingWFHRequests
);
router.put(
  "/:id/approve",
  protect,
  authorizeRoles("admin", "superadmin", "hr"),
  approveWFHRequest
);
router.put(
  "/:id/reject",
  protect,
  authorizeRoles("admin", "superadmin", "hr"),
  rejectWFHRequest
);
router.get(
  "/statistics",
  protect,
  authorizeRoles("admin", "superadmin", "hr"),
  getWFHStatistics
);

export default router;
