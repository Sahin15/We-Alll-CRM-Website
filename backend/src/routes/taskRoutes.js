import express from "express";
import {
  getAllTasks,
  getMyTasks,
  getTaskById,
  createTask,
  updateTaskStatus,
  updateTask,
  addComment,
  addTimeEntry,
  deleteTask,
  getTaskStats,
  getTasksByDateRange,
  getCompletedTasksByDate,
  getTaskHistory,
} from "../controllers/taskController.js";
import { protect } from "../middleware/authMiddleware.js";
import { authorizeRoles } from "../middleware/roleMiddleware.js";

const router = express.Router();

// Admin/HR/Manager routes
router.get("/all", protect, authorizeRoles("admin", "superadmin", "hr", "manager", "hod"), getAllTasks);

// Employee routes
router.get("/my-tasks", protect, getMyTasks);
router.get("/stats", protect, getTaskStats);
router.get("/by-date-range", protect, getTasksByDateRange);
router.get("/completed-by-date", protect, getCompletedTasksByDate);
router.get("/:id/history", protect, getTaskHistory);
router.get("/:id", protect, getTaskById);
router.put("/:id/status", protect, updateTaskStatus);
router.put("/:id", protect, updateTask);
router.post("/:id/comments", protect, addComment);
router.post("/:id/time-entries", protect, addTimeEntry);

// Task creation - All authenticated users can create tasks
router.post("/", protect, createTask);

// Admin/Manager only routes
router.delete("/:id", protect, authorizeRoles("admin", "superadmin"), deleteTask);

export default router;
