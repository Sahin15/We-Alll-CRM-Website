import express from "express";
import {
  getAllMeetings,
  getMyMeetings,
  getTodaysMeetings,
  createMeeting,
  updateMeeting,
  deleteMeeting,
  completeMeeting,
} from "../controllers/meetingController.js";
import { protect } from '../middleware/authMiddleware.js';


import { requireModulePermission } from "../authz/authzMiddleware.js";

const router = express.Router();

const MEETING_LIST_ROLES = ["admin", "superadmin", "hr", "manager", "hod", "employee"];

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

// Create meeting (legacy: any authenticated user)
router.post(
  "/",
  requireModulePermission("company", "company.meeting.manage", { legacyAllowed: true }),
  createMeeting
);

// Update meeting (legacy: any authenticated user)
router.put(
  "/:id",
  requireModulePermission("company", "company.meeting.manage", { legacyAllowed: true }),
  updateMeeting
);

// Complete meeting (legacy: any authenticated user)
router.patch(
  "/:id/complete",
  requireModulePermission("company", "company.meeting.manage", { legacyAllowed: true }),
  completeMeeting
);

// Delete meeting (legacy: any authenticated user)
router.delete(
  "/:id",
  requireModulePermission("company", "company.meeting.manage", { legacyAllowed: true }),
  deleteMeeting
);

export default router;
