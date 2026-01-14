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
  getLeaveBalance,
  getLeaveUsageSummary,
} from "../controllers/leaveController.js";
import { protect } from "../middleware/authMiddleware.js";
import { authorizeRoles } from "../middleware/roleMiddleware.js";
import { uploadDocument, handleDocumentUploadError } from "../middleware/documentMiddleware.js";

const router = express.Router();

// Specific routes MUST come before parameterized routes
// Employee routes
router.get("/my-leaves", protect, getMyLeaveRequests);
router.get("/balance", protect, getLeaveBalance);
router.get("/balance/:employeeId", protect, getLeaveBalance);
router.get("/usage-summary/:employeeId", protect, authorizeRoles("admin", "superadmin", "hr", "hod"), getLeaveUsageSummary);

// HR/Manager/Admin routes
router.get(
  "/",
  protect,
  authorizeRoles("admin", "superadmin", "hr", "hod"),
  getAllLeaveRequests
);

// Create leave request
router.post("/", protect, uploadDocument.array("attachments", 5), handleDocumentUploadError, createLeaveRequest);

// Parameterized routes MUST come after specific routes
router.get("/:id", protect, getLeaveRequestById);
router.put("/:id", protect, updateLeaveRequest);
router.put("/:id/cancel", protect, cancelLeaveRequest);
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
