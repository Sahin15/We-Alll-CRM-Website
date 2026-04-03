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
import { protect } from "../middleware/authMiddleware.js";
import { authorizeRoles } from "../middleware/roleMiddleware.js";

const router = express.Router();

// All routes require authentication
router.use(protect);

// Get my meetings (where I'm an attendee or organizer)
router.get("/my-meetings", getMyMeetings);

// Get today's meetings
router.get("/today", getTodaysMeetings);

// Get all meetings (base route - for all authenticated users to see all company meetings)
router.get("/", getAllMeetings);

// Admin/HR/Manager/Employee routes - get all meetings with role restriction
router.get("/all", authorizeRoles("admin", "superadmin", "hr", "manager", "hod", "employee"), getAllMeetings);

// Create meeting
router.post("/", createMeeting);

// Update meeting
router.put("/:id", updateMeeting);

// Complete meeting
router.patch("/:id/complete", completeMeeting);

// Delete meeting
router.delete("/:id", deleteMeeting);

export default router;
