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
  createFollowUp,
  updateFollowUp,
  deleteFollowUp,
  getLeadMeetings,
  createMeeting,
  updateMeeting,
  completeMeeting,
  cancelMeeting,
  getMyMeetings,
  getTeamMeetings,
  getAllMeetings,
  addContact,
  updateContact,
  deleteContact,
  setPrimaryContact,
  getLeadHistory,
} from "../controllers/leadController.js";
import { protect } from "../middleware/authMiddleware.js";
import { authorizeRoles } from "../middleware/roleMiddleware.js";
import { authorizeRolesOrDepartments } from "../middleware/departmentMiddleware.js";

const router = express.Router();

// Allowed roles and departments for lead management
// Roles: admin, superadmin, manager, hr, employee, hod
// Departments: Sales only
const leadAccess = authorizeRolesOrDepartments(
  ["admin", "superadmin", "manager", "hr", "employee", "hod"],
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

// Dashboard meeting routes (MUST be before /:id routes)
router.get(
  "/meetings/my-meetings",
  protect,
  leadAccess,
  getMyMeetings
);
router.get(
  "/meetings/team-meetings",
  protect,
  authorizeRoles("admin", "superadmin", "manager"),
  getTeamMeetings
);
router.get(
  "/meetings/all-meetings",
  protect,
  leadAccess,
  getAllMeetings
);

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

// Follow-up management (legacy routes - keep for backward compatibility)
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

// Enhanced Follow-up routes
router.post(
  "/:id/followups",
  protect,
  leadAccess,
  createFollowUp
);
router.put(
  "/:id/followups/:followupId",
  protect,
  leadAccess,
  updateFollowUp
);
router.patch(
  "/:id/followups/:followupId/complete",
  protect,
  leadAccess,
  completeFollowUp
);
router.delete(
  "/:id/followups/:followupId",
  protect,
  leadAccess,
  deleteFollowUp
);

// Meeting routes
router.get(
  "/:id/meetings",
  protect,
  leadAccess,
  getLeadMeetings
);
router.post(
  "/:id/meetings",
  protect,
  leadAccess,
  createMeeting
);
router.put(
  "/:id/meetings/:meetingId",
  protect,
  leadAccess,
  updateMeeting
);
router.patch(
  "/:id/meetings/:meetingId/complete",
  protect,
  leadAccess,
  completeMeeting
);
router.patch(
  "/:id/meetings/:meetingId/cancel",
  protect,
  leadAccess,
  cancelMeeting
);

// Contact routes
router.post(
  "/:id/contacts",
  protect,
  leadAccess,
  addContact
);
router.put(
  "/:id/contacts/:contactId",
  protect,
  leadAccess,
  updateContact
);
router.delete(
  "/:id/contacts/:contactId",
  protect,
  leadAccess,
  deleteContact
);
router.patch(
  "/:id/contacts/:contactId/primary",
  protect,
  leadAccess,
  setPrimaryContact
);

// History route
router.get(
  "/:id/history",
  protect,
  leadAccess,
  getLeadHistory
);

export default router;
