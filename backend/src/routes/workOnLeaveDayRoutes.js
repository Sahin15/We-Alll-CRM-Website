import express from "express";
import {
  createWorkOnLeaveDayRequest,
  getAllWorkOnLeaveDayRequests,
  getMyWorkOnLeaveDayRequests,
  approveWorkOnLeaveDayRequest,
  rejectWorkOnLeaveDayRequest,
  checkTodayWorkOnLeaveRequest,
} from "../controllers/workOnLeaveDayController.js";
import { protect } from "../middleware/authMiddleware.js";
import { authorizeRoles } from "../middleware/roleMiddleware.js";

const router = express.Router();

// Employee routes
router.post("/", protect, createWorkOnLeaveDayRequest);
router.get("/my-requests", protect, getMyWorkOnLeaveDayRequests);
router.get("/check-today", protect, checkTodayWorkOnLeaveRequest);

// HR/Admin routes
router.get("/", protect, authorizeRoles("admin", "superadmin", "hr"), getAllWorkOnLeaveDayRequests);
router.put("/:id/approve", protect, authorizeRoles("admin", "superadmin", "hr"), approveWorkOnLeaveDayRequest);
router.put("/:id/reject", protect, authorizeRoles("admin", "superadmin", "hr"), rejectWorkOnLeaveDayRequest);

export default router;
