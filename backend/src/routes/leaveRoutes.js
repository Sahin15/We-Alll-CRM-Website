import express from "express";
import {
  createLeaveRequest,
  getAllLeaveRequests,
  getMyLeaveRequests,
  getLeaveRequestById,
  approveLeaveRequest,
  rejectLeaveRequest,
  cancelLeaveRequest,
  updateLeaveRequest,
} from "../controllers/leaveController.js";
import { protect } from "../middleware/authMiddleware.js";
import { authorizeRoles } from "../middleware/roleMiddleware.js";

const router = express.Router();

// Employee routes
router.post("/", protect, createLeaveRequest);
router.get("/my-leaves", protect, getMyLeaveRequests);
router.put("/:id", protect, updateLeaveRequest);
router.put("/:id/cancel", protect, cancelLeaveRequest);

// HR/Manager/Admin routes
router.get(
  "/",
  protect,
  authorizeRoles("admin", "superadmin", "hr", "hod"),
  getAllLeaveRequests
);
router.get("/:id", protect, getLeaveRequestById);
router.put(
  "/:id/approve",
  protect,
  authorizeRoles("admin", "superadmin", "hr", "hod"),
  approveLeaveRequest
);
router.put(
  "/:id/reject",
  protect,
  authorizeRoles("admin", "superadmin", "hr", "hod"),
  rejectLeaveRequest
);

export default router;
