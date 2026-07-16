import express from "express";
import {
  getAllMeetings,
  getMyMeetings,
  getTodaysMeetings,
  createMeeting,
  updateMeeting,
  addMeetingAttendees,
  deleteMeeting,
  completeMeeting,
} from "../controllers/meetingController.js";
import { protect } from '../middleware/authMiddleware.js';


import { requireModulePermission } from "../authz/authzMiddleware.js";

const router = express.Router();

const MEETING_LIST_ROLES = ["admin", "superadmin", "hr", "manager", "hod", "employee"];
const MEETING_MANAGE_ROLES = ["admin", "superadmin", "hr", "manager", "hod"];

const meetingManage = requireModulePermission("company", "company.meeting.manage", {
  legacyRoles: MEETING_MANAGE_ROLES,
});

// All routes require authentication
router.use(protect);

// Get my meetings (where I'm an attendee or organizer)
router.get("/my-meetings", requireModulePermission("company", "company.meeting.view"), getMyMeetings);

// Get today's meetings
router.get("/today", requireModulePermission("company", "company.meeting.view"), getTodaysMeetings);

// Get all meetings (base route - for all authenticated users to see all company meetings)
router.get("/", requireModulePermission("company", "company.meeting.view"), getAllMeetings);

// Admin/HR/Manager/Employee routes - get all meetings with role restriction
router.get(
  "/all",
  requireModulePermission("company", "company.meeting.view", { legacyRoles: MEETING_LIST_ROLES }),
  getAllMeetings
);

router.post("/", meetingManage, createMeeting);
router.put("/:id", meetingManage, updateMeeting);
router.patch("/:id/attendees", meetingManage, addMeetingAttendees);
router.patch("/:id/complete", meetingManage, completeMeeting);
router.delete("/:id", meetingManage, deleteMeeting);

export default router;
