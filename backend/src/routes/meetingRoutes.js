import express from "express";
import {
  getAllMeetings,
  getMyMeetings,
  getTodaysMeetings,
  createMeeting,
  updateMeeting,
  deleteMeeting,
} from "../controllers/meetingController.js";
import { protect } from "../middleware/authMiddleware.js";
import { authorizeRoles } from "../middleware/roleMiddleware.js";

const router = express.Router();

// All routes require authentication
router.use(protect);

// Get all meetings (base route)
router.get("/", getAllMeetings);

// Admin/HR/Manager routes
router.get("/all", authorizeRoles("admin", "superadmin", "hr", "manager", "hod"), getAllMeetings);

// Get my meetings
router.get("/my-meetings", getMyMeetings);

// Get today's meetings
router.get("/today", getTodaysMeetings);

// Create meeting
router.post("/", createMeeting);

// Update meeting
router.put("/:id", updateMeeting);

// Delete meeting
router.delete("/:id", deleteMeeting);

export default router;
