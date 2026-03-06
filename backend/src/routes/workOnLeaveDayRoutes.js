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
import { adminOrHR } from "../middleware/roleMiddleware.js";

const router = express.Router();

// Employee routes
router.post("/", protect, createWorkOnLeaveDayRequest);
router.get("/my-requests", protect, getMyWorkOnLeaveDayRequests);
router.get("/check-today", protect, checkTodayWorkOnLeaveRequest);

// HR/Admin routes
router.get("/", protect, adminOrHR, getAllWorkOnLeaveDayRequests);
router.put("/:id/approve", protect, adminOrHR, approveWorkOnLeaveDayRequest);
router.put("/:id/reject", protect, adminOrHR, rejectWorkOnLeaveDayRequest);

export default router;
