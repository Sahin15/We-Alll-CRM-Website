import express from "express";
import {
  getCalendarEvents,
  getDepartmentCalendar,
  getProjectTimeline,
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
  getWorkflowAnalytics,
} from "../controllers/calendarController.js";
import { protect } from "../middleware/authMiddleware.js";
import { authorizeRoles } from "../middleware/roleMiddleware.js";

const router = express.Router();

// All routes require authentication
router.use(protect);

// Get calendar events with filters
router.get("/events", getCalendarEvents);

// Department-specific calendar views
router.get("/department/:departmentId", getDepartmentCalendar);

// Project timeline view
router.get("/project/:projectId/timeline", getProjectTimeline);

// Calendar event CRUD operations
router.route("/events")
  .post(createCalendarEvent); // Create new event

router.route("/events/:id")
  .put(updateCalendarEvent)    // Update event
  .delete(deleteCalendarEvent); // Delete event

// Analytics endpoints
router.get(
  "/analytics/workflow",
  authorizeRoles("admin", "superadmin", "hr", "hod"),
  getWorkflowAnalytics
);

export default router;