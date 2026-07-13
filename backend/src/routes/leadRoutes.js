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
import { requireModulePermission } from "../authz/authzMiddleware.js";

const router = express.Router();

const LEAD_DELETE_ROLES = ["admin", "superadmin"];
const LEAD_TEAM_MEETING_ROLES = ["admin", "superadmin", "manager"];

const leadAccess = authorizeRolesOrDepartments(
  ["admin", "superadmin", "manager", "hr", "employee", "hod"],
  ["Sales"]
);

const crmLeadManage = requireModulePermission("crm", "crm.lead.manage", { legacyAllowed: true });
const crmLeadView = requireModulePermission("crm", "crm.lead.view", { legacyAllowed: true });

router.post("/public", createLead);

router.post("/", protect, leadAccess, crmLeadManage, createLead);
router.get("/", protect, leadAccess, crmLeadView, getAllLeads);
router.get("/follow-ups/dashboard", protect, leadAccess, crmLeadView, getFollowUpDashboard);

router.get("/meetings/my-meetings", protect, leadAccess, crmLeadView, getMyMeetings);
router.get(
  "/meetings/team-meetings",
  protect,
  authorizeRoles(...LEAD_TEAM_MEETING_ROLES),
  requireModulePermission("crm", "crm.lead.view", { legacyRoles: LEAD_TEAM_MEETING_ROLES }),
  getTeamMeetings
);
router.get("/meetings/all-meetings", protect, leadAccess, crmLeadView, getAllMeetings);

router.get("/:id", protect, leadAccess, crmLeadView, getLeadById);
router.put("/:id", protect, leadAccess, crmLeadManage, updateLead);
router.delete("/:id/notes/:noteId", protect, leadAccess, crmLeadManage, deleteNote);
router.delete(
  "/:id",
  protect,
  authorizeRoles(...LEAD_DELETE_ROLES),
  requireModulePermission("crm", "crm.lead.manage", { legacyRoles: LEAD_DELETE_ROLES }),
  deleteLead
);

router.put("/:id/assign", protect, leadAccess, crmLeadManage, assignLead);
router.put("/:id/status", protect, leadAccess, crmLeadManage, updateLeadStatus);
router.put("/:id/temperature", protect, leadAccess, crmLeadManage, updateLeadTemperature);

router.post("/:id/follow-ups", protect, leadAccess, crmLeadManage, scheduleFollowUp);
router.get("/:id/follow-ups", protect, leadAccess, crmLeadView, getLeadFollowUps);
router.put("/:id/follow-ups/:followUpId/complete", protect, leadAccess, crmLeadManage, completeFollowUp);
router.put("/:id/follow-ups/:followUpId/cancel", protect, leadAccess, crmLeadManage, cancelFollowUp);

router.post("/:id/followups", protect, leadAccess, crmLeadManage, createFollowUp);
router.put("/:id/followups/:followupId", protect, leadAccess, crmLeadManage, updateFollowUp);
router.patch("/:id/followups/:followupId/complete", protect, leadAccess, crmLeadManage, completeFollowUp);
router.delete("/:id/followups/:followupId", protect, leadAccess, crmLeadManage, deleteFollowUp);

router.get("/:id/meetings", protect, leadAccess, crmLeadView, getLeadMeetings);
router.post("/:id/meetings", protect, leadAccess, crmLeadManage, createMeeting);
router.put("/:id/meetings/:meetingId", protect, leadAccess, crmLeadManage, updateMeeting);
router.patch("/:id/meetings/:meetingId/complete", protect, leadAccess, crmLeadManage, completeMeeting);
router.patch("/:id/meetings/:meetingId/cancel", protect, leadAccess, crmLeadManage, cancelMeeting);

router.post("/:id/contacts", protect, leadAccess, crmLeadManage, addContact);
router.put("/:id/contacts/:contactId", protect, leadAccess, crmLeadManage, updateContact);
router.delete("/:id/contacts/:contactId", protect, leadAccess, crmLeadManage, deleteContact);
router.patch("/:id/contacts/:contactId/primary", protect, leadAccess, crmLeadManage, setPrimaryContact);

router.get("/:id/history", protect, leadAccess, crmLeadView, getLeadHistory);

export default router;
