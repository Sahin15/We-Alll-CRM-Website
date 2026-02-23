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
  getFollowUpDashboard,
} from "../controllers/leadController.js";
import { protect } from "../middleware/authMiddleware.js";
import { authorizeRoles } from "../middleware/roleMiddleware.js";
import { authorizeRolesOrDepartments } from "../middleware/departmentMiddleware.js";

const router = express.Router();

// Allowed roles and departments for lead management
// Roles: admin, superadmin, manager
// Departments: Sales only
const leadAccess = authorizeRolesOrDepartments(
  ["admin", "superadmin", "manager"],
  ["Sales"]
);

// Create new lead
router.post("/", protect, leadAccess, createLead);

// Create new lead (public endpoint for forms like Growth Summit)
router.post("/public", createLead);

// Get all leads
router.get("/", protect, leadAccess, getAllLeads);

// Get follow-up dashboard data
router.get("/follow-ups/dashboard", protect, leadAccess, getFollowUpDashboard);

// Get lead by ID
router.get("/:id", protect, leadAccess, getLeadById);

// Update lead
router.put("/:id", protect, leadAccess, updateLead);

// Delete note from notes history (MUST be before /:id delete route)
router.delete(
  "/:id/notes/:noteId",
  protect,
  leadAccess,
  deleteNote
);

// Delete lead (only admin/superadmin)
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
  leadAccess,
  assignLead
);

// Update lead status
router.put(
  "/:id/status",
  protect,
  leadAccess,
  updateLeadStatus
);

// Update lead temperature (Cold/Warm/Hot)
router.put(
  "/:id/temperature",
  protect,
  leadAccess,
  updateLeadTemperature
);

// Follow-up management
router.post(
  "/:id/follow-ups",
  protect,
  leadAccess,
  scheduleFollowUp
);
router.get(
  "/:id/follow-ups",
  protect,
  leadAccess,
  getLeadFollowUps
);
router.put(
  "/:id/follow-ups/:followUpId/complete",
  protect,
  leadAccess,
  completeFollowUp
);
router.put(
  "/:id/follow-ups/:followUpId/cancel",
  protect,
  leadAccess,
  cancelFollowUp
);

export default router;
