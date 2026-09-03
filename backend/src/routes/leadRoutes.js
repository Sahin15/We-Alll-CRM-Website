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
import { protect } from '../middleware/authMiddleware.js';
import { requireModulePermission } from "../authz/authzMiddleware.js";
import { attachDepartmentForAuthz } from "../authz/attachDepartmentContext.js";

const router = express.Router();

const LEAD_ACCESS_ROLES = ["admin", "superadmin", "manager", "employee", "hod", "sales"];
const LEAD_ACCESS_DEPARTMENTS = ["Sales"];
const LEAD_DELETE_ROLES = ["admin", "superadmin"];
const LEAD_TEAM_MEETING_ROLES = ["admin", "superadmin", "manager"];

const leadLegacyGate = { legacyRoles: LEAD_ACCESS_ROLES, legacyDepartments: LEAD_ACCESS_DEPARTMENTS };

const crmLeadManage = requireModulePermission("crm", "crm.lead.manage", leadLegacyGate);
const crmLeadView = requireModulePermission("crm", "crm.lead.view", leadLegacyGate);

router.post("/public", createLead);

router.use(protect, attachDepartmentForAuthz);

router.post("/", crmLeadManage, createLead);
router.get("/", crmLeadView, getAllLeads);
router.get("/follow-ups/dashboard", crmLeadView, getFollowUpDashboard);

router.get("/meetings/my-meetings", crmLeadView, getMyMeetings);
router.get(
  "/meetings/team-meetings",
  requireModulePermission("crm", "crm.lead.view", { legacyRoles: LEAD_TEAM_MEETING_ROLES }),
  getTeamMeetings
);
router.get("/meetings/all-meetings", crmLeadView, getAllMeetings);

router.get("/:id", crmLeadView, getLeadById);
router.put("/:id", crmLeadManage, updateLead);
router.delete("/:id/notes/:noteId", crmLeadManage, deleteNote);
router.delete(
  "/:id",
  requireModulePermission("crm", "crm.lead.manage", { legacyRoles: LEAD_DELETE_ROLES }),
  deleteLead
);

router.put("/:id/assign", crmLeadManage, assignLead);
router.put("/:id/status", crmLeadManage, updateLeadStatus);
router.put("/:id/temperature", crmLeadManage, updateLeadTemperature);

router.post("/:id/follow-ups", crmLeadManage, scheduleFollowUp);
router.get("/:id/follow-ups", crmLeadView, getLeadFollowUps);
router.put("/:id/follow-ups/:followUpId/complete", crmLeadManage, completeFollowUp);
router.put("/:id/follow-ups/:followUpId/cancel", crmLeadManage, cancelFollowUp);

router.post("/:id/followups", crmLeadManage, createFollowUp);
router.put("/:id/followups/:followupId", crmLeadManage, updateFollowUp);
router.patch("/:id/followups/:followupId/complete", crmLeadManage, completeFollowUp);
router.delete("/:id/followups/:followupId", crmLeadManage, deleteFollowUp);

router.get("/:id/meetings", crmLeadView, getLeadMeetings);
router.post("/:id/meetings", crmLeadManage, createMeeting);
router.put("/:id/meetings/:meetingId", crmLeadManage, updateMeeting);
router.patch("/:id/meetings/:meetingId/complete", crmLeadManage, completeMeeting);
router.patch("/:id/meetings/:meetingId/cancel", crmLeadManage, cancelMeeting);

router.post("/:id/contacts", crmLeadManage, addContact);
router.put("/:id/contacts/:contactId", crmLeadManage, updateContact);
router.delete("/:id/contacts/:contactId", crmLeadManage, deleteContact);
router.patch("/:id/contacts/:contactId/primary", crmLeadManage, setPrimaryContact);

router.get("/:id/history", crmLeadView, getLeadHistory);

export default router;
