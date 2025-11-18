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
router.post("/", protect, authorizeRoles("admin", "superadmin"), createLead);

// Get all leads
router.get("/", protect, authorizeRoles("admin", "superadmin"), getAllLeads);

// Get lead by ID
router.get("/:id", protect, authorizeRoles("admin", "superadmin"), getLeadById);

// Update lead
router.put("/:id", protect, authorizeRoles("admin", "superadmin"), updateLead);

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
  authorizeRoles("admin", "superadmin"),
  assignLead
);

// Update lead status
router.put(
  "/:id/status",
  protect,
  authorizeRoles("admin", "superadmin"),
  updateLeadStatus
);

// Update lead temperature (Cold/Warm/Hot)
router.put(
  "/:id/temperature",
  protect,
  authorizeRoles("admin", "superadmin"),
  updateLeadTemperature
);

// Follow-up management
router.post(
  "/:id/follow-ups",
  protect,
  authorizeRoles("admin", "superadmin"),
  scheduleFollowUp
);
router.get(
  "/:id/follow-ups",
  protect,
  authorizeRoles("admin", "superadmin"),
  getLeadFollowUps
);
router.put(
  "/:id/follow-ups/:followUpId/complete",
  protect,
  authorizeRoles("admin", "superadmin"),
  completeFollowUp
);
router.put(
  "/:id/follow-ups/:followUpId/cancel",
  protect,
  authorizeRoles("admin", "superadmin"),
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
