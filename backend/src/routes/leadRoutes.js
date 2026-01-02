import express from "express";
import {
  createLead,
  getAllLeads,
  getLeadById,
  updateLead,
  deleteLead,
  assignLead,
  updateLeadStatus,
  updateLeadTemperature,
  scheduleFollowUp,
  completeFollowUp,
  cancelFollowUp,
  getLeadFollowUps,
  deleteNote,
} from "../controllers/leadController.js";
import { protect } from "../middleware/authMiddleware.js";
import { authorizeRoles } from "../middleware/roleMiddleware.js";

const router = express.Router();

// Create new lead (public or admin)
router.post("/", protect, authorizeRoles("admin", "superadmin", "hr", "employee", "hod", "accounts"), createLead);

// Create new lead (public endpoint for forms like Growth Summit)
router.post("/public", createLead);

// Get all leads
router.get("/", protect, authorizeRoles("admin", "superadmin", "hr", "employee", "hod", "accounts"), getAllLeads);

// Get lead by ID
router.get("/:id", protect, authorizeRoles("admin", "superadmin", "hr", "employee", "hod", "accounts"), getLeadById);

// Update lead
router.put("/:id", protect, authorizeRoles("admin", "superadmin", "hr", "employee", "hod", "accounts"), updateLead);

// Delete lead
router.delete(
  "/:id",
  protect,
  authorizeRoles("admin", "superadmin"),
  deleteLead
);

// Assign lead to user
router.put(
  "/:id/assign",
  protect,
  authorizeRoles("admin", "superadmin", "hr", "employee", "hod", "accounts"),
  assignLead
);

// Update lead status
router.put(
  "/:id/status",
  protect,
  authorizeRoles("admin", "superadmin", "hr", "employee", "hod", "accounts"),
  updateLeadStatus
);

// Update lead temperature (Cold/Warm/Hot)
router.put(
  "/:id/temperature",
  protect,
  authorizeRoles("admin", "superadmin", "hr", "employee", "hod", "accounts"),
  updateLeadTemperature
);

// Follow-up management
router.post(
  "/:id/follow-ups",
  protect,
  authorizeRoles("admin", "superadmin", "hr", "employee", "hod", "accounts"),
  scheduleFollowUp
);
router.get(
  "/:id/follow-ups",
  protect,
  authorizeRoles("admin", "superadmin", "hr", "employee", "hod", "accounts"),
  getLeadFollowUps
);
router.put(
  "/:id/follow-ups/:followUpId/complete",
  protect,
  authorizeRoles("admin", "superadmin", "hr", "employee", "hod", "accounts"),
  completeFollowUp
);
router.put(
  "/:id/follow-ups/:followUpId/cancel",
  protect,
  authorizeRoles("admin", "superadmin", "hr", "employee", "hod", "accounts"),
  cancelFollowUp
);

// Delete note from notes history
router.delete(
  "/:id/notes/:noteIndex",
  protect,
  authorizeRoles("admin", "superadmin"),
  deleteNote
);

export default router;
